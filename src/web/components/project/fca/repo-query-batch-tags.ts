import { API管理器 } from '../../../global/manager/api-manager'
import { 关闭模态框, 显示模态框 } from '../../../global/manager/modal-manager'
import { 成功提示 } from '../../../global/manager/toast-manager'
import { 创建元素 } from '../../../global/tools/create-element'
import { 主要按钮, 普通按钮 } from '../../general/base/base-button'
import { 普通输入框 } from '../../general/form/form-input'
import { 仓库卡片数据, 仓库卡片组件 } from './repo-card'
import { 查询过滤状态 } from './repo-query-filter'

export async function 展示批量修改标签弹窗(
  选中的仓库IDs: Set<string>,
  当前显示的卡片数据: 仓库卡片数据[],
  当前显示的卡片组件: 仓库卡片组件[],
  状态: 查询过滤状态,
  回调: { 从界面移除卡片: (ids: string[]) => void; 清空选中: () => void },
): Promise<void> {
  if (选中的仓库IDs.size === 0) return

  let 选中的数据列表 = 当前显示的卡片数据.filter((i) => 选中的仓库IDs.has(i.id))
  let tags: string[] = []
  if (选中的数据列表.length > 0) {
    if (选中的数据列表[0] !== undefined) {
      tags = [...选中的数据列表[0].tags]
      for (let i = 1; i < 选中的数据列表.length; i++) {
        let currentItem = 选中的数据列表[i]
        if (currentItem !== undefined) {
          tags = tags.filter((t) => currentItem.tags.includes(t))
        }
      }
    }
  }
  let 初始公共标签 = [...tags]

  let container = 创建元素('div', {
    style: { display: 'flex', flexDirection: 'column', gap: '20px', padding: '12px 4px 4px 4px' },
  })

  let desc = 创建元素('div', { style: { color: 'var(--次要文字颜色)', fontSize: '13px' } })
  if (选中的仓库IDs.size === 1) {
    desc.textContent = `编辑该仓库的标签:`
  } else {
    desc.textContent = `编辑选中的 ${选中的仓库IDs.size} 个仓库的公共标签 (不影响各自独有的标签):`
  }
  container.appendChild(desc)

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
        '<div style="color: var(--次要文字颜色); font-size: 13px; width: 100%; text-align: center; margin-top: 10px;">暂未添加标签</div>'
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
    占位符: '输入要添加的标签 (支持逗号分隔多个)',
    宿主样式: { flex: '1' },
    回车处理函数: 添加标签逻辑,
  })
  let addBtn = new 普通按钮({ 文本: '添加', 点击处理函数: 添加标签逻辑 })
  addRow.appendChild(input)
  addRow.appendChild(addBtn)

  let submitBtn = new 主要按钮({
    文本: '保存并同步',
    元素样式: { marginTop: '16px', width: '100%' },
    点击处理函数: async (): Promise<void> => {
      try {
        添加标签逻辑()

        submitBtn.设置文本('保存中...')
        submitBtn.获得宿主样式().pointerEvents = 'none'
        submitBtn.获得宿主样式().opacity = '0.6'

        let 选中的组件列表 = 当前显示的卡片组件.filter((_, idx) => {
          let data = 当前显示的卡片数据[idx]
          return data !== undefined && 选中的仓库IDs.has(data.id)
        })

        let addedTags = tags.filter((t) => !初始公共标签.includes(t))
        let removedTags = 初始公共标签.filter((t) => !tags.includes(t))

        let completed = 0
        let 需要移除的IDs: string[] = []
        for (let i = 0; i < 选中的数据列表.length; i++) {
          let item = 选中的数据列表[i]
          let card = 选中的组件列表[i]
          if (item === undefined || card === undefined) continue

          let currentTags = item.tags
          let newTags = currentTags.filter((t) => !removedTags.includes(t))
          newTags = Array.from(new Set([...newTags, ...addedTags]))

          let tagsChanged =
            currentTags.length !== newTags.length ||
            currentTags.some((t) => !newTags.includes(t)) ||
            newTags.some((t) => !currentTags.includes(t))

          if (tagsChanged) {
            await API管理器.请求postJson并处理错误('/api/project/repo/update-tags', { repoId: item.id, tags: newTags })

            item.tags = newTags
            card.设置数据(item)

            let 应该移除 = false
            if (状态.hasTags === 'No' && item.tags.length > 0) 应该移除 = true
            if (状态.hasTags === 'Yes' && item.tags.length === 0) 应该移除 = true
            let requiredTags = 状态.tagsString.split(/\s+/).filter((t: string) => t.trim() !== '')
            if (requiredTags.length > 0) {
              let hasAllRequiredTags = requiredTags.every((t) => item.tags.includes(t))
              if (!hasAllRequiredTags) 应该移除 = true
            }
            if (应该移除) {
              需要移除的IDs.push(item.id)
            }
          }

          completed++
          submitBtn.设置文本(`保存中... (${completed}/${选中的数据列表.length})`)
        }

        if (需要移除的IDs.length > 0) {
          回调.从界面移除卡片(需要移除的IDs)
        }

        成功提示('保存标签成功')
        回调.清空选中()

        await 关闭模态框()
        window.dispatchEvent(new CustomEvent('fca-tree-should-refresh'))
      } catch (e) {
        console.error(e)
        submitBtn.设置文本('保存并同步')
        submitBtn.获得宿主样式().pointerEvents = 'auto'
        submitBtn.获得宿主样式().opacity = '1'
      }
    },
  })

  container.appendChild(tagsContainer)
  container.appendChild(addRow)
  container.appendChild(submitBtn)

  await 显示模态框({ 标题: '批量修改标签', 可关闭: true, 宽度: '500px' }, container)
  setTimeout(() => {
    input.聚焦()
  }, 100)
}
