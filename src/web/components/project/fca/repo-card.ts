import { 组件基类 } from '../../../base/base'
import { API管理器 } from '../../../global/manager/api-manager'
import { 关闭模态框, 显示模态框 } from '../../../global/manager/modal-manager'
import { 成功提示 } from '../../../global/manager/toast-manager'
import { 创建元素 } from '../../../global/tools/create-element'
import { 主要按钮, 普通按钮 } from '../../general/base/base-button'
import { 普通输入框 } from '../../general/form/form-input'

type 发出事件类型 = {
  点击添加标签: { repoId: string; currentTags: string[] }
  点击标签: { tag: string }
  点击卡片: { repoId: string; ctrlKey: boolean; shiftKey: boolean }
  右键点击卡片: { repoId: string; clientX: number; clientY: number }
}
type 监听事件类型 = {}

export interface 仓库卡片数据 {
  id: string
  externalId: string
  fullName: string
  description: string
  url: string
  stars: number
  language: string
  tags: string[]
  isPrivate: boolean
  isFork: boolean
  githubUpdatedAt: string
}

function 格式化相对时间(dateStr: string): string {
  if (dateStr === '') return ''
  let date = new Date(dateStr)
  let diff = Date.now() - date.getTime()
  let days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days > 30) {
    let m = date.toLocaleString('en-US', { month: 'short' })
    let d = date.getDate()
    let y = date.getFullYear()
    return `Updated on ${m} ${d}, ${y}`
  }
  if (days > 0) return `Updated ${days} ${days === 1 ? 'day' : 'days'} ago`
  let hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours > 0) return `Updated ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  let minutes = Math.floor(diff / (1000 * 60))
  if (minutes > 0) return `Updated ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  return `Updated just now`
}

function 获取语言颜色(lang: string): string {
  let colors: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    Java: '#b07219',
    Go: '#00ADD8',
    'C++': '#f34b7d',
    'C#': '#178600',
    Rust: '#dea584',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Vue: '#41b883',
    Shell: '#89e051',
  }
  return colors[lang] ?? '#8b949e'
}

export class 仓库卡片组件 extends 组件基类<发出事件类型, 监听事件类型> {
  static {
    this.注册组件('repo-card', this)
  }

  private 标题链接 = 创建元素('a', {
    style: {
      color: '#58a6ff',
      textDecoration: 'none',
      transition: 'text-decoration 0.2s',
      fontSize: '20px',
      fontWeight: '600',
      wordBreak: 'break-all',
    },
    onmouseover: (e) => ((e.target as HTMLElement).style.textDecoration = 'underline'),
    onmouseout: (e) => ((e.target as HTMLElement).style.textDecoration = 'none'),
    target: '_blank',
  })

  private 公开私有徽章 = 创建元素('span', {
    style: {
      color: 'var(--次要文字颜色)',
      border: '1px solid var(--边框颜色)',
      borderRadius: '2em',
      padding: '2px 7px',
      fontSize: '12px',
      fontWeight: '500',
      marginLeft: '8px',
      display: 'inline-block',
      verticalAlign: 'middle',
    },
  })

  private 分支徽章 = 创建元素('span', {
    style: {
      color: 'var(--次要文字颜色)',
      border: '1px solid var(--边框颜色)',
      borderRadius: '2em',
      padding: '2px 7px',
      fontSize: '12px',
      fontWeight: '500',
      marginLeft: '8px',
      display: 'none',
      verticalAlign: 'middle',
    },
  })

  private 描述 = 创建元素('p', {
    style: {
      margin: '8px 0 16px 0',
      color: 'var(--次要文字颜色)',
      fontSize: '14px',
      lineHeight: '1.5',
      width: '75%',
      wordBreak: 'break-word',
    },
  })

  private 标签容器 = 创建元素('div', {
    style: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '16px' },
  })

  private 底部信息行 = 创建元素('div', {
    style: { display: 'flex', gap: '16px', alignItems: 'center', color: 'var(--次要文字颜色)', fontSize: '12px' },
  })

  private 语言颜色圆点 = 创建元素('span', {
    style: {
      display: 'inline-block',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      marginRight: '4px',
      verticalAlign: 'middle',
    },
  })
  private 语言文本 = 创建元素('span')
  private 语言容器 = 创建元素('span', { style: { display: 'none', alignItems: 'center' } })

  private 星星数 = 创建元素('span')
  private 星星容器 = 创建元素('a', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      color: 'var(--次要文字颜色)',
      textDecoration: 'none',
      cursor: 'pointer',
    },
    onmouseover: (e) => ((e.currentTarget as HTMLElement).style.color = '#58a6ff'),
    onmouseout: (e) => ((e.currentTarget as HTMLElement).style.color = 'var(--次要文字颜色)'),
  })

  private 更新时间 = 创建元素('span')

  private 当前数据: 仓库卡片数据 | null = null

  protected override async 当加载时(): Promise<void> {
    let 宿主样式 = this.获得宿主样式()
    宿主样式.display = 'block'
    宿主样式.borderBottom = '1px solid var(--边框颜色)'
    宿主样式.cursor = 'pointer' // 增加可点击的提示

    let 顶栏 = 创建元素('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '4px' } })

    let 标题h4 = 创建元素('h3', { style: { margin: '0', display: 'flex', alignItems: 'center' } })
    // Some repository names might include the owner, e.g., 'owner/repo'.
    // GitHub bolds the repo name part.
    标题h4.appendChild(this.标题链接)
    标题h4.appendChild(this.公开私有徽章)
    标题h4.appendChild(this.分支徽章)

    顶栏.appendChild(标题h4)

    this.语言容器.appendChild(this.语言颜色圆点)
    this.语言容器.appendChild(this.语言文本)

    this.星星容器.innerHTML = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path></svg>`
    this.星星容器.appendChild(this.星星数)

    this.底部信息行.appendChild(this.语言容器)
    this.底部信息行.appendChild(this.星星容器)
    this.底部信息行.appendChild(this.更新时间)

    let 卡片容器 = 创建元素('div', {
      style: { padding: '24px 12px', boxSizing: 'border-box', userSelect: 'none' },
      onclick: (e) => {
        let target = e.target as HTMLElement
        // 防止点击链接或按钮时触发卡片选择
        if (
          target.closest('a') !== null ||
          target.closest('button') !== null ||
          target.closest('span[onclick]') !== null
        ) {
          return
        }
        if (this.当前数据 !== null) {
          this.派发事件('点击卡片', { repoId: this.当前数据.id, ctrlKey: e.ctrlKey || e.metaKey, shiftKey: e.shiftKey })
        }
      },
      oncontextmenu: (e) => {
        let target = e.target as HTMLElement
        if (
          target.closest('a') !== null ||
          target.closest('button') !== null ||
          target.closest('span[onclick]') !== null
        ) {
          return
        }
        e.preventDefault()
        if (this.当前数据 !== null) {
          this.派发事件('右键点击卡片', { repoId: this.当前数据.id, clientX: e.clientX, clientY: e.clientY })
        }
      },
    })

    卡片容器.appendChild(顶栏)
    卡片容器.appendChild(this.描述)
    卡片容器.appendChild(this.标签容器)
    卡片容器.appendChild(this.底部信息行)

    this.shadow.appendChild(卡片容器)
  }

  public 设置选中(是否选中: boolean): void {
    if (是否选中) {
      this.获得宿主样式().background = 'rgba(56, 139, 253, 0.1)'
    } else {
      this.获得宿主样式().background = 'transparent'
    }
  }

  public 设置数据(data: 仓库卡片数据): void {
    this.当前数据 = data

    // Parse owner/repo to style them differently if needed.
    // For now just display fullName
    let nameParts = data.fullName.split('/')
    if (nameParts.length === 2) {
      // Just repo name if we want, or owner / repo
      this.标题链接.textContent = nameParts[1] ?? ''
    } else {
      this.标题链接.textContent = data.fullName
    }

    this.标题链接.href = data.url
    this.星星数.textContent = data.stars.toString()
    this.星星容器.href = `${data.url}/stargazers`
    this.星星容器.target = '_blank'

    this.描述.textContent = data.description !== '' ? data.description : ''
    this.描述.style.display = data.description !== '' ? 'block' : 'none'

    this.公开私有徽章.textContent = data.isPrivate ? 'Private' : 'Public'

    if (data.isFork) {
      this.分支徽章.textContent = 'Fork'
      this.分支徽章.style.display = 'inline-block'
    } else {
      this.分支徽章.style.display = 'none'
    }

    if (data.language !== '') {
      this.语言容器.style.display = 'flex'
      this.语言文本.textContent = data.language
      this.语言颜色圆点.style.backgroundColor = 获取语言颜色(data.language)
    } else {
      this.语言容器.style.display = 'none'
    }

    this.更新时间.textContent = 格式化相对时间(data.githubUpdatedAt)

    this.标签容器.innerHTML = ''

    for (let tag of data.tags) {
      let tagSpan = 创建元素('span', {
        style: {
          background: 'rgba(56,139,253,0.1)',
          color: '#58a6ff',
          padding: '4px 10px',
          borderRadius: '2em',
          fontSize: '12px',
          fontWeight: '500',
          transition: 'background 0.2s',
          cursor: 'pointer',
        },
        onmouseover: (e) => ((e.target as HTMLElement).style.background = 'rgba(56,139,253,0.2)'),
        onmouseout: (e) => ((e.target as HTMLElement).style.background = 'rgba(56,139,253,0.1)'),
      })
      tagSpan.onclick = (): void => {
        this.派发事件('点击标签', { tag })
      }
      tagSpan.textContent = tag
      this.标签容器.appendChild(tagSpan)
    }

    // Since it's like github, adding a tag shouldn't just be an empty button, but we can keep it subtle
    // Actually we can add it dynamically or keep the existing subtle add button
    let addBtn = 创建元素('button', {
      style: {
        border: 'none',
        background: 'rgba(128,128,128,0.1)',
        cursor: 'pointer',
        color: 'var(--次要文字颜色)',
        fontSize: '12px',
        padding: '4px 10px',
        borderRadius: '2em',
        transition: 'all 0.2s',
      },
      onmouseover: (e) => {
        let el = e.currentTarget as HTMLElement
        el.style.color = '#58a6ff'
        el.style.background = 'rgba(56,139,253,0.15)'
      },
      onmouseout: (e) => {
        let el = e.currentTarget as HTMLElement
        el.style.color = 'var(--次要文字颜色)'
        el.style.background = 'rgba(128,128,128,0.1)'
      },
    })
    addBtn.innerHTML =
      '<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" style="vertical-align: middle;"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"></path></svg>'
    addBtn.title = '添加标签'
    addBtn.onclick = (): void => {
      if (this.当前数据 !== null) {
        void this.展示修改标签弹窗()
      }
    }

    // Only show add button if there are tags or just always show? Always show is fine.
    this.标签容器.appendChild(addBtn)

    // If no tags and no description, margin adjustment
    if (data.tags.length === 0) {
      this.标签容器.style.marginBottom = '8px'
    }
  }

  private async 展示修改标签弹窗(): Promise<void> {
    if (this.当前数据 === null) return
    let tags = [...this.当前数据.tags]

    let container = 创建元素('div', {
      style: { display: 'flex', flexDirection: 'column', gap: '20px', padding: '12px 4px 4px 4px' },
    })

    let tagsContainer = 创建元素('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        minHeight: '80px',
        padding: '12px',
        background: 'var(--次要背景颜色)',
        borderRadius: '6px',
        alignContent: 'flex-start',
      },
    })

    let 渲染标签 = (): void => {
      tagsContainer.innerHTML = ''
      if (tags.length === 0) {
        tagsContainer.innerHTML =
          '<div style="color: var(--次要文字颜色); font-size: 13px; width: 100%; text-align: center; margin-top: 10px;">暂无标签</div>'
      } else {
        tags.forEach((tag, index) => {
          let tagSpan = 创建元素('span', {
            style: {
              background: 'var(--主要背景颜色)',
              color: 'var(--文本颜色)',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '13px',
              border: '1px solid var(--边框颜色)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            },
          })
          tagSpan.textContent = tag

          let delBtn = 创建元素('span', {
            style: { cursor: 'pointer', color: 'var(--警告颜色)', fontWeight: 'bold' },
            onclick: () => {
              tags.splice(index, 1)
              渲染标签()
            },
          })
          delBtn.textContent = '×'
          tagSpan.appendChild(delBtn)
          tagsContainer.appendChild(tagSpan)
        })
      }
    }
    渲染标签()

    let 添加标签逻辑 = (): void => {
      let val = input.获得值().trim()
      if (val !== '') {
        let newTags = val
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t !== '')

        for (let t of newTags) {
          if (!tags.includes(t)) tags.push(t)
        }
        渲染标签()
        input.设置值('')
      }
      input.聚焦()
    }

    let addRow = 创建元素('div', { style: { display: 'flex', gap: '8px' } })
    let input = new 普通输入框({
      占位符: '输入标签 (支持逗号分隔多个)',
      宿主样式: { flex: '1' },
      回车处理函数: 添加标签逻辑,
    })
    let addBtn = new 普通按钮({ 文本: '添加', 点击处理函数: 添加标签逻辑 })
    addRow.appendChild(input)
    addRow.appendChild(addBtn)

    let submitBtn = new 主要按钮({
      文本: '保存并同步到 GitHub',
      元素样式: { marginTop: '16px', width: '100%' },
      点击处理函数: async (): Promise<void> => {
        if (this.当前数据 === null) return
        try {
          // 在保存前，自动应用输入框中尚未添加的标签
          添加标签逻辑()

          submitBtn.设置文本('保存中...')
          submitBtn.获得宿主样式().pointerEvents = 'none'
          submitBtn.获得宿主样式().opacity = '0.6'

          await API管理器.请求postJson并处理错误('/api/project/repo/update-tags', { repoId: this.当前数据.id, tags })

          成功提示('标签更新成功')
          await 关闭模态框()

          // 局部刷新数据
          this.当前数据.tags = tags
          this.设置数据(this.当前数据)

          // 触发左侧 fca 树刷新
          window.dispatchEvent(new CustomEvent('fca-tree-should-refresh'))
        } catch (e) {
          console.error(e)
          submitBtn.设置文本('保存并同步到 GitHub')
          submitBtn.获得宿主样式().pointerEvents = 'auto'
          submitBtn.获得宿主样式().opacity = '1'
        }
      },
    })

    container.appendChild(tagsContainer)
    container.appendChild(addRow)
    container.appendChild(submitBtn)

    await 显示模态框({ 标题: '修改标签', 可关闭: true, 宽度: '500px' }, container)
    setTimeout(() => {
      input.聚焦()
    }, 100)
  }
}
