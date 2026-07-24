import type { FcaTreeNodeData } from '../../../../interface/project/fca/get-children/types'
import { 创建元素 } from '../../../global/tools/create-element'

export type FCA树节点配置 = {
  数据: FcaTreeNodeData
  层级: number
  唯一键: string
  点击标题: (唯一键: string, 节点数据: FcaTreeNodeData) => Promise<void>
  点击展开: (唯一键: string, 节点数据: FcaTreeNodeData) => Promise<void>
}

export class FCA树节点 {
  private 数据: FcaTreeNodeData
  private 层级: number
  private 唯一键: string
  private 展开状态 = false
  private 已加载子节点 = false
  private 选中状态 = false

  private 展开图标: HTMLSpanElement
  private 节点图标: HTMLSpanElement
  private 名称元素: HTMLSpanElement
  private 数量元素: HTMLSpanElement
  private 标题行: HTMLDivElement
  private 子容器: HTMLDivElement
  private 根容器: HTMLDivElement

  public constructor(配置: FCA树节点配置) {
    this.数据 = 配置.数据
    this.层级 = 配置.层级
    this.唯一键 = 配置.唯一键

    this.展开图标 = 创建元素('span', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        color: 'var(--次要文字颜色)',
        cursor: 'pointer',
        transition: 'transform 0.15s',
        borderRadius: '4px',
        flexShrink: '0',
        marginRight: '2px',
      },
      innerHTML: `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="display:block;"><path fill-rule="evenodd" d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" clip-rule="evenodd"/></svg>`,
    })

    this.节点图标 = 创建元素('span', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '6px',
        color: 'var(--次要文字颜色)',
      },
      innerHTML: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M1.5 3.5a1 1 0 0 1 1-1h3.7l1.3 1.5h7a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-10z"/></svg>`,
    })

    this.名称元素 = 创建元素('span', {
      textContent: 配置.数据.name ?? '(未命名概念)',
      style: { flex: '1', fontSize: '13.5px' },
    })

    this.数量元素 = 创建元素('span', {
      textContent: `(${配置.数据.objectCount})`,
      style: { color: 'var(--提示文字颜色)', fontSize: '12px', marginLeft: '6px' },
    })

    if (配置.数据.hasChildren === false) {
      this.展开图标.style.visibility = 'hidden'
      this.展开图标.style.pointerEvents = 'none'
    }

    this.展开图标.onclick = (e: MouseEvent): void => {
      e.stopPropagation()
      void 配置.点击展开(this.唯一键, this.数据)
    }

    this.标题行 = 创建元素('div', {
      className: 'tree-node-title',
      style: {
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px',
        paddingLeft: `${配置.层级 * 16 + 8}px`,
        cursor: 'pointer',
        borderRadius: '4px',
        margin: '1px 4px',
        flexShrink: '0',
        minHeight: '32px',
        boxSizing: 'border-box',
      },
      children: [this.展开图标, this.节点图标, this.名称元素, this.数量元素],
    })

    this.标题行.onclick = (e: MouseEvent): void => {
      e.stopPropagation()
      void 配置.点击标题(this.唯一键, this.数据)
    }

    this.子容器 = 创建元素('div', {
      style: {
        display: 'none',
        flexDirection: 'column',
        gap: '0',
        margin: '0',
        padding: '0',
        overflow: 'hidden',
        height: '0',
        transition: 'height 0.2s, margin-top 0.2s, gap 0.2s',
      },
    })

    this.根容器 = 创建元素('div', {
      style: { display: 'flex', flexDirection: 'column' },
      children: [this.标题行, this.子容器],
    })
  }

  public 获得根容器(): HTMLDivElement {
    return this.根容器
  }

  public 获得子容器(): HTMLDivElement {
    return this.子容器
  }

  public 获得数据(): FcaTreeNodeData {
    return this.数据
  }

  public 获得层级(): number {
    return this.层级
  }

  public 是否展开(): boolean {
    return this.展开状态
  }

  public 是否已加载子节点(): boolean {
    return this.已加载子节点
  }

  public 设置已加载子节点(已加载: boolean): void {
    this.已加载子节点 = 已加载
  }

  public 设置展开(展开: boolean): void {
    this.展开状态 = 展开
    if (展开 === true) {
      this.子容器.style.display = 'flex'
      this.子容器.style.height = 'auto'
      this.子容器.style.gap = '2px'
      this.子容器.style.marginTop = '2px'
      this.展开图标.style.transform = 'rotate(90deg)'
    } else {
      this.子容器.style.gap = '0'
      this.子容器.style.marginTop = '0'
      this.子容器.style.height = '0'
      this.子容器.style.display = 'none'
      if (this.数据.hasChildren !== false) {
        this.展开图标.style.transform = 'rotate(0deg)'
      }
    }
  }

  public 设置无子节点(): void {
    this.展开图标.style.visibility = 'hidden'
    this.展开图标.style.pointerEvents = 'none'
  }

  public 设置选中(选中: boolean): void {
    this.选中状态 = 选中
    if (选中 === true) {
      this.标题行.classList.add('selected')
    } else {
      this.标题行.classList.remove('selected')
    }
  }

  public 是否选中(): boolean {
    return this.选中状态
  }

  public 获得唯一键(): string {
    return this.唯一键
  }
}
