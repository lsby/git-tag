/* eslint-disable max-lines */
import * as d3 from 'd3'
import type { FcaLatticeData } from '../../../../interface/project/fca/get-full-lattice/types'
import { 组件基类 } from '../../../base/base'
import { API管理器 } from '../../../global/manager/api-manager'
import { 创建元素 } from '../../../global/tools/create-element'
import { 普通按钮 } from '../../general/base/base-button'

type 发出事件类型 = {}
type 监听事件类型 = {}

interface ForceNode extends d3.SimulationNodeDatum {
  id: string
  intent: string[]
  extentCount: number
  label: string
  层级: number
}

interface ForceLink extends d3.SimulationLinkDatum<ForceNode> {
  source: ForceNode
  target: ForceNode
}

type LocalState = { zoom?: { x: number; y: number; k: number }; nodes?: Record<string, { x: number; y: number }> }

export class FCA格图查看器 extends 组件基类<发出事件类型, 监听事件类型> {
  static {
    this.注册组件('fca-lattice-viewer', this)
  }

  private 格图数据: FcaLatticeData | null = null
  private svg容器: HTMLDivElement = 创建元素('div', {
    style: {
      flex: '1',
      width: '100%',
      minHeight: '0',
      overflow: 'hidden',
      position: 'relative',
      display: 'block',
      userSelect: 'none',
    },
  })
  private 工具栏: HTMLDivElement = 创建元素('div', {
    style: {
      display: 'flex',
      gap: '8px',
      padding: '8px 12px',
      borderBottom: '1px solid var(--边框颜色)',
      alignItems: 'center',
      flexShrink: '0',
      backgroundColor: 'var(--次要背景颜色)',
    },
  })

  private svg元素: SVGSVGElement | null = null
  private 缩放行为: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
  private 节点数据列表: ForceNode[] = []
  private 当前用户Id: string | null = null
  public 设置数据(数据: FcaLatticeData): void {
    this.格图数据 = 数据
  }

  private 加载本地状态(): LocalState | null {
    if (this.当前用户Id === null) return null
    try {
      let 原始数据 = localStorage.getItem('fca_lattice_state')
      if (原始数据 === null) return null
      let 解析后 = JSON.parse(原始数据) as Record<string, LocalState>
      return 解析后[this.当前用户Id] ?? null
    } catch (_e) {
      return null
    }
  }

  private 保存本地状态(变换?: d3.ZoomTransform): void {
    if (this.当前用户Id === null || this.节点数据列表.length === 0) return
    try {
      let 原始数据 = localStorage.getItem('fca_lattice_state')
      let 解析后: Record<string, LocalState> = {}
      if (原始数据 !== null) {
        解析后 = JSON.parse(原始数据) as Record<string, LocalState>
      }

      let nodes: Record<string, { x: number; y: number }> = {}
      for (let node of this.节点数据列表) {
        if (node.x !== undefined && node.y !== undefined) {
          nodes[node.id] = { x: node.x, y: node.y }
        }
      }

      let 用户状态 = 解析后[this.当前用户Id] ?? {}
      用户状态.nodes = nodes
      if (变换 !== undefined) {
        用户状态.zoom = { x: 变换.x, y: 变换.y, k: 变换.k }
      }

      解析后[this.当前用户Id] = 用户状态
      localStorage.setItem('fca_lattice_state', JSON.stringify(解析后))
    } catch (e) {
      void this.log.error('保存本地状态失败', e instanceof Error ? e.message : e)
    }
  }

  protected override async 当加载时(): Promise<void> {
    let 宿主样式 = this.获得宿主样式()
    宿主样式.display = 'flex'
    宿主样式.flexDirection = 'column'
    宿主样式.width = '100%'
    宿主样式.height = '100%'
    宿主样式.overflow = 'hidden'

    this.创建工具栏()
    this.shadow.appendChild(this.工具栏)
    this.shadow.appendChild(this.svg容器)

    try {
      let 结果 = await API管理器.请求postJson并处理错误('/api/project/is-login', {})
      if (结果.isLogin === true && typeof 结果.userId === 'string') {
        this.当前用户Id = 结果.userId
      }
    } catch (_e: unknown) {
      void this.log.error('获取用户信息失败', _e instanceof Error ? _e.message : String(_e))
    }

    if (this.格图数据 !== null) {
      this.渲染格图(this.格图数据)
    }
  }

  private 创建工具栏(): void {
    let 导出PNG按钮 = new 普通按钮({
      文本: '导出 PNG',
      点击处理函数: (): void => {
        this.导出PNG()
      },
      宿主样式: { padding: '0' },
      元素样式: { padding: '4px 10px', fontSize: '12px', outline: 'none' },
    })

    let 导出SVG按钮 = new 普通按钮({
      文本: '导出 SVG',
      点击处理函数: (): void => {
        this.导出SVG()
      },
      宿主样式: { padding: '0' },
      元素样式: { padding: '4px 10px', fontSize: '12px', outline: 'none' },
    })

    let 重置视图按钮 = new 普通按钮({
      文本: '重置视图',
      点击处理函数: (): void => {
        this.重置缩放()
      },
      宿主样式: { padding: '0' },
      元素样式: { padding: '4px 10px', fontSize: '12px', outline: 'none' },
    })

    let 提示文字 = 创建元素('span', {
      textContent: '滚轮缩放 / 拖拽平移',
      style: { fontSize: '12px', color: 'var(--提示文字颜色)', marginLeft: '8px' },
    })

    this.工具栏.appendChild(导出PNG按钮)
    this.工具栏.appendChild(导出SVG按钮)
    this.工具栏.appendChild(重置视图按钮)
    this.工具栏.appendChild(提示文字)
  }

  private 渲染格图(数据: FcaLatticeData): void {
    // 监听真实的宽高加载完成后再进行物理模拟，解决初始宽度为0导致的力导图中心偏向左侧的问题
    let 观察器 = new ResizeObserver((entries) => {
      let rect = entries[0]?.contentRect
      if (rect !== undefined && rect.width > 0 && rect.height > 0) {
        观察器.disconnect()
        let 容器宽度 = rect.width
        let 容器高度 = rect.height

        let svgNs = 'http://www.w3.org/2000/svg' as const
        let svg = document.createElementNS(svgNs, 'svg')
        svg.setAttribute('width', '100%')
        svg.setAttribute('height', '100%')
        svg.setAttribute('xmlns', svgNs)
        svg.style.backgroundColor = 'var(--主要背景颜色)'
        this.svg容器.appendChild(svg)
        this.svg元素 = svg

        let d3Svg = d3.select<SVGSVGElement, unknown>(svg)
        d3Svg
          .append('rect')
          .attr('width', '100%')
          .attr('height', '100%')
          .attr('fill', 'transparent')
          .style('pointer-events', 'all')

        let 主组 = document.createElementNS(svgNs, 'g')
        svg.appendChild(主组)
        let d3主组 = d3.select<SVGGElement, unknown>(主组)

        // 构建数据
        let forceNodes: ForceNode[] = 数据.nodes.map((n) => ({ ...n, 层级: n.intent.length, x: 0, y: 0 }))

        // 根据层级预先计算一个合理的初始网格布局，防止一上来挤成一团引发“乱跳”爆炸
        let 层级分组 = new Map<number, ForceNode[]>()
        forceNodes.forEach((n) => {
          let 组 = 层级分组.get(n.层级) ?? []
          组.push(n)
          层级分组.set(n.层级, 组)
        })

        层级分组.forEach((组, 层级) => {
          let 间距 = 120
          let 总宽 = (组.length - 1) * 间距
          let 起始X = 容器宽度 / 2 - 总宽 / 2
          组.forEach((n, i) => {
            n.x = 起始X + i * 间距
            n.y = 层级 * 120 + 80
          })
        })

        // 从本地存储中读取状态，恢复已调整过的节点坐标
        let 本地状态 = this.加载本地状态()
        let savedNodes = 本地状态?.nodes
        if (savedNodes !== undefined) {
          forceNodes.forEach((n) => {
            let saved = savedNodes[n.id]
            if (saved !== undefined) {
              n.x = saved.x
              n.y = saved.y
            }
          })
        }

        this.节点数据列表 = forceNodes

        let 节点映射 = new Map<string, ForceNode>()
        forceNodes.forEach((n) => 节点映射.set(n.id, n))

        let forceLinks: ForceLink[] = 数据.edges
          .filter((e) => 节点映射.has(e.from) && 节点映射.has(e.to))
          .map((e) => ({ source: 节点映射.get(e.from) as ForceNode, target: 节点映射.get(e.to) as ForceNode }))

        // 分析关系
        let 连出边 = new Map<string, string[]>()
        let 连入边 = new Map<string, string[]>()
        forceNodes.forEach((n) => {
          连出边.set(n.id, [])
          连入边.set(n.id, [])
        })
        forceLinks.forEach((e) => {
          let fromId = e.source.id
          let toId = e.target.id
          连出边.get(fromId)?.push(toId)
          连入边.get(toId)?.push(fromId)
        })

        let 祖先映射 = new Map<string, Set<string>>()
        let 后代映射 = new Map<string, Set<string>>()

        let 找相关节点 = (当前: string, 邻接表: Map<string, string[]>, 结果: Set<string>): void => {
          let 待访问 = [当前]
          while (待访问.length > 0) {
            let 节点 = 待访问.pop()
            if (节点 === undefined) break
            let 邻居们 = 邻接表.get(节点) ?? []
            for (let 邻居 of 邻居们) {
              if (!结果.has(邻居)) {
                结果.add(邻居)
                待访问.push(邻居)
              }
            }
          }
        }

        forceNodes.forEach((n) => {
          let 祖先 = new Set<string>()
          let 后代 = new Set<string>()
          找相关节点(n.id, 连入边, 祖先)
          找相关节点(n.id, 连出边, 后代)
          祖先映射.set(n.id, 祖先)
          后代映射.set(n.id, 后代)
        })

        let 边组 = d3主组.append('g').attr('class', 'edges')
        let 节点组 = d3主组.append('g').attr('class', 'nodes')

        let link = 边组
          .selectAll('line')
          .data(forceLinks)
          .join('line')
          .attr('stroke', 'var(--边框颜色)')
          .attr('stroke-width', '1.5')
          .attr('stroke-opacity', '0.6')

        let node = 节点组.selectAll<SVGGElement, unknown>('g').data(forceNodes).join('g').style('cursor', 'pointer')

        // 透明背景扩大感应区，防止鼠标在圆形和文字间隙移动时触发抖动
        node
          .append('rect')
          .attr('x', -40)
          .attr('y', -30)
          .attr('width', 80)
          .attr('height', 85)
          .attr('fill', 'transparent')

        node
          .append('circle')
          .attr('r', 20)
          .attr('fill', 'var(--卡片背景颜色)')
          .attr('stroke', 'var(--主色调)')
          .attr('stroke-width', 2)

        node
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', 11)
          .attr('font-weight', 'bold')
          .attr('fill', 'var(--文字颜色)')
          .text((d) => d.extentCount)

        node
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('y', 34)
          .attr('font-size', 11)
          .attr('fill', 'var(--文字颜色)')
          .text((d) => this.截断文本(d.label, 12))

        node.append('title').text((d) => d.label)

        let simulation = d3
          .forceSimulation<ForceNode>(forceNodes)
          .force('link', d3.forceLink<ForceNode, ForceLink>(forceLinks).distance(120))
          .force('charge', d3.forceManyBody().strength(-800))
          .force('x', d3.forceX(容器宽度 / 2).strength(0.05))
          .force('y', d3.forceY<ForceNode>((d) => d.层级 * 120 + 80).strength(1))
          .force('collide', d3.forceCollide().radius(40))
          .alphaDecay(0.05) // 加快物理稳定速度

        simulation.on('end', () => {
          this.保存本地状态()
        })

        // 监听拖拽及动画产生的 tick
        simulation.on('tick', () => {
          link
            .attr('x1', (d) => d.source.x ?? 0)
            .attr('y1', (d) => d.source.y ?? 0)
            .attr('x2', (d) => d.target.x ?? 0)
            .attr('y2', (d) => d.target.y ?? 0)
          node.attr('transform', (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`)
        })

        node.call(
          d3
            .drag<SVGGElement, ForceNode>()
            .on('start', (e: d3.D3DragEvent<SVGGElement, ForceNode, unknown>, d: ForceNode) => {
              if (e.active === 0) simulation.alphaTarget(0.3).restart()
              d.fx = d.x
              d.fy = d.y
            })
            .on('drag', (e: d3.D3DragEvent<SVGGElement, ForceNode, unknown>, d: ForceNode) => {
              d.fx = e.x
              d.fy = e.y
            })
            .on('end', (e: d3.D3DragEvent<SVGGElement, ForceNode, unknown>, d: ForceNode) => {
              if (e.active === 0) simulation.alphaTarget(0)
              d.fx = null
              d.fy = null
            }),
        )

        node
          .on('mouseenter', (e, d) => {
            let 相关 = new Set<string>()
            相关.add(d.id)
            祖先映射.get(d.id)?.forEach((id) => 相关.add(id))
            后代映射.get(d.id)?.forEach((id) => 相关.add(id))

            let 次级相关 = new Set<string>()
            forceLinks.forEach((l) => {
              let s = l.source
              let t = l.target
              let sIn = 相关.has(s.id)
              let tIn = 相关.has(t.id)

              if (sIn && !tIn) {
                if (s.intent.length > 0) 次级相关.add(t.id)
              } else if (!sIn && tIn) {
                次级相关.add(s.id)
              }
            })

            node.style('opacity', (n) => {
              if (相关.has(n.id)) return 1
              if (次级相关.has(n.id)) return 0.4
              return 0.05
            })

            link.style('stroke-opacity', (l) => {
              let s = l.source
              let t = l.target
              let sIn1 = 相关.has(s.id)
              let tIn1 = 相关.has(t.id)

              if (sIn1 && tIn1) return 0.8

              let sIn2 = 次级相关.has(s.id)
              let tIn2 = 次级相关.has(t.id)

              if ((sIn1 && tIn2) || (sIn2 && tIn1)) {
                return 0.4
              }

              return 0.02
            })
          })
          .on('mouseleave', () => {
            node.style('opacity', 1)
            link.style('stroke-opacity', 0.6)
          })

        let 缩放行为 = d3
          .zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.1, 5])
          .on('zoom', (事件) => {
            d3主组.attr('transform', 事件.transform as unknown as string)
          })
          .on('end', (事件) => {
            this.保存本地状态(事件.transform)
          })

        d3.select(this.svg容器).call(缩放行为 as any)
        this.缩放行为 = 缩放行为

        // 恢复历史视角，或者进行首次完美居中适配
        if (本地状态 !== null && 本地状态.zoom !== undefined) {
          let 初始变换 = d3.zoomIdentity.translate(本地状态.zoom.x, 本地状态.zoom.y).scale(本地状态.zoom.k)
          let 缩放目标 = d3.select(this.svg容器 as Element)
          缩放目标.call(缩放行为.transform as any, 初始变换)
        } else {
          this.适配视图(svg, 缩放行为, forceNodes, 容器宽度, 容器高度, false)
        }
      }
    })
    观察器.observe(this.svg容器)
  }

  private 适配视图(
    svg: SVGSVGElement,
    缩放行为: d3.ZoomBehavior<SVGSVGElement, unknown>,
    布局结果: ForceNode[],
    容器宽度: number,
    容器高度: number,
    过渡: boolean = false,
  ): void {
    if (布局结果.length === 0) return

    let 最小X = Infinity
    let 最大X = -Infinity
    let 最小Y = Infinity
    let 最大Y = -Infinity

    for (let 节点 of 布局结果) {
      if ((节点.x ?? 0) < 最小X) 最小X = 节点.x ?? 0
      if ((节点.x ?? 0) > 最大X) 最大X = 节点.x ?? 0
      if ((节点.y ?? 0) < 最小Y) 最小Y = 节点.y ?? 0
      if ((节点.y ?? 0) > 最大Y) 最大Y = 节点.y ?? 0
    }

    let 边距 = 60
    let 内容宽度 = 最大X - 最小X + 边距 * 2
    let 内容高度 = 最大Y - 最小Y + 边距 * 2
    let 缩放比例 = Math.min(容器宽度 / 内容宽度, 容器高度 / 内容高度, 1)
    let 平移X = (容器宽度 - 内容宽度 * 缩放比例) / 2 - (最小X - 边距) * 缩放比例
    let 平移Y = (容器高度 - 内容高度 * 缩放比例) / 2 - (最小Y - 边距) * 缩放比例

    let 缩放目标 = d3.select(this.svg容器 as Element)
    let 初始变换 = d3.zoomIdentity.translate(平移X, 平移Y).scale(缩放比例)
    if (过渡) {
      缩放目标
        .transition()
        .duration(750)
        .call(缩放行为.transform as any, 初始变换)
    } else {
      缩放目标.call(缩放行为.transform as any, 初始变换)
    }
  }

  private 重置缩放(): void {
    if (this.svg元素 === null || this.缩放行为 === null) return
    let 容器宽度 = this.svg容器.clientWidth === 0 ? 800 : this.svg容器.clientWidth
    let 容器高度 = this.svg容器.clientHeight === 0 ? 600 : this.svg容器.clientHeight
    this.适配视图(this.svg元素, this.缩放行为, this.节点数据列表, 容器宽度, 容器高度)
  }

  private 截断文本(文本: string, 最大长度: number): string {
    if (文本.length <= 最大长度) return 文本
    return 文本.substring(0, 最大长度 - 1) + '...'
  }

  private 导出SVG(): void {
    if (this.svg元素 === null) return

    let 克隆svg = this.svg元素.cloneNode(true) as SVGSVGElement

    // 获取计算后的 CSS 变量值并内联
    let 计算样式 = getComputedStyle(document.documentElement)
    let 背景色值 = 计算样式.getPropertyValue('--主要背景颜色').trim()
    let 文字色值 = 计算样式.getPropertyValue('--文字颜色').trim()
    let 边框色值 = 计算样式.getPropertyValue('--边框颜色').trim()
    let 卡片背景值 = 计算样式.getPropertyValue('--卡片背景颜色').trim()
    let 主色调值 = 计算样式.getPropertyValue('--主色调').trim()
    let 背景色 = 背景色值 === '' ? '#1e1e2e' : 背景色值
    let 文字色 = 文字色值 === '' ? '#cdd6f4' : 文字色值
    let 边框色 = 边框色值 === '' ? '#45475a' : 边框色值
    let 卡片背景 = 卡片背景值 === '' ? '#313244' : 卡片背景值
    let 主色调 = 主色调值 === '' ? '#89b4fa' : 主色调值

    克隆svg.style.backgroundColor = 背景色
    this.替换SVG变量(克隆svg, {
      'var(--主要背景颜色)': 背景色,
      'var(--文字颜色)': 文字色,
      'var(--边框颜色)': 边框色,
      'var(--卡片背景颜色)': 卡片背景,
      'var(--主色调)': 主色调,
    })

    let 序列化器 = new XMLSerializer()
    let svgString = 序列化器.serializeToString(克隆svg)
    let blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    let url = URL.createObjectURL(blob)

    let 链接 = document.createElement('a')
    链接.href = url
    链接.download = 'fca-lattice.svg'
    链接.click()
    URL.revokeObjectURL(url)
  }

  private 导出PNG(): void {
    if (this.svg元素 === null) return

    let 克隆svg = this.svg元素.cloneNode(true) as SVGSVGElement

    // 获取计算后的 CSS 变量值并内联
    let 计算样式 = getComputedStyle(document.documentElement)
    let 背景色值 = 计算样式.getPropertyValue('--主要背景颜色').trim()
    let 文字色值 = 计算样式.getPropertyValue('--文字颜色').trim()
    let 边框色值 = 计算样式.getPropertyValue('--边框颜色').trim()
    let 卡片背景值 = 计算样式.getPropertyValue('--卡片背景颜色').trim()
    let 主色调值 = 计算样式.getPropertyValue('--主色调').trim()
    let 背景色 = 背景色值 === '' ? '#1e1e2e' : 背景色值
    let 文字色 = 文字色值 === '' ? '#cdd6f4' : 文字色值
    let 边框色 = 边框色值 === '' ? '#45475a' : 边框色值
    let 卡片背景 = 卡片背景值 === '' ? '#313244' : 卡片背景值
    let 主色调 = 主色调值 === '' ? '#89b4fa' : 主色调值

    克隆svg.style.backgroundColor = 背景色
    this.替换SVG变量(克隆svg, {
      'var(--主要背景颜色)': 背景色,
      'var(--文字颜色)': 文字色,
      'var(--边框颜色)': 边框色,
      'var(--卡片背景颜色)': 卡片背景,
      'var(--主色调)': 主色调,
    })

    // 设置实际像素尺寸
    let 宽度 = this.svg容器.clientWidth === 0 ? 800 : this.svg容器.clientWidth
    let 高度 = this.svg容器.clientHeight === 0 ? 600 : this.svg容器.clientHeight
    let 缩放倍数 = 2
    克隆svg.setAttribute('width', (宽度 * 缩放倍数).toString())
    克隆svg.setAttribute('height', (高度 * 缩放倍数).toString())

    let 序列化器 = new XMLSerializer()
    let svgString = 序列化器.serializeToString(克隆svg)
    let blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    let url = URL.createObjectURL(blob)

    let img = new Image()
    img.onload = (): void => {
      let canvas = document.createElement('canvas')
      canvas.width = 宽度 * 缩放倍数
      canvas.height = 高度 * 缩放倍数
      let ctx = canvas.getContext('2d')
      if (ctx === null) return

      ctx.fillStyle = 背景色
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      canvas.toBlob((pngBlob) => {
        if (pngBlob === null) return
        let pngUrl = URL.createObjectURL(pngBlob)
        let 链接 = document.createElement('a')
        链接.href = pngUrl
        链接.download = 'fca-lattice.png'
        链接.click()
        URL.revokeObjectURL(pngUrl)
      }, 'image/png')

      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  private 替换SVG变量(元素: Element, 变量映射: Record<string, string>): void {
    // 替换所有属性中的 CSS 变量
    for (let i = 0; i < 元素.attributes.length; i++) {
      let 属性 = 元素.attributes[i]
      if (属性 === undefined) continue
      let 值 = 属性.value
      for (let [变量, 实际值] of Object.entries(变量映射)) {
        值 = 值.replaceAll(变量, 实际值)
      }
      属性.value = 值
    }

    // 替换 style 属性
    if (元素 instanceof SVGElement || 元素 instanceof HTMLElement) {
      let 样式文本 = 元素.getAttribute('style')
      if (样式文本 !== null) {
        for (let [变量, 实际值] of Object.entries(变量映射)) {
          样式文本 = 样式文本.replaceAll(变量, 实际值)
        }
        元素.setAttribute('style', 样式文本)
      }
    }

    // 递归处理子元素
    for (let i = 0; i < 元素.children.length; i++) {
      let 子元素 = 元素.children[i]
      if (子元素 === undefined) continue
      this.替换SVG变量(子元素, 变量映射)
    }
  }
}
