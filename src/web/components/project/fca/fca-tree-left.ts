import type { FcaTreeNodeData } from '../../../../interface/project/fca/get-children/types'
import { 组件基类 } from '../../../base/base'
import { API管理器 } from '../../../global/manager/api-manager'

type 发出事件类型 = { 节点选中: { 节点id: string; 节点名称: string } }
type 监听事件类型 = {}

interface 树节点UI状态 {
  数据: FcaTreeNodeData
  展开状态: boolean
  已加载子节点: boolean
  DOM元素: HTMLDivElement
  子容器: HTMLDivElement | null
  层级: number
}

export class FCA树左侧组件 extends 组件基类<发出事件类型, 监听事件类型> {
  static {
    this.注册组件('fca-tree-left', this)
  }

  private API管理器 = API管理器
  private 树容器: HTMLDivElement = document.createElement('div')
  private 节点状态映射 = new Map<string, 树节点UI状态>()
  private 当前选中节点id: string | null = null

  protected override async 当加载时(): Promise<void> {
    this.注入样式()
    this.初始化宿主样式()
    this.创建容器()
    await this.加载根节点()

    window.addEventListener('fca-tree-should-refresh', () => {
      void this.刷新树()
    })

    window.addEventListener('fca-tree-clear-selection', () => {
      this.树容器.querySelectorAll('.tree-node-title.selected').forEach((div) => {
        div.classList.remove('selected')
      })
      this.当前选中节点id = null
    })
  }

  private 注入样式(): void {
    let 样式 = document.createElement('style')
    样式.textContent = `
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
        transition: background-color 0.2s;
      }
      .tree-node-title:hover {
        background-color: var(--悬浮背景颜色);
      }
      .tree-node-title.selected {
        background-color: var(--选中背景颜色) !important;
      }
    `
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
    this.树容器.style.width = '100%'
    this.树容器.style.height = '100%'
    this.树容器.style.overflowY = 'auto'
    this.shadow.appendChild(this.树容器)
  }

  private async 加载根节点(): Promise<void> {
    try {
      let 结果 = await this.API管理器.请求postJson并处理错误('/api/project/fca/get-children', { parentId: '' })
      if (结果.data.length === 0) {
        let 提示 = document.createElement('div')
        提示.style.color = 'var(--提示文字颜色)'
        提示.style.fontSize = '14px'
        提示.style.padding = '10px'
        提示.style.textAlign = 'center'
        提示.style.marginTop = '20px'
        提示.textContent = '您的所有仓库目前都没有任何标签，因此 FCA 树为空。请给仓库添加标签后再查看。'
        this.树容器.appendChild(提示)
      } else {
        await this.渲染节点列表(结果.data, this.树容器, 0)
      }
    } catch (err) {
      console.error(err)
      this.树容器.textContent = '加载树失败，请稍后重试'
    }
  }

  private async 渲染节点列表(节点列表: FcaTreeNodeData[], 父容器: HTMLElement, 层级: number): Promise<void> {
    for (let 节点数据 of 节点列表) {
      let 节点元素 = await this.生成节点元素(节点数据, 层级)
      父容器.appendChild(节点元素.DOM元素)
    }
  }

  private async 生成节点元素(节点数据: FcaTreeNodeData, 层级: number): Promise<树节点UI状态> {
    let 节点容器 = document.createElement('div')
    节点容器.style.marginLeft = `${层级 * 10}px`
    节点容器.style.paddingLeft = '8px'
    节点容器.style.display = 'flex'
    节点容器.style.flexDirection = 'column'

    let 标题行 = document.createElement('div')
    标题行.classList.add('tree-node-title')
    标题行.style.userSelect = 'none'
    标题行.style.display = 'flex'
    标题行.style.alignItems = 'center'
    标题行.style.padding = '4px 8px'
    标题行.style.cursor = 'pointer'
    标题行.style.borderRadius = '4px'
    标题行.style.flexShrink = '0'
    标题行.style.minHeight = '32px'
    标题行.style.boxSizing = 'border-box'

    // 展开图标
    let 展开图标 = document.createElement('span')
    // FCA 里所有节点都可能可以展开，只要不是 objectCount = 0（其实为 0 就不返回了）
    // 通过 hasChildren 提前预测
    展开图标.textContent = '▶'
    展开图标.style.display = 'inline-block'
    展开图标.style.width = '16px'
    展开图标.style.color = 'var(--次要文字颜色)'
    展开图标.style.cursor = 'pointer'
    展开图标.style.transition = 'transform 0.2s'

    if (节点数据.hasChildren === false) {
      展开图标.style.visibility = 'hidden'
      展开图标.style.pointerEvents = 'none'
    }

    let 执行展开收起 = async (): Promise<void> => {
      if (子容器 !== null) {
        if (节点状态.展开状态 === false) {
          // 展开
          if (节点状态.已加载子节点 === false) {
            let 有子节点 = await this.加载子节点(节点数据.id, 子容器, 层级 + 1)
            节点状态.已加载子节点 = true
            if (!有子节点) {
              展开图标.style.visibility = 'hidden'
              展开图标.style.pointerEvents = 'none'
              return
            }
          }
          if (子容器.children.length > 0) {
            子容器.style.display = 'flex'
            子容器.style.height = 'auto'
            子容器.style.gap = '2px'
            子容器.style.marginTop = '2px'
            展开图标.textContent = '▼'
            展开图标.style.transform = 'rotate(0deg)'
            节点状态.展开状态 = true
          }
        } else {
          // 收起
          子容器.style.gap = '0'
          子容器.style.marginTop = '0'
          子容器.style.height = '0'
          子容器.style.display = 'none'
          展开图标.textContent = '▶'
          展开图标.style.transform = 'rotate(0deg)'
          节点状态.展开状态 = false
        }
      }
    }

    // 展开图标点击事件
    展开图标.addEventListener('click', async (e) => {
      e.stopPropagation()
      await 执行展开收起()
    })

    // 名称
    let 名称 = document.createElement('span')
    名称.textContent = 节点数据.name ?? '(未命名概念)'
    名称.style.fontWeight = 'bold'
    名称.style.marginLeft = '4px'
    名称.style.flex = '1'

    // 数量
    let 数量 = document.createElement('span')
    数量.textContent = `(${节点数据.objectCount})`
    数量.style.color = 'var(--提示文字颜色)'
    数量.style.fontSize = '12px'
    数量.style.marginLeft = '6px'

    标题行.appendChild(展开图标)
    标题行.appendChild(名称)
    标题行.appendChild(数量)
    节点容器.appendChild(标题行)

    // 子容器
    let 子容器: HTMLDivElement | null = null
    子容器 = document.createElement('div')
    子容器.style.display = 'none'
    子容器.style.flexDirection = 'column'
    子容器.style.gap = '0'
    子容器.style.margin = '0'
    子容器.style.padding = '0'
    子容器.style.overflow = 'hidden'
    子容器.style.height = '0'
    子容器.style.transition = 'height 0.2s, margin-top 0.2s, gap 0.2s'
    节点容器.appendChild(子容器)

    let 节点状态: 树节点UI状态 = {
      数据: 节点数据,
      展开状态: false,
      已加载子节点: false,
      DOM元素: 节点容器,
      子容器: 子容器,
      层级: 层级,
    }

    this.节点状态映射.set(节点数据.id, 节点状态)

    // 标题行点击事件
    标题行.addEventListener('click', async (e) => {
      e.stopPropagation()
      this.设置选中节点(节点数据.id, 标题行)
      if (节点状态.展开状态 === false) {
        await 执行展开收起()
      }
    })

    return 节点状态
  }

  private async 加载子节点(父节点id: string, 子容器: HTMLDivElement, 层级: number): Promise<boolean> {
    try {
      let 结果 = await this.API管理器.请求postJson并处理错误('/api/project/fca/get-children', { parentId: 父节点id })
      if (结果.data.length === 0) {
        return false
      } else {
        await this.渲染节点列表(结果.data, 子容器, 层级)
        return true
      }
    } catch (err) {
      console.error(err)
      return false
    }
  }

  private 设置选中节点(节点id: string, 标题行: HTMLDivElement): void {
    this.树容器.querySelectorAll('.tree-node-title.selected').forEach((div) => {
      div.classList.remove('selected')
    })

    标题行.classList.add('selected')
    this.当前选中节点id = 节点id

    let 节点状态 = this.节点状态映射.get(节点id)
    if (节点状态 !== void 0) {
      this.派发事件('节点选中', { 节点id: 节点id, 节点名称: 节点状态.数据.name ?? '(未命名概念)' })

      // 全局通知右侧
      window.dispatchEvent(new CustomEvent('fca-tag-selected', { detail: { tags: 节点id.split(',') } }))
    }
  }

  public 取消选中(): void {
    this.树容器.querySelectorAll('.tree-node-title.selected').forEach((div) => {
      div.classList.remove('selected')
    })
    this.当前选中节点id = null
    window.dispatchEvent(new CustomEvent('fca-tag-selected', { detail: { tags: [] } }))
  }

  public async 刷新树(): Promise<void> {
    let 展开的节点id列表 = Array.from(this.节点状态映射.entries())
      .filter(([_, 状态]) => 状态.展开状态)
      .map(([id, _]) => id)
    let 选中的节点id = this.当前选中节点id

    this.树容器.innerHTML = ''
    this.节点状态映射.clear()

    await this.加载根节点()
    await this.恢复树状态(展开的节点id列表, 选中的节点id)
  }

  private async 恢复树状态(展开的节点id列表: string[], 选中的节点id: string | null): Promise<void> {
    let 还需要展开 = true
    while (还需要展开) {
      还需要展开 = false
      for (let id of 展开的节点id列表) {
        let 状态 = this.节点状态映射.get(id)
        if (状态 !== undefined && !状态.展开状态) {
          if (状态.子容器 !== null) {
            let 有子节点 = await this.加载子节点(状态.数据.id, 状态.子容器, 状态.层级 + 1)
            状态.已加载子节点 = true
            if (有子节点) {
              状态.子容器.style.display = 'flex'
              状态.子容器.style.height = 'auto'
              状态.子容器.style.gap = '2px'
              状态.子容器.style.marginTop = '2px'
              let 标题行 = 状态.DOM元素.firstElementChild as HTMLElement | null
              if (标题行 !== null) {
                let 展开图标 = 标题行.firstElementChild as HTMLElement | null
                if (展开图标 !== null) {
                  展开图标.textContent = '▼'
                  展开图标.style.transform = 'rotate(0deg)'
                }
              }
              状态.展开状态 = true
              还需要展开 = true
            } else {
              let 标题行 = 状态.DOM元素.firstElementChild as HTMLElement | null
              if (标题行 !== null) {
                let 展开图标 = 标题行.firstElementChild as HTMLElement | null
                if (展开图标 !== null) {
                  展开图标.style.visibility = 'hidden'
                  展开图标.style.pointerEvents = 'none'
                }
              }
            }
          }
        }
      }
    }

    if (选中的节点id !== null) {
      let 状态 = this.节点状态映射.get(选中的节点id)
      if (状态 !== undefined) {
        let 标题行 = 状态.DOM元素.firstElementChild as HTMLDivElement | null
        if (标题行 !== null) {
          this.树容器.querySelectorAll('.tree-node-title.selected').forEach((div) => {
            div.classList.remove('selected')
          })
          标题行.classList.add('selected')
          this.当前选中节点id = 选中的节点id
        }
      }
    }
  }
}
