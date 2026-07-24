import { 组件基类 } from '../../../base/base'
import { API管理器 } from '../../../global/manager/api-manager'
import { 关闭模态框, 显示模态框 } from '../../../global/manager/modal-manager'
import { 信息提示, 成功提示, 错误提示 } from '../../../global/manager/toast-manager'
import { 创建元素 } from '../../../global/tools/create-element'
import { 日志组件 } from '../../general/log/log'

type 发出事件类型 = {}
type 监听事件类型 = {}

export class 服务商管理组件 extends 组件基类<发出事件类型, 监听事件类型> {
  static {
    this.注册组件('provider-manager', this)
  }

  private API管理器 = API管理器
  private 已配置列表: { id: string; providerType: string }[] = []

  // DOM Refs
  private 列表容器 = 创建元素('div', {
    style: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' },
  })
  private token输入框 = 创建元素('input', { type: 'password', placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx' })
  private 编辑ID = ''

  protected override async 当加载时(): Promise<void> {
    this.获得宿主样式().padding = '32px'
    this.获得宿主样式().display = 'block'
    this.获得宿主样式().backgroundColor = 'var(--背景颜色)'
    this.获得宿主样式().height = '100%'
    this.获得宿主样式().boxSizing = 'border-box'
    this.获得宿主样式().overflowY = 'auto'

    let 标题 = 创建元素('h2', {
      textContent: '已配置的服务商',
      style: { marginTop: '0', marginBottom: '20px', color: 'var(--文本颜色)' },
    })

    // 表单区
    let 表单标题 = 创建元素('h2', {
      textContent: '添加 / 编辑服务商',
      style: {
        marginBottom: '20px',
        color: 'var(--文本颜色)',
        borderTop: '1px solid var(--边框颜色)',
        paddingTop: '32px',
      },
    })

    let 表单卡片 = 创建元素('div', {
      style: {
        backgroundColor: 'var(--主要背景颜色)',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid var(--边框颜色)',
        boxShadow: '0 2px 8px var(--深阴影颜色)',
        maxWidth: '600px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      },
    })

    // 服务商类型
    let 类型行 = 创建元素('div')
    类型行.innerHTML = `<label style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: bold; color: var(--次要文字颜色); font-size: 14px;">
        <span>服务商类型</span>
        <a href="https://github.com/settings/tokens" target="_blank" style="color: var(--主色调); text-decoration: none; font-size: 13px; font-weight: normal;">获取 Token ↗</a>
      </label>
      <select style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--边框颜色); background: var(--输入框背景); color: var(--文本颜色); font-size: 14px; outline: none;">
        <option value="GitHub">GitHub</option>
      </select>
    `

    // Token
    let token行 = 创建元素('div')
    let tokenLabel = 创建元素('label', {
      textContent: 'Personal Access Token',
      style: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: 'bold',
        color: 'var(--次要文字颜色)',
        fontSize: '14px',
      },
    })
    this.token输入框.style.cssText =
      'width: 100%; box-sizing: border-box; padding: 12px; border-radius: 8px; border: 1px solid var(--边框颜色); background: var(--输入框背景); color: var(--文本颜色); font-size: 14px; transition: border-color 0.2s, box-shadow 0.2s; outline: none;'
    this.token输入框.onfocus = (): void => {
      this.token输入框.style.borderColor = 'var(--主色调)'
      this.token输入框.style.boxShadow = '0 0 0 2px rgba(24, 144, 255, 0.2)'
    }
    this.token输入框.onblur = (): void => {
      this.token输入框.style.borderColor = 'var(--边框颜色)'
      this.token输入框.style.boxShadow = 'none'
    }
    token行.append(tokenLabel, this.token输入框)

    // 选项行被移除

    // 按钮
    let 按钮行 = 创建元素('div', { style: { marginTop: '10px' } })
    let 保存按钮 = 创建元素('button', {
      textContent: '保存配置',
      style: {
        padding: '12px 24px',
        backgroundColor: 'var(--主色调)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px',
        transition: 'opacity 0.2s',
      },
    })
    保存按钮.onmouseover = (): void => {
      保存按钮.style.opacity = '0.8'
    }
    保存按钮.onmouseout = (): void => {
      保存按钮.style.opacity = '1'
    }
    保存按钮.onclick = (): void => {
      void this.保存配置()
    }
    按钮行.append(保存按钮)

    表单卡片.append(类型行, token行, 按钮行)

    this.shadow.append(标题, this.列表容器, 表单标题, 表单卡片)

    await this.刷新列表()
  }

  private async 刷新列表(): Promise<void> {
    this.列表容器.innerHTML = ''
    try {
      let res = await this.API管理器.请求postJson并处理错误('/api/project/provider/list', {})
      this.已配置列表 = res.providers
      if (this.已配置列表.length === 0) {
        let 空提示 = 创建元素('div', {
          textContent: '暂无配置的服务商。',
          style: { color: 'var(--次要文字颜色)', fontSize: '14px', padding: '20px 0' },
        })
        this.列表容器.append(空提示)
      } else {
        for (let 项 of this.已配置列表) {
          this.渲染卡片(项)
        }
      }
    } catch (_e) {
      错误提示('获取列表失败')
    }
  }

  private 渲染卡片(项: { id: string; providerType: string }): void {
    let 卡片 = 创建元素('div', {
      style: {
        backgroundColor: 'var(--卡片背景颜色)',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid var(--边框颜色)',
        boxShadow: '0 2px 8px var(--深阴影颜色)',
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      },
    })

    let 头部 = 创建元素('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } })
    let 名字 = 创建元素('h3', {
      textContent: 项.providerType,
      style: { margin: '0', color: 'var(--文本颜色)', fontSize: '18px' },
    })
    头部.append(名字)

    let 操作区 = 创建元素('div', { style: { display: 'flex', gap: '12px', marginTop: 'auto' } })
    let 同步按钮 = 创建元素('button', {
      textContent: '立即同步',
      style: {
        flex: '1',
        padding: '8px',
        cursor: 'pointer',
        backgroundColor: 'var(--成功颜色)',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 'bold',
        transition: 'opacity 0.2s',
      },
    })
    同步按钮.onmouseover = (): void => {
      同步按钮.style.opacity = '0.8'
    }
    同步按钮.onmouseout = (): void => {
      同步按钮.style.opacity = '1'
    }
    同步按钮.onclick = (): void => {
      if (同步按钮.disabled === true) return
      void (async (): Promise<void> => {
        let 原文字 = 同步按钮.textContent
        let 原背景 = 同步按钮.style.backgroundColor
        let 同步日志 = new 日志组件()
        同步日志.获得宿主样式().width = '100%'
        同步日志.获得宿主样式().height = '100%'

        try {
          同步按钮.disabled = true
          同步按钮.style.backgroundColor = 'var(--禁用背景)'
          同步按钮.style.color = 'var(--次要文字颜色)'
          同步按钮.style.cursor = 'not-allowed'
          同步按钮.textContent = '准备同步...'

          let 日志容器 = 创建元素('div', {
            style: { width: '100%', height: '100%', padding: '16px', boxSizing: 'border-box' },
          })
          日志容器.appendChild(同步日志)

          void 显示模态框({ 标题: '同步进度', 可关闭: true, 宽度: '70vw', 高度: '60vh' }, 日志容器)

          同步日志.添加日志('=== 开始同步服务商数据 ===')

          let res = await this.API管理器.请求postJson并处理错误(
            '/api/project/provider/sync',
            { providerId: 项.id },
            async (wsData: { message: string }) => {
              同步按钮.textContent = wsData.message
              同步日志.添加日志(wsData.message)
            },
          )

          同步按钮.textContent = String(res.message)
          同步日志.添加日志('=> ' + String(res.message))
          同步按钮.style.backgroundColor = 'var(--成功颜色)'
          同步按钮.style.color = 'white'

          window.dispatchEvent(new CustomEvent('fca-tree-should-refresh'))
          window.dispatchEvent(new CustomEvent('fca-list-should-refresh'))

          setTimeout(() => {
            同步按钮.disabled = false
            同步按钮.textContent = 原文字
            同步按钮.style.backgroundColor = 原背景
            同步按钮.style.cursor = 'pointer'
            void 关闭模态框()
          }, 3000)
        } catch (_e) {
          同步按钮.disabled = false
          同步按钮.textContent = 原文字
          同步按钮.style.backgroundColor = 原背景
          同步按钮.style.color = 'white'
          同步按钮.style.cursor = 'pointer'
          错误提示('发起同步失败')
          同步日志.添加日志('=> 发起同步失败: ' + String(_e))
        }
      })()
    }

    let 编辑按钮 = 创建元素('button', {
      textContent: '编辑',
      style: {
        padding: '8px 16px',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        color: 'var(--文本颜色)',
        border: '1px solid var(--边框颜色)',
        borderRadius: '6px',
        fontSize: '13px',
        transition: 'all 0.2s',
      },
    })
    编辑按钮.onmouseover = (): void => {
      编辑按钮.style.backgroundColor = 'var(--悬浮背景颜色)'
    }
    编辑按钮.onmouseout = (): void => {
      编辑按钮.style.backgroundColor = 'transparent'
    }
    编辑按钮.onclick = (): void => {
      this.编辑ID = 项.id
      this.token输入框.value = '********'

      信息提示('进入编辑模式，请重新输入 Token 后保存')
      this.token输入框.focus()
    }

    操作区.append(同步按钮, 编辑按钮)
    卡片.append(头部, 操作区)
    this.列表容器.append(卡片)
  }

  private async 保存配置(): Promise<void> {
    let token = this.token输入框.value.trim()
    if (token === '') {
      错误提示('请填写 Token')
      return
    }
    try {
      await this.API管理器.请求postJson并处理错误('/api/project/provider/save', {
        id: this.编辑ID !== '' ? this.编辑ID : undefined,
        providerType: 'GitHub',
        token,
      })
      成功提示('保存成功')
      this.token输入框.value = ''
      this.编辑ID = ''
      await this.刷新列表()
    } catch {
      错误提示('保存失败')
    }
  }
}
