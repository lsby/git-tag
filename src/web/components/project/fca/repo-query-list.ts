import { 组件基类 } from '../../../base/base'
import { API管理器 } from '../../../global/manager/api-manager'
import { 显示确认对话框 } from '../../../global/manager/dialog-manager'
import { 创建元素 } from '../../../global/tools/create-element'
import { 仓库卡片数据, 仓库卡片组件 } from './repo-card'
import { 展示批量修改标签弹窗 } from './repo-query-batch-tags'
import { 仓库查询右键菜单 } from './repo-query-context-menu'
import { 仓库查询过滤栏, 查询过滤状态 } from './repo-query-filter'

type 发出事件类型 = {}
type 监听事件类型 = {}

export class 仓库查询列表组件 extends 组件基类<发出事件类型, 监听事件类型> {
  static {
    this.注册组件('repo-query-list', this)
  }

  private API管理器 = API管理器

  private 状态: 查询过滤状态 & { page: number; pageSize: number; total: number } = {
    keyword: '',
    tagsString: '',
    hasTags: 'All',
    visibility: 'All',
    isFork: 'All',
    sort: 'updated_at',
    order: 'desc',
    page: 1,
    pageSize: 10,
    total: 0,
  }

  private 列表容器 = 创建元素('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '24px',
      overflowY: 'auto',
      flex: '1',
      background: 'var(--主要背景颜色)',
    },
  })

  private 过滤栏 = new 仓库查询过滤栏(this.状态, (): void => {
    this.用户手动修改筛选()
  })

  private 右键菜单 = new 仓库查询右键菜单(
    (): Set<string> => this.选中的仓库IDs,
    (): 仓库卡片数据[] => this.当前显示的卡片数据,
    {
      全选: (): void => {
        this.当前显示的卡片数据.forEach((i) => this.选中的仓库IDs.add(i.id))
        this.更新卡片选中样式()
      },
      重绘卡片: (数据: 仓库卡片数据): void => this.重绘卡片数据(数据),
      展示批量修改标签: (): void => {
        void 展示批量修改标签弹窗(this.选中的仓库IDs, this.当前显示的卡片数据, this.当前显示的卡片组件, this.状态, {
          从界面移除卡片: (ids) => this.从界面移除卡片(ids),
          清空选中: () => {
            this.选中的仓库IDs.clear()
            this.上次点击的仓库ID = null
            this.更新卡片选中样式()
          },
        })
      },
      从界面移除卡片: (ids: string[]): void => this.从界面移除卡片(ids),
      清空选中: (): void => {
        this.选中的仓库IDs.clear()
        this.上次点击的仓库ID = null
        this.更新卡片选中样式()
      },
      根据筛选条件移除或重绘卡片: (数据: 仓库卡片数据): void => {
        let visibility = this.状态.visibility
        if (visibility === 'Public' && 数据.isPrivate) {
          this.从界面移除卡片([数据.id])
          this.选中的仓库IDs.delete(数据.id)
          this.更新卡片选中样式()
        } else if (visibility === 'Private' && !数据.isPrivate) {
          this.从界面移除卡片([数据.id])
          this.选中的仓库IDs.delete(数据.id)
          this.更新卡片选中样式()
        } else {
          this.重绘卡片数据(数据)
        }
      },
    },
  )

  private 选中的仓库IDs = new Set<string>()
  private 上次点击的仓库ID: string | null = null
  private 当前显示的卡片数据: 仓库卡片数据[] = []
  private 当前显示的卡片组件: 仓库卡片组件[] = []

  private 正在加载下一页 = false
  private 防抖定时器: number | null = null
  private 全选正在执行 = false

  private 键盘快捷键监听器 = async (e: KeyboardEvent): Promise<void> => {
    // 确保当前组件已连接到 DOM 且可见
    if (!this.isConnected || this.获得宿主样式().display === 'none') return

    // 如果在一个输入框里，不要拦截，让其保留原有的全选行为
    let target = e.target as HTMLElement | null
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return

    if (e.ctrlKey && e.key.toLowerCase() === 'a') {
      e.preventDefault()

      if (this.全选正在执行) return
      this.全选正在执行 = true

      try {
        let 已加载数量 = this.当前显示的卡片数据.length
        let 总数量 = this.状态.total

        if (已加载数量 < 总数量) {
          let 还需要加载 = 总数量 - 已加载数量
          if (还需要加载 > 100) {
            let 确定 = await 显示确认对话框(
              `还有 ${还需要加载} 个仓库未加载，全选将加载所有剩余数据。\n如果数量过多可能会导致页面卡顿，确定要继续吗？`,
            )
            if (!确定) return
          }

          let 提示容器 = document.createElement('div')
          提示容器.style.position = 'absolute'
          提示容器.style.top = '0'
          提示容器.style.left = '0'
          提示容器.style.right = '0'
          提示容器.style.bottom = '0'
          提示容器.style.background = 'rgba(0,0,0,0.3)'
          提示容器.style.display = 'flex'
          提示容器.style.alignItems = 'center'
          提示容器.style.justifyContent = 'center'
          提示容器.style.zIndex = '9999'

          let 提示文字 = document.createElement('div')
          提示文字.style.background = 'var(--主要背景颜色)'
          提示文字.style.padding = '20px 30px'
          提示文字.style.borderRadius = '8px'
          提示文字.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
          提示文字.style.color = 'var(--文本颜色)'
          提示文字.textContent = `正在加载全部数据...`
          提示容器.appendChild(提示文字)

          this.shadow.appendChild(提示容器)

          try {
            while (this.状态.page * this.状态.pageSize < this.状态.total) {
              if (this.正在加载下一页) {
                await new Promise((r) => setTimeout(r, 100))
                continue
              }
              this.正在加载下一页 = true
              this.状态.page += 1
              提示文字.textContent = `正在加载全部数据... (${this.当前显示的卡片数据.length}/${总数量})`
              await this.加载数据(true)
              this.正在加载下一页 = false
            }
          } finally {
            if (this.shadow.contains(提示容器)) {
              this.shadow.removeChild(提示容器)
            }
          }
        }

        this.当前显示的卡片数据.forEach((i) => this.选中的仓库IDs.add(i.id))
        this.更新卡片选中样式()
      } finally {
        this.全选正在执行 = false
      }
    }
  }

  private 用户手动修改筛选(): void {
    window.dispatchEvent(new CustomEvent('fca-tree-clear-selection'))
    this.防抖加载数据()
  }

  private 防抖加载数据(): void {
    this.保存状态到本地()
    if (this.防抖定时器 !== null) clearTimeout(this.防抖定时器)
    this.防抖定时器 = window.setTimeout(() => {
      this.状态.page = 1
      void this.加载数据(false)
    }, 300)
  }

  private 保存状态到本地(): void {
    let savedState = {
      keyword: this.状态.keyword,
      tagsString: this.状态.tagsString,
      hasTags: this.状态.hasTags,
      visibility: this.状态.visibility,
      isFork: this.状态.isFork,
      sort: this.状态.sort,
      order: this.状态.order,
    }
    localStorage.setItem('repo-query-list-state', JSON.stringify(savedState))
  }

  private 从界面移除卡片(ids: string[] | Set<string>): void {
    let idSet = new Set(ids)

    for (let i = this.当前显示的卡片组件.length - 1; i >= 0; i--) {
      let data = this.当前显示的卡片数据[i]
      if (data !== undefined && idSet.has(data.id)) {
        let card = this.当前显示的卡片组件[i]
        if (card !== undefined) {
          this.列表容器.removeChild(card)
        }
        this.当前显示的卡片组件.splice(i, 1)
        this.当前显示的卡片数据.splice(i, 1)
      }
    }

    if (this.当前显示的卡片数据.length === 0) {
      this.列表容器.innerHTML = '<div style="color: var(--次要文字颜色); text-align: center;">暂无匹配仓库</div>'
    }
  }

  private 重绘卡片数据(数据: 仓库卡片数据): void {
    let index = this.当前显示的卡片数据.findIndex((i) => i.id === 数据.id)
    if (index !== -1) {
      let card = this.当前显示的卡片组件[index]
      if (card !== undefined) {
        card.设置数据(数据)
      }
    }
  }

  protected override async 当加载时(): Promise<void> {
    try {
      let saved = localStorage.getItem('repo-query-list-state')
      if (saved !== null) {
        let parsed = JSON.parse(saved) as unknown
        if (typeof parsed === 'object' && parsed !== null) {
          let p = parsed as Record<string, unknown>
          if (typeof p['keyword'] === 'string') this.状态.keyword = p['keyword']
          if (typeof p['tagsString'] === 'string') this.状态.tagsString = p['tagsString']
          if (p['hasTags'] === 'All' || p['hasTags'] === 'Yes' || p['hasTags'] === 'No')
            this.状态.hasTags = p['hasTags']
          if (p['visibility'] === 'All' || p['visibility'] === 'Public' || p['visibility'] === 'Private')
            this.状态.visibility = p['visibility']
          if (p['isFork'] === 'All' || p['isFork'] === 'Yes' || p['isFork'] === 'No') this.状态.isFork = p['isFork']
          if (p['sort'] === 'stars' || p['sort'] === 'updated_at' || p['sort'] === 'full_name')
            this.状态.sort = p['sort']
          if (p['order'] === 'desc' || p['order'] === 'asc') this.状态.order = p['order']
          this.过滤栏.同步界面到状态()
        }
      }
    } catch (_e: unknown) {}

    this.获得宿主样式().display = 'flex'
    this.获得宿主样式().flexDirection = 'column'
    this.获得宿主样式().height = '100%'
    this.获得宿主样式().position = 'relative'

    let 搜索容器 = 创建元素('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 24px',
        borderBottom: '1px solid var(--边框颜色)',
        background: 'var(--主要背景颜色)',
        zIndex: '10',
      },
    })

    搜索容器.appendChild(this.过滤栏.获得元素())

    this.右键菜单.挂载到(this.shadow)
    this.右键菜单.绑定滚动隐藏(this.列表容器)

    this.shadow.appendChild(搜索容器)
    this.shadow.appendChild(this.列表容器)

    // 绑定事件
    window.addEventListener('fca-tag-selected', (e: Event) => {
      let detail = (e as CustomEvent<{ tags: string[] }>).detail

      this.状态.tagsString = detail.tags.join(' ')
      this.过滤栏.同步界面到状态()

      this.保存状态到本地()
      this.状态.page = 1
      void this.加载数据(false)
    })

    this.列表容器.addEventListener('scroll', (): void => {
      let { scrollTop, scrollHeight, clientHeight } = this.列表容器
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        if (this.状态.page * this.状态.pageSize < this.状态.total && !this.正在加载下一页) {
          this.正在加载下一页 = true
          this.状态.page += 1
          this.加载数据(true)
            .finally((): void => {
              this.正在加载下一页 = false
            })
            .catch(() => {})
        }
      }
    })

    window.addEventListener('keydown', this.键盘快捷键监听器)

    await this.加载数据(false)
  }

  protected override async 当卸载时(): Promise<void> {
    window.removeEventListener('keydown', this.键盘快捷键监听器)
  }

  private async 加载数据(追加数据 = false): Promise<void> {
    try {
      if (!追加数据) {
        this.列表容器.innerHTML = '<div style="color: var(--次要文字颜色); text-align: center;">加载中...</div>'
      } else {
        let loadMore = 创建元素('div', {
          id: '加载更多提示',
          style: { color: 'var(--次要文字颜色)', textAlign: 'center', padding: '16px 0' },
        })
        loadMore.textContent = '加载中...'
        this.列表容器.appendChild(loadMore)
      }

      let tags = this.状态.tagsString.split(/\s+/).filter((t: string) => t.trim() !== '')
      let res = await this.API管理器.请求postJson并处理错误('/api/project/repo/search', {
        keyword: this.状态.keyword,
        tags: tags,
        hasTags: this.状态.hasTags,
        visibility: this.状态.visibility,
        isFork: this.状态.isFork,
        sort: this.状态.sort,
        order: this.状态.order,
        page: this.状态.page,
        pageSize: this.状态.pageSize,
      })

      if (追加数据) {
        let loadMore = this.列表容器.querySelector('#加载更多提示')
        if (loadMore !== null) loadMore.remove()
      }

      this.状态.total = res.total
      this.渲染列表(res.items, 追加数据)
    } catch (e: unknown) {
      console.error(e)
      if (!追加数据) {
        this.列表容器.innerHTML = '<div style="color: var(--警告颜色); text-align: center;">加载失败</div>'
      } else {
        let loadMore = this.列表容器.querySelector('#加载更多提示')
        if (loadMore !== null) loadMore.remove()
      }
    }
  }

  private 渲染列表(items: 仓库卡片数据[], 追加数据: boolean): void {
    if (!追加数据) {
      this.列表容器.innerHTML = ''
      this.当前显示的卡片数据 = []
      this.当前显示的卡片组件 = []
      this.选中的仓库IDs.clear()
      this.上次点击的仓库ID = null
      this.更新卡片选中样式()
    }

    if (items.length === 0 && !追加数据) {
      this.列表容器.innerHTML = '<div style="color: var(--次要文字颜色); text-align: center;">暂无匹配仓库</div>'
      return
    }

    for (let item of items) {
      let card = new 仓库卡片组件()
      this.当前显示的卡片数据.push(item)
      this.当前显示的卡片组件.push(card)

      this.列表容器.appendChild(card)

      card.addEventListener('点击标签', (e: Event) => {
        let detail = (e as CustomEvent<{ tag: string }>).detail
        let currentTags = this.状态.tagsString.split(/\s+/).filter((t: string) => t !== '')
        if (!currentTags.includes(detail.tag)) {
          currentTags.push(detail.tag)
          this.状态.tagsString = currentTags.join(' ')
          this.过滤栏.同步界面到状态()
          this.保存状态到本地()
          this.状态.page = 1
          this.用户手动修改筛选()
        }
      })

      card.addEventListener('点击卡片', (e: Event) => {
        let detail = (e as CustomEvent<{ repoId: string; ctrlKey: boolean; shiftKey: boolean }>).detail
        this.处理卡片点击(detail.repoId, detail.ctrlKey, detail.shiftKey)
      })

      card.addEventListener('右键点击卡片', (e: Event) => {
        let detail = (e as CustomEvent<{ repoId: string; clientX: number; clientY: number }>).detail

        if (!this.选中的仓库IDs.has(detail.repoId)) {
          this.选中的仓库IDs.clear()
          this.选中的仓库IDs.add(detail.repoId)
          this.上次点击的仓库ID = detail.repoId
          this.更新卡片选中样式()
        }

        this.右键菜单.显示(detail.clientX, detail.clientY)
      })

      // 需要等组件 mount 后才能调用设置数据，所以可以在下一个 microtask 设置
      queueMicrotask(() => {
        card.设置数据(item)
      })
    }

    this.更新卡片选中样式()
  }

  private 处理卡片点击(点击的ID: string, ctrlKey: boolean, shiftKey: boolean): void {
    if (shiftKey && this.上次点击的仓库ID !== null) {
      let startIndex = this.当前显示的卡片数据.findIndex((i) => i.id === this.上次点击的仓库ID)
      let endIndex = this.当前显示的卡片数据.findIndex((i) => i.id === 点击的ID)
      if (startIndex !== -1 && endIndex !== -1) {
        let start = Math.min(startIndex, endIndex)
        let end = Math.max(startIndex, endIndex)
        if (!ctrlKey) {
          this.选中的仓库IDs.clear()
        }
        for (let i = start; i <= end; i++) {
          let data = this.当前显示的卡片数据[i]
          if (data !== undefined) {
            this.选中的仓库IDs.add(data.id)
          }
        }
      }
    } else if (ctrlKey) {
      if (this.选中的仓库IDs.has(点击的ID)) {
        this.选中的仓库IDs.delete(点击的ID)
      } else {
        this.选中的仓库IDs.add(点击的ID)
      }
      this.上次点击的仓库ID = 点击的ID
    } else {
      this.选中的仓库IDs.clear()
      this.选中的仓库IDs.add(点击的ID)
      this.上次点击的仓库ID = 点击的ID
    }
    this.更新卡片选中样式()
  }

  private 更新卡片选中样式(): void {
    for (let i = 0; i < this.当前显示的卡片组件.length; i++) {
      let card = this.当前显示的卡片组件[i]
      let item = this.当前显示的卡片数据[i]
      if (card !== undefined && item !== undefined) {
        card.设置选中(this.选中的仓库IDs.has(item.id))
      }
    }
  }
}
