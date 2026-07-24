import * as d3 from 'd3'
import type { FcaLatticeData } from '../../../../interface/project/fca/get-full-lattice/types'
import { 组件基类 } from '../../../base/base'
import { API管理器 } from '../../../global/manager/api-manager'
import { 创建元素 } from '../../../global/tools/create-element'
import { 普通按钮 } from '../../general/base/base-button'
import { 导出PNG, 导出SVG } from './fca-lattice-viewer-export'
import { 渲染格图 } from './fca-lattice-viewer-renderer'
import type { ForceNode, LocalState } from './fca-lattice-viewer-types'

type 发出事件类型 = {}
type 监听事件类型 = {}

export class FCA格图查看器 extends 组件基类<发出事件类型, 监听事件类型> {
  static {
    this.注册组件('fca-lattice-viewer', this)
  }

  private 格图数据: FcaLatticeData | null = null
  private 提示框: HTMLDivElement = 创建元素('div', {
    style: {
      position: 'absolute',
      display: 'none',
      bottom: '12px',
      right: '12px',
      backgroundColor: 'color-mix(in srgb, var(--卡片背景颜色) 80%, transparent)',
      backdropFilter: 'blur(8px)',
      webkitBackdropFilter: 'blur(8px)',
      border: '1px solid var(--边框颜色)',
      borderRadius: '8px',
      padding: '10px 14px',
      color: 'var(--文字颜色)',
      fontSize: '12px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      pointerEvents: 'none',
      zIndex: '10',
      minWidth: '160px',
      maxWidth: '280px',
      lineHeight: '1.5',
    },
  })
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
  private 销毁渲染器: (() => void) | null = null

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
      this.执行渲染()
    }
  }

  private 创建工具栏(): void {
    let 导出PNG按钮 = new 普通按钮({
      文本: '导出 PNG',
      点击处理函数: (): void => {
        导出PNG(this.svg元素, this.svg容器)
      },
      宿主样式: { padding: '0' },
      元素样式: { padding: '4px 10px', fontSize: '12px', outline: 'none' },
    })

    let 导出SVG按钮 = new 普通按钮({
      文本: '导出 SVG',
      点击处理函数: (): void => {
        导出SVG(this.svg元素)
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

    this.工具栏.appendChild(导出PNG按钮)
    this.工具栏.appendChild(导出SVG按钮)
    this.工具栏.appendChild(重置视图按钮)
  }

  private 执行渲染(): void {
    if (this.格图数据 === null) return
    if (this.销毁渲染器 !== null) {
      this.销毁渲染器()
    }
    this.销毁渲染器 = 渲染格图({
      svg容器: this.svg容器,
      提示框: this.提示框,
      格图数据: this.格图数据,
      加载本地状态: () => this.加载本地状态(),
      保存本地状态: (变换) => this.保存本地状态(变换),
      onSvgCreated: (svg, 缩放行为, nodes) => {
        this.svg元素 = svg
        this.缩放行为 = 缩放行为
        this.节点数据列表 = nodes
      },
      显示提示框: (节点) => this.显示提示框(节点),
      隐藏提示框: () => this.隐藏提示框(),
    })
  }

  private 重置缩放(): void {
    if (this.当前用户Id !== null) {
      try {
        let 原始数据 = localStorage.getItem('fca_lattice_state')
        if (原始数据 !== null) {
          let 解析后 = JSON.parse(原始数据) as Record<string, LocalState>
          let 用户状态 = 解析后[this.当前用户Id]
          if (用户状态 !== undefined) {
            delete 用户状态.nodes
            delete 用户状态.zoom
            localStorage.setItem('fca_lattice_state', JSON.stringify(解析后))
          }
        }
      } catch (e: unknown) {
        void this.log.error('清除本地状态失败', e instanceof Error ? e.message : String(e))
      }
    }

    if (this.格图数据 !== null) {
      this.svg容器.innerHTML = ''
      this.执行渲染()
    }
  }

  private 显示提示框(节点: ForceNode): void {
    let 仓库列表 = 节点.repos
    if (仓库列表.length === 0) {
      this.提示框.style.display = 'none'
      return
    }

    let 最大显示数量 = 5
    let 显示的仓库 = 仓库列表.slice(0, 最大显示数量)
    let 剩余数量 = 仓库列表.length - 最大显示数量

    let 仓库HTML = 显示的仓库
      .map((name) => {
        return `<div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background-color: var(--主色调); flex-shrink: 0; display: inline-block;"></span>
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">${name}</span>
      </div>`
      })
      .join('')

    let 底部提示 = ''
    if (剩余数量 > 0) {
      底部提示 = `<div style="color: var(--提示文字颜色); margin-top: 6px; font-size: 11px; border-top: 1px solid var(--边框颜色); padding-top: 4px;">
        等共 ${仓库列表.length} 个仓库
      </div>`
    } else {
      底部提示 = `<div style="color: var(--提示文字颜色); margin-top: 6px; font-size: 11px; border-top: 1px solid var(--边框颜色); padding-top: 4px;">
        共 ${仓库列表.length} 个仓库
      </div>`
    }

    this.提示框.innerHTML = `
      <div style="font-weight: bold; font-size: 12px; color: var(--文字颜色); border-bottom: 1px solid var(--边框颜色); padding-bottom: 4px; margin-bottom: 4px;">
        包含的仓库
      </div>
      <div>
        ${仓库HTML}
      </div>
      ${底部提示}
    `

    this.提示框.style.display = 'block'
  }

  private 隐藏提示框(): void {
    this.提示框.style.display = 'none'
  }
}
