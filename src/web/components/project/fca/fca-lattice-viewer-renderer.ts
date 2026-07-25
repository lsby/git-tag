import * as d3 from 'd3'
import type { FcaLatticeData } from '../../../../interface/project/fca/get-full-lattice/types'
import type { ForceLink, ForceNode, LocalState } from './fca-lattice-viewer-types'

export interface 渲染选项 {
  svg容器: HTMLDivElement
  提示框: HTMLDivElement
  格图数据: FcaLatticeData
  加载本地状态: () => LocalState | null
  保存本地状态: (变换?: d3.ZoomTransform) => void
  onSvgCreated: (svg: SVGSVGElement, zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>, nodes: ForceNode[]) => void
  显示提示框: (节点: ForceNode) => void
  隐藏提示框: () => void
}

export function 格式化两行文本(文本: string, 每行最大长度: number = 12): string[] {
  if (文本.length <= 每行最大长度) {
    return [文本]
  }

  let 第一行 = ''
  let 剩余文本 = ''

  let 逗号位置 = 文本.lastIndexOf(',', 每行最大长度)
  if (逗号位置 === -1) {
    逗号位置 = 文本.lastIndexOf('，', 每行最大长度)
  }

  if (逗号位置 !== -1 && 逗号位置 > 0) {
    第一行 = 文本.substring(0, 逗号位置 + 1)
    剩余文本 = 文本.substring(逗号位置 + 1).trimStart()
  } else {
    let 空格位置 = 文本.lastIndexOf(' ', 每行最大长度)
    if (空格位置 !== -1 && 空格位置 > 0) {
      第一行 = 文本.substring(0, 空格位置)
      剩余文本 = 文本.substring(空格位置 + 1).trimStart()
    } else {
      第一行 = 文本.substring(0, 每行最大长度)
      剩余文本 = 文本.substring(每行最大长度)
    }
  }

  let 第二行 = ''
  if (剩余文本.length <= 每行最大长度) {
    第二行 = 剩余文本
  } else {
    第二行 = 剩余文本.substring(0, 每行最大长度 - 1) + '...'
  }

  return [第一行, 第二行]
}

export function 适配视图(
  svg容器: HTMLDivElement,
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

  let 缩放目标 = d3.select(svg容器 as Element)
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

export function 渲染格图(选项: 渲染选项): () => void {
  let { svg容器, 提示框, 格图数据, 加载本地状态, 保存本地状态, onSvgCreated, 显示提示框, 隐藏提示框 } = 选项

  // 监听真实的宽高加载完成后再进行物理模拟，解决初始宽度为0导致的力导图中心偏向左侧的问题
  let 观察器 = new ResizeObserver((entries) => {
    let rect = entries[0]?.contentRect
    if (rect !== undefined && rect.width > 0 && rect.height > 0) {
      观察器.disconnect()
      let 容器宽度 = rect.width
      let 容器高度 = rect.height

      svg容器.innerHTML = ''
      svg容器.appendChild(提示框)
      let svgNs = 'http://www.w3.org/2000/svg' as const
      let svg = document.createElementNS(svgNs, 'svg')
      svg.setAttribute('width', '100%')
      svg.setAttribute('height', '100%')
      svg.setAttribute('xmlns', svgNs)
      svg.style.backgroundColor = 'transparent'
      svg容器.appendChild(svg)

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
      let forceNodes: ForceNode[] = 格图数据.nodes.map((n) => ({ ...n, 层级: n.intent.length, x: 0, y: 0 }))

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
          n.x = 起始X + i * 间距 + (Math.random() - 0.5) * 10
          n.y = 层级 * 120 + 80
        })
      })

      // 从本地存储中读取状态，恢复已调整过的节点坐标
      let 本地状态 = 加载本地状态()
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

      let 节点映射 = new Map<string, ForceNode>()
      forceNodes.forEach((n) => 节点映射.set(n.id, n))

      let forceLinks: ForceLink[] = 格图数据.edges
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
      node.append('rect').attr('x', -40).attr('y', -30).attr('width', 80).attr('height', 85).attr('fill', 'transparent')

      node
        .append('circle')
        .attr('r', 20)
        .attr('fill', 'rgba(15, 23, 42, 0.92)')
        .attr('stroke', 'var(--主色调)')
        .attr('stroke-width', 2)

      node
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', 12)
        .attr('font-weight', '700')
        .attr('fill', '#ffffff')
        .text((d) => d.extentCount)

      let textNode = node
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('font-size', 12)
        .attr('font-weight', '600')
        .attr('fill', '#e2e8f0')

      textNode.each((d, i, nodes) => {
        let currentTextNode = nodes[i]
        if (currentTextNode === undefined) return
        let el = d3.select(currentTextNode)
        let lines = 格式化两行文本(d.label, 12)
        if (lines.length === 1) {
          el.append('tspan')
            .attr('x', 0)
            .attr('y', 34)
            .text(lines[0] ?? '')
        } else {
          el.append('tspan')
            .attr('x', 0)
            .attr('y', 31)
            .text(lines[0] ?? '')
          el.append('tspan')
            .attr('x', 0)
            .attr('y', 45)
            .text(lines[1] ?? '')
        }
      })

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
        保存本地状态()
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
        .on('mouseenter', (e: MouseEvent, d: ForceNode) => {
          let 相关 = new Set<string>()
          相关.add(d.id)
          祖先映射.get(d.id)?.forEach((id) => 相关.add(id))

          node.style('opacity', (n) => {
            return 相关.has(n.id) ? 1 : 0.05
          })

          link.style('stroke-opacity', (l) => {
            let s = l.source
            let t = l.target
            return 相关.has(s.id) && 相关.has(t.id) ? 0.8 : 0.02
          })

          显示提示框(d)
        })
        .on('mouseleave', () => {
          node.style('opacity', 1)
          link.style('stroke-opacity', 0.6)
          隐藏提示框()
        })

      let 缩放行为 = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 5])
        .on('zoom', (事件) => {
          d3主组.attr('transform', 事件.transform as unknown as string)
        })
        .on('end', (事件) => {
          保存本地状态(事件.transform)
        })

      d3.select(svg容器).call(缩放行为 as any)

      onSvgCreated(svg, 缩放行为, forceNodes)

      // 恢复历史视角，或者进行首次完美居中适配
      if (本地状态 !== null && 本地状态.zoom !== undefined) {
        let 初始变换 = d3.zoomIdentity.translate(本地状态.zoom.x, 本地状态.zoom.y).scale(本地状态.zoom.k)
        let 缩放目标 = d3.select(svg容器 as Element)
        缩放目标.call(缩放行为.transform as any, 初始变换)
      } else {
        适配视图(svg容器, 缩放行为, forceNodes, 容器宽度, 容器高度, false)
      }
    }
  })
  观察器.observe(svg容器)

  return (): void => {
    观察器.disconnect()
  }
}
