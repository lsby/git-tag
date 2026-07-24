import type { FcaTreeNodeData } from '../../../../interface/project/fca/get-children/types'
import { 组件基类 } from '../../../base/base'
import { API管理器 } from '../../../global/manager/api-manager'
import { 显示模态框 } from '../../../global/manager/modal-manager'
import { 创建元素 } from '../../../global/tools/create-element'
import { 普通按钮 } from '../../general/base/base-button'
import { FCA格图查看器 } from './fca-lattice-viewer'
import { FCA树节点 } from './fca-tree-node'

type 发出事件类型 = { 节点选中: { 节点id: string; 节点名称: string } }
type 监听事件类型 = {}

export class FCA树左侧组件 extends 组件基类<发出事件类型, 监听事件类型> {
  static {
    this.注册组件('fca-tree-left', this)
  }

  private API管理器 = API管理器
  private 树容器 = 创建元素('div', { style: { flex: '1', width: '100%', overflowY: 'auto' } })
  private 按钮容器 = 创建元素('div', { style: { display: 'flex', gap: '8px' } })
  private 提示徽章 = 创建元素('span', {
    className: 'tree-hint-badge',
    innerHTML: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><path d="M15 15l5 5m-5-5a7 7 0 110-14 7 7 0 010 14z"/></svg> 点击节点可筛选`,
  })
  private 节点状态映射 = new Map<string, FCA树节点>()
  private 当前选中节点唯一键: string | null = null

  private 获取子节点函数: (parentId: string) => Promise<FcaTreeNodeData[]> = async (parentId) => {
    let 结果 = await this.API管理器.请求postJson并处理错误('/api/project/fca/get-children', { parentId })
    return 结果.data
  }
  private 点击格图函数: (() => void) | undefined
  private 默认展开全部 = false
  private 隐藏按钮 = false
  private 隐藏提示徽章 = true

  public 设置数据提供者(配置: {
    获取子节点: (parentId: string) => Promise<FcaTreeNodeData[]>
    点击格图?: () => void
    隐藏按钮?: boolean
    默认展开全部?: boolean
    显示提示徽章?: boolean
  }): void {
    this.获取子节点函数 = 配置.获取子节点
    this.点击格图函数 = 配置.点击格图
    if (配置.隐藏按钮 === true) {
      this.隐藏按钮 = true
      this.按钮容器.style.display = 'none'
    } else {
      this.隐藏按钮 = false
      this.按钮容器.style.display = 'flex'
    }
    if (配置.默认展开全部 === true) {
      this.默认展开全部 = true
    }
    if (配置.显示提示徽章 === true) {
      this.隐藏提示徽章 = false
    } else {
      this.隐藏提示徽章 = true
    }
    this.提示徽章.style.display = this.隐藏提示徽章 ? 'none' : 'inline-flex'
    void this.刷新树()
  }

  protected override async 当加载时(): Promise<void> {
    this.注入样式()
    this.初始化宿主样式()
    this.创建容器()
    await this.加载根节点()

    window.addEventListener('fca-tree-should-refresh', () => {
      void this.刷新树()
    })

    window.addEventListener('fca-tree-clear-selection', () => {
      this.取消选中()
    })

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      if (this.当前选中节点唯一键 !== null) {
        let 节点 = this.节点状态映射.get(this.当前选中节点唯一键)
        if (节点 !== undefined) {
          if (e.key === 'ArrowLeft') {
            this.执行节点收起(节点)
          } else if (e.key === 'ArrowRight') {
            void this.执行节点展开(节点)
          }
        }
      }
    })
  }

  private 注入样式(): void {
    let 样式 = 创建元素('style', {
      textContent: `
        ::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        ::-webkit-scrollbar-track {
          background: var(--滚动条轨道颜色);
        }
        ::-webkit-scrollbar-thumb {
          background: var(--滚动条滑块颜色);
          border-radius: 6px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--滚动条滑块悬浮颜色);
        }
        .tree-node-title {
          transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
          position: relative;
        }
        .tree-node-title:hover {
          background-color: var(--悬浮背景颜色);
        }
        .tree-node-title.selected {
          background-color: var(--选中背景颜色) !important;
          font-weight: 500;
        }
        .tree-node-title .click-hint {
          margin-left: auto;
          font-size: 11px;
          color: var(--主色调);
          opacity: 0;
          transition: opacity 0.2s;
          padding-right: 4px;
          white-space: nowrap;
          pointer-events: none;
          flex-shrink: 0;
        }
        .tree-node-title:hover .click-hint {
          opacity: 0.85;
        }
        .tree-hint-badge {
          font-size: 11.5px;
          font-weight: normal;
          color: var(--主色调);
          background-color: rgba(64, 158, 255, 0.12);
          padding: 2px 8px;
          border-radius: 10px;
          margin-left: 8px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 1px solid rgba(64, 158, 255, 0.25);
          white-space: nowrap;
          max-width: 140px;
          flex-shrink: 1;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `,
    })
    this.shadow.appendChild(样式)
  }

  private 初始化宿主样式(): void {
    let 宿主样式 = this.获得宿主样式()
    宿主样式.width = '100%'
    宿主样式.height = '100%'
    宿主样式.overflow = 'hidden'
    宿主样式.boxSizing = 'border-box'
    宿主样式.fontFamily = 'Arial, sans-serif'
    宿主样式.backgroundColor = 'var(--次要背景颜色)'
    宿主样式.display = 'flex'
    宿主样式.flexDirection = 'column'
    宿主样式.padding = '15px'
  }

  private 创建容器(): void {
    let 标题文本 = 创建元素('span', { textContent: 'FCA树' })
    this.提示徽章.style.display = this.隐藏提示徽章 ? 'none' : 'inline-flex'

    let 标题 = 创建元素('div', {
      style: {
        fontWeight: 'bold',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        minWidth: '0',
        flexShrink: '1',
        overflow: 'hidden',
      },
      children: [标题文本, this.提示徽章],
    })

    this.按钮容器.style.display = this.隐藏按钮 ? 'none' : 'flex'

    let 展开全部按钮 = new 普通按钮({
      文本: '展开全部',
      点击处理函数: (): void => {
        void this.展开全部()
      },
      宿主样式: { padding: '0' },
      元素样式: { padding: '4px 8px', fontSize: '12px', outline: 'none' },
    })

    let 折叠全部按钮 = new 普通按钮({
      文本: '折叠全部',
      点击处理函数: (): void => {
        this.折叠全部()
      },
      宿主样式: { padding: '0' },
      元素样式: { padding: '4px 8px', fontSize: '12px', outline: 'none' },
    })

    let 查看格图按钮 = new 普通按钮({
      文本: '格图',
      点击处理函数: (): void => {
        void this.显示格图()
      },
      宿主样式: { padding: '0' },
      元素样式: { padding: '4px 8px', fontSize: '12px', outline: 'none' },
    })

    this.按钮容器.appendChild(展开全部按钮)
    this.按钮容器.appendChild(折叠全部按钮)
    this.按钮容器.appendChild(查看格图按钮)

    let 工具栏 = 创建元素('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        flexShrink: '0',
      },
      children: [标题, this.按钮容器],
    })

    this.shadow.appendChild(工具栏)
    this.shadow.appendChild(this.树容器)
  }

  private async 加载根节点(): Promise<void> {
    try {
      let 数据 = await this.获取子节点函数('')
      this.树容器.innerHTML = ''
      if (数据.length === 0) {
        let 提示 = 创建元素('div', {
          style: {
            color: 'var(--提示文字颜色)',
            fontSize: '14px',
            padding: '10px',
            textAlign: 'center',
            marginTop: '20px',
          },
          textContent: '您的所有仓库目前都没有任何标签，因此 FCA 树为空。请给仓库添加标签后再查看。',
        })
        this.树容器.appendChild(提示)
      } else {
        await this.渲染节点列表(数据, this.树容器, 0, '')
        if (this.默认展开全部 === true) {
          await this.展开全部()
        }
      }
    } catch (err) {
      console.error(err)
      this.树容器.textContent = '加载树失败，请稍后重试'
    }
  }

  private async 渲染节点列表(
    节点列表: FcaTreeNodeData[],
    父容器: HTMLElement,
    层级: number,
    父节点唯一键: string,
  ): Promise<void> {
    for (let 节点数据 of 节点列表) {
      let 唯一键 = 父节点唯一键 === '' ? 节点数据.id : `${父节点唯一键}/${节点数据.id}`
      let 节点 = this.生成节点(节点数据, 层级, 唯一键)
      父容器.appendChild(节点.获得根容器())
    }
  }

  private 生成节点(节点数据: FcaTreeNodeData, 层级: number, 唯一键: string): FCA树节点 {
    let 节点 = new FCA树节点({
      数据: 节点数据,
      层级: 层级,
      唯一键: 唯一键,
      点击标题: async (唯一键, _数据): Promise<void> => {
        this.设置选中节点(唯一键)
        if (节点.是否展开() === false) {
          await this.执行节点展开(节点)
        }
      },
      点击展开: async (): Promise<void> => {
        if (节点.是否展开() === false) {
          await this.执行节点展开(节点)
        } else {
          this.执行节点收起(节点)
        }
      },
    })
    this.节点状态映射.set(唯一键, 节点)
    return 节点
  }

  private async 加载子节点(父节点: FCA树节点): Promise<boolean> {
    try {
      let 数据 = await this.获取子节点函数(父节点.获得数据().id)
      if (数据.length === 0) {
        return false
      } else {
        await this.渲染节点列表(数据, 父节点.获得子容器(), 父节点.获得层级() + 1, 父节点.获得唯一键())
        return true
      }
    } catch (err) {
      console.error(err)
      return false
    }
  }

  private async 执行节点展开(节点: FCA树节点): Promise<void> {
    if (节点.是否展开() === true) return
    if (节点.是否已加载子节点() === false) {
      let 有子节点 = await this.加载子节点(节点)
      节点.设置已加载子节点(true)
      if (有子节点 === false) {
        节点.设置无子节点()
        return
      }
    }
    if (节点.获得子容器().children.length > 0) {
      节点.设置展开(true)
    }
  }

  private 执行节点收起(节点: FCA树节点): void {
    if (节点.是否展开() === false) return
    节点.设置展开(false)
  }

  private 折叠全部(): void {
    for (let 节点 of this.节点状态映射.values()) {
      if (节点.是否展开() === true) {
        this.执行节点收起(节点)
      }
    }
  }

  private async 展开全部(): Promise<void> {
    let 还需要展开 = true
    while (还需要展开 === true) {
      还需要展开 = false
      let 当前所有的节点 = Array.from(this.节点状态映射.values())

      let 展开的任务: Promise<void>[] = []
      for (let 节点 of 当前所有的节点) {
        if (节点.是否展开() === false && 节点.获得数据().hasChildren !== false) {
          展开的任务.push(this.执行节点展开(节点))
          还需要展开 = true
        }
      }
      if (展开的任务.length > 0) {
        await Promise.all(展开的任务)
      }
    }
  }

  private 设置选中节点(唯一键: string): void {
    if (this.当前选中节点唯一键 !== null) {
      let 旧节点 = this.节点状态映射.get(this.当前选中节点唯一键)
      if (旧节点 !== undefined) {
        旧节点.设置选中(false)
      }
    }

    let 新节点 = this.节点状态映射.get(唯一键)
    if (新节点 !== undefined) {
      新节点.设置选中(true)
      this.当前选中节点唯一键 = 唯一键

      let 节点数据 = 新节点.获得数据()
      this.派发事件('节点选中', { 节点id: 节点数据.id, 节点名称: 节点数据.name ?? '(未命名概念)' })
      window.dispatchEvent(new CustomEvent('fca-tag-selected', { detail: { tags: 节点数据.id.split(',') } }))
    }
  }

  public 取消选中(): void {
    if (this.当前选中节点唯一键 !== null) {
      let 旧节点 = this.节点状态映射.get(this.当前选中节点唯一键)
      if (旧节点 !== undefined) {
        旧节点.设置选中(false)
      }
      this.当前选中节点唯一键 = null
    }
    window.dispatchEvent(new CustomEvent('fca-tag-selected', { detail: { tags: [] } }))
  }

  public async 刷新树(): Promise<void> {
    let 展开的节点唯一键列表 = Array.from(this.节点状态映射.entries())
      .filter(([_, 节点]) => 节点.是否展开())
      .map(([唯一键, _]) => 唯一键)
    let 选中的唯一键 = this.当前选中节点唯一键

    this.树容器.innerHTML = ''
    this.节点状态映射.clear()

    await this.加载根节点()
    await this.恢复树状态(展开的节点唯一键列表, 选中的唯一键)
  }

  private async 恢复树状态(展开的节点唯一键列表: string[], 选中的唯一键: string | null): Promise<void> {
    let 还需要展开 = true
    while (还需要展开 === true) {
      还需要展开 = false
      for (let 唯一键 of 展开的节点唯一键列表) {
        let 节点 = this.节点状态映射.get(唯一键)
        if (节点 !== undefined && 节点.是否展开() === false) {
          let 有子节点 = await this.加载子节点(节点)
          节点.设置已加载子节点(true)
          if (有子节点 === true) {
            节点.设置展开(true)
            还需要展开 = true
          } else {
            节点.设置无子节点()
          }
        }
      }
    }

    if (选中的唯一键 !== null) {
      this.设置选中节点(选中的唯一键)
    }
  }

  private async 显示格图(): Promise<void> {
    if (this.点击格图函数 !== undefined) {
      this.点击格图函数()
      return
    }
    try {
      let 结果 = await this.API管理器.请求postJson并处理错误('/api/project/fca/get-full-lattice', {})
      let 查看器 = new FCA格图查看器()
      查看器.设置数据(结果)
      await 显示模态框({ 标题: 'FCA 概念格图', 最大化: true }, 查看器)
    } catch (err) {
      console.error('获取格图数据失败:', err)
    }
  }
}
