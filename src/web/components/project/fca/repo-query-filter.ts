import { 创建元素 } from '../../../global/tools/create-element'
import { 普通按钮 } from '../../general/base/base-button'
import { 普通输入框 } from '../../general/form/form-input'
import { 普通下拉框 } from '../../general/form/form-select'

export type 查询过滤状态 = {
  keyword: string
  tagsString: string
  hasTags: 'All' | 'Yes' | 'No'
  visibility: 'All' | 'Public' | 'Private'
  isFork: 'All' | 'Yes' | 'No'
  sort: 'stars' | 'updated_at' | 'full_name'
  order: 'desc' | 'asc'
}

export class 仓库查询过滤栏 {
  private 过滤项容器 = 创建元素('div', {
    style: { display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' },
  })

  private 搜索输入框: 普通输入框
  private 标签输入框: 普通输入框
  private 是否有标签下拉框: 普通下拉框
  private 公开私有筛选下拉框: 普通下拉框
  private 是否Fork下拉框: 普通下拉框
  private 排序下拉框: 普通下拉框
  private 方向下拉框: 普通下拉框

  public constructor(
    private 状态: 查询过滤状态,
    private 触发搜索: () => void,
  ) {
    this.搜索输入框 = new 普通输入框({
      占位符: '多个关键词用空格隔开',
      元素样式: { flex: '1', minWidth: '150px' },
      输入处理函数: (值): void => {
        this.状态.keyword = 值
        this.触发搜索()
      },
    })

    this.标签输入框 = new 普通输入框({
      占位符: '多个标签值用空格隔开',
      元素样式: { flex: '1', minWidth: '150px' },
      输入处理函数: (值): void => {
        this.状态.tagsString = 值
        this.触发搜索()
      },
    })

    this.是否有标签下拉框 = new 普通下拉框({
      选项列表: [
        { 值: 'All', 文本: '全部' },
        { 值: 'Yes', 文本: '是' },
        { 值: 'No', 文本: '否' },
      ],
      值: 'All',
      变化处理函数: (值): void => {
        this.状态.hasTags = 值 as 'All' | 'Yes' | 'No'
        this.触发搜索()
      },
      元素样式: { width: '80px' },
    })

    this.公开私有筛选下拉框 = new 普通下拉框({
      选项列表: [
        { 值: 'All', 文本: '全部' },
        { 值: 'Public', 文本: '公开' },
        { 值: 'Private', 文本: '私有' },
      ],
      值: 'All',
      变化处理函数: (值): void => {
        this.状态.visibility = 值 as 'All' | 'Public' | 'Private'
        this.触发搜索()
      },
      元素样式: { width: '80px' },
    })

    this.是否Fork下拉框 = new 普通下拉框({
      选项列表: [
        { 值: 'All', 文本: '全部' },
        { 值: 'Yes', 文本: '是' },
        { 值: 'No', 文本: '否' },
      ],
      值: 'All',
      变化处理函数: (值): void => {
        this.状态.isFork = 值 as 'All' | 'Yes' | 'No'
        this.触发搜索()
      },
      元素样式: { width: '80px' },
    })

    this.排序下拉框 = new 普通下拉框({
      选项列表: [
        { 值: 'stars', 文本: 'Stars' },
        { 值: 'updated_at', 文本: '更新时间' },
        { 值: 'full_name', 文本: '仓库名' },
      ],
      值: 'updated_at',
      变化处理函数: (值): void => {
        this.状态.sort = 值 as 'updated_at' | 'full_name' | 'stars'
        this.触发搜索()
      },
      元素样式: { width: '150px' },
    })

    this.方向下拉框 = new 普通下拉框({
      选项列表: [
        { 值: 'desc', 文本: '降序' },
        { 值: 'asc', 文本: '升序' },
      ],
      值: 'desc',
      变化处理函数: (值): void => {
        this.状态.order = 值 as 'asc' | 'desc'
        this.触发搜索()
      },
      元素样式: { width: '100px' },
    })

    let 创建普通文字 = (text: string): HTMLElement => {
      let el = 创建元素('div', { style: { color: 'var(--次要文字颜色)', fontSize: '13px', whiteSpace: 'nowrap' } })
      el.textContent = text
      return el
    }

    let 创建过滤组 = (标题: string, 元素列表: HTMLElement[]): HTMLElement => {
      let group = 创建元素('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--次要背景颜色)',
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px solid var(--边框颜色)',
        },
      })
      let title = 创建元素('div', {
        style: { fontWeight: 'bold', color: 'var(--主色调)', fontSize: '13px', whiteSpace: 'nowrap' },
      })
      title.textContent = 标题
      group.appendChild(title)
      for (let el of 元素列表) group.appendChild(el)
      return group
    }

    this.过滤项容器.appendChild(
      创建过滤组('搜索', [创建普通文字('仓库名:'), this.搜索输入框, 创建普通文字('标签值:'), this.标签输入框]),
    )
    this.过滤项容器.appendChild(
      创建过滤组('筛选', [
        创建普通文字('有无标签:'),
        this.是否有标签下拉框,
        创建普通文字('公开/私有:'),
        this.公开私有筛选下拉框,
        创建普通文字('是否Fork:'),
        this.是否Fork下拉框,
      ]),
    )
    this.过滤项容器.appendChild(创建过滤组('排序', [创建普通文字('字段:'), this.排序下拉框, this.方向下拉框]))

    let 清空按钮 = new 普通按钮({
      文本: '清空条件',
      点击处理函数: (): void => {
        this.状态.keyword = ''
        this.状态.tagsString = ''
        this.状态.hasTags = 'All'
        this.状态.visibility = 'All'
        this.状态.isFork = 'All'
        this.状态.sort = 'updated_at'
        this.状态.order = 'desc'

        this.同步界面到状态()
        this.触发搜索()
      },
    })
    this.过滤项容器.appendChild(清空按钮)

    this.同步界面到状态()
  }

  public 获得元素(): HTMLElement {
    return this.过滤项容器
  }

  public 同步界面到状态(): void {
    this.搜索输入框.设置值(this.状态.keyword)
    this.标签输入框.设置值(this.状态.tagsString)
    this.是否有标签下拉框.设置值(this.状态.hasTags)
    this.公开私有筛选下拉框.设置值(this.状态.visibility)
    this.是否Fork下拉框.设置值(this.状态.isFork)
    this.排序下拉框.设置值(this.状态.sort)
    this.方向下拉框.设置值(this.状态.order)
  }
}
