import { 环境变量 } from '../../../../global/env'
import { 组件基类 } from '../../../base/base'
import { API管理器 } from '../../../global/manager/api-manager'
import { 显示对话框, 显示确认对话框 } from '../../../global/manager/dialog-manager'
import { 主题管理器 } from '../../../global/manager/theme-manager'
import { 成功提示 } from '../../../global/manager/toast-manager'
import { 创建元素 } from '../../../global/tools/create-element'
import { 主要按钮, 危险按钮, 普通按钮 } from '../../general/base/base-button'
import { 表单, 表单组件基类, 表单项配置 } from '../../general/form/form'
import { 复选框 } from '../../general/form/form-checkbox'
import { 普通输入框 } from '../../general/form/form-input'
import { 单选框组 } from '../../general/form/form-radio-group'

type 设置事件 = {}
type 监听设置事件 = {}

type 系统配置数据 = {
  id: string
  enable_register: boolean
  enable_get_interface_type: boolean
  is_initialized: boolean
}
type 用户配置数据 = {
  id: string
  theme: '系统' | '亮色' | '暗色'
  clone_protocol?: 'https' | 'ssh'
  default_clone_path?: string
}

class 目录选择输入框 extends 表单组件基类<{}, {}, string> {
  private 输入框 = new 普通输入框({ 占位符: '例如 D:/Code' })
  public 设置值(值: string): void {
    this.输入框.设置值(值)
  }
  public 获得值(): string {
    return this.输入框.获得值()
  }
  protected async 当加载时(): Promise<void> {
    let 容器 = 创建元素('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', width: '100%' } })
    this.输入框.style.flex = '1'
    容器.appendChild(this.输入框)
    if (window.electronAPI?.选择文件夹 !== undefined) {
      let 按钮 = new 普通按钮({
        文本: '选择...',
        点击处理函数: async (): Promise<void> => {
          let electronAPI = window.electronAPI
          if (electronAPI === undefined) return
          let 路径 = await electronAPI.选择文件夹()
          if (路径 !== null && 路径 !== '') {
            this.设置值(路径)
          }
        },
      })
      容器.appendChild(按钮)
    }
    this.shadow.appendChild(容器)
  }
}
目录选择输入框.注册组件('lsby-dir-select-input', 目录选择输入框)

export class 用户设置组件 extends 组件基类<设置事件, 监听设置事件> {
  private 用户信息?: { id: string; name: string; is_admin: boolean }
  private 系统配置表单?: 表单<系统配置数据>
  private 用户配置表单?: 表单<用户配置数据>

  static {
    this.注册组件('lsby-settings', this)
  }

  public constructor() {
    super()
  }

  protected async 当加载时(): Promise<void> {
    // 获取用户信息
    let 结果 = await API管理器.请求postJson('/api/user/get-user-info', {})
    if (结果.status !== 'success') {
      return
    }
    this.用户信息 = 结果.data

    let 容器 = 创建元素('div', { style: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' } })

    // 如果是管理员，显示系统配置
    if (this.用户信息.is_admin) {
      let 系统配置容器 = 创建元素('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '24px',
          backgroundColor: 'var(--面板背景颜色, rgba(128, 128, 128, 0.05))',
          border: '1px solid var(--边框颜色, rgba(128, 128, 128, 0.1))',
          borderRadius: '8px',
        },
      })

      let 系统头部容器 = 创建元素('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
      })

      let 系统配置标题 = 创建元素('h2', {
        textContent: '系统配置',
        style: { margin: '0', fontSize: '18px', color: 'var(--文字颜色)', fontWeight: 'bold' },
      })
      系统头部容器.appendChild(系统配置标题)

      let 系统保存按钮 = new 主要按钮({
        文本: '保存配置',
        点击处理函数: async (): Promise<void> => {
          await this.保存系统配置()
        },
      })
      系统头部容器.appendChild(系统保存按钮)
      系统配置容器.appendChild(系统头部容器)

      this.系统配置表单 = this.创建系统配置表单()
      系统配置容器.appendChild(this.系统配置表单)

      容器.appendChild(系统配置容器)
    }

    // 用户配置
    let 用户配置容器 = 创建元素('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '24px',
        backgroundColor: 'var(--面板背景颜色, rgba(128, 128, 128, 0.05))',
        border: '1px solid var(--边框颜色, rgba(128, 128, 128, 0.1))',
        borderRadius: '8px',
      },
    })

    let 用户头部容器 = 创建元素('div', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    })

    let 用户配置标题 = 创建元素('h2', {
      textContent: '用户配置',
      style: { margin: '0', fontSize: '18px', color: 'var(--文字颜色)', fontWeight: 'bold' },
    })
    用户头部容器.appendChild(用户配置标题)

    let 用户保存按钮 = new 主要按钮({
      文本: '保存配置',
      点击处理函数: async (): Promise<void> => {
        await this.保存用户配置()
      },
    })
    用户头部容器.appendChild(用户保存按钮)
    用户配置容器.appendChild(用户头部容器)

    this.用户配置表单 = this.创建用户配置表单()
    用户配置容器.appendChild(this.用户配置表单)

    容器.appendChild(用户配置容器)

    // 屏蔽配置
    let 屏蔽配置容器 = 创建元素('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '24px',
        backgroundColor: 'var(--面板背景颜色, rgba(128, 128, 128, 0.05))',
        border: '1px solid var(--边框颜色, rgba(128, 128, 128, 0.1))',
        borderRadius: '8px',
      },
    })

    let 屏蔽头部容器 = 创建元素('div', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    })

    let 屏蔽配置标题 = 创建元素('h2', {
      textContent: '屏蔽配置',
      style: { margin: '0', fontSize: '18px', color: 'var(--文字颜色)', fontWeight: 'bold' },
    })
    屏蔽头部容器.appendChild(屏蔽配置标题)

    let 管理屏蔽按钮 = new 主要按钮({
      文本: '管理屏蔽列表',
      点击处理函数: async (): Promise<void> => {
        await this.显示管理屏蔽列表对话框()
      },
    })
    屏蔽头部容器.appendChild(管理屏蔽按钮)
    屏蔽配置容器.appendChild(屏蔽头部容器)

    容器.appendChild(屏蔽配置容器)

    // 系统重置（危险操作）
    if (this.用户信息.is_admin) {
      let 系统重置容器 = 创建元素('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '24px',
          backgroundColor: 'var(--面板背景颜色, rgba(128, 128, 128, 0.05))',
          border: '1px solid var(--错误颜色, #f44336)',
          borderRadius: '8px',
        },
      })

      let 系统重置头部容器 = 创建元素('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
      })

      let 系统重置标题 = 创建元素('h2', {
        textContent: '系统重置',
        style: { margin: '0', fontSize: '18px', color: 'var(--错误颜色, #f44336)', fontWeight: 'bold' },
      })
      系统重置头部容器.appendChild(系统重置标题)

      let 重置按钮 = new 危险按钮({
        文本: '彻底重置并初始化',
        点击处理函数: async (): Promise<void> => {
          let 确认 = await 显示确认对话框(
            '【严重警告】此操作将清空数据库所有业务数据并恢复至初始状态，且不可逆！确认继续吗？',
          )
          if (确认 === true) {
            if (环境变量.BUILD_TARGET === 'pure-frontend') {
              await API管理器.重置纯前端数据库()
              API管理器.清除token()
              await 显示对话框('本机数据库已彻底清除并重新初始化。请在登录页重设管理员密码后登录。')
              window.location.href = '/login.html'
              return
            }
            let 结果 = await API管理器.请求postJson('/api/system/reset-database', {})
            if (结果.status === 'success') {
              await 显示对话框(
                '数据库重置成功！即将跳转到登录页。请在服务端控制台查看新生成的管理员密码（如果你没有配置固定默认密码的话）。',
              )
              window.location.href = '/index.html'
            } else {
              await 显示对话框(`重置失败: ${结果.data}`)
            }
          }
        },
      })
      系统重置头部容器.appendChild(重置按钮)
      系统重置容器.appendChild(系统重置头部容器)

      let 警告文字 = 创建元素('div', {
        textContent:
          '警告：点击上方按钮将暴力删除所有表中的数据（包括你现在的账号密码），并重新执行初始化脚本。如果你没有配置 DEFAULT_SYSTEM_PWD，请务必准备好查看控制台输出的新密码。',
        style: { color: 'var(--文字颜色, #ccc)', fontSize: '14px' },
      })
      系统重置容器.appendChild(警告文字)

      容器.appendChild(系统重置容器)
    }

    this.shadow.appendChild(容器)

    // 加载数据
    await this.加载数据()
  }

  private 创建系统配置表单(): 表单<系统配置数据> {
    let 项列表: 表单项配置[] = [
      { 键: 'enable_register', 组件: new 复选框({ 标签: '启用注册' }), 宽度: 1 },
      { 键: 'enable_get_interface_type', 组件: new 复选框({ 标签: '启用获取接口类型' }), 宽度: 1 },
    ]

    let 表单实例 = new 表单<系统配置数据>({ 项列表, 元素样式: { gridTemplateColumns: '1fr' } })

    return 表单实例
  }

  private 创建用户配置表单(): 表单<用户配置数据> {
    let 项列表: 表单项配置[] = [
      { 键: 'theme', 组件: new 单选框组({ 选项列表: ['系统', '亮色', '暗色'], 方向: '横', 标签: '主题' }), 宽度: 1 },
      {
        键: 'clone_protocol',
        组件: new 单选框组({ 选项列表: ['https', 'ssh'], 方向: '横', 标签: '默认克隆协议' }),
        宽度: 1,
      },
      { 键: 'default_clone_path', 组件: new 目录选择输入框(), 标签: '默认克隆路径', 宽度: 1 },
    ]

    let 表单实例 = new 表单<用户配置数据>({ 项列表, 元素样式: { gridTemplateColumns: '1fr' } })

    return 表单实例
  }

  private async 加载数据(): Promise<void> {
    if (this.用户信息 !== undefined && this.用户信息.is_admin && this.系统配置表单 !== undefined) {
      let 系统配置 = await API管理器.请求postJson并处理错误('/api/system/get-system-config', {})
      this.系统配置表单.设置数据(系统配置)
    }

    if (this.用户配置表单 !== undefined) {
      let 用户配置 = await API管理器.请求postJson并处理错误('/api/user/get-user-config', {})
      this.用户配置表单.设置数据(用户配置)
    }
  }

  private async 保存系统配置(): Promise<void> {
    if (this.系统配置表单 === undefined) return
    let 数据 = this.系统配置表单.获得数据()
    await API管理器.请求postJson并处理错误('/api/system/update-system-config', 数据)
    成功提示('系统配置保存成功')
  }

  private async 保存用户配置(): Promise<void> {
    if (this.用户配置表单 === undefined) return
    let 数据 = this.用户配置表单.获得数据()
    await API管理器.请求postJson并处理错误('/api/user/update-user-config', 数据)
    主题管理器.设置本地主题(数据.theme)
    成功提示('用户配置保存成功')
  }
  private async 显示管理屏蔽列表对话框(): Promise<void> {
    let 遮罩层 = 创建元素('div', {
      style: {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--遮罩颜色)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '10000',
      },
    })

    let 对话框 = 创建元素('div', {
      style: {
        backgroundColor: 'var(--卡片背景颜色)',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px var(--深阴影颜色)',
        minWidth: '400px',
        maxWidth: '600px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        border: '1px solid var(--边框颜色)',
      },
    })

    let 标题 = 创建元素('h3', { textContent: '管理屏蔽列表', style: { margin: '0', color: 'var(--文字颜色)' } })
    对话框.appendChild(标题)

    let 列表容器 = 创建元素('div', {
      style: { display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: '1' },
    })
    对话框.appendChild(列表容器)

    let 刷新列表 = async (): Promise<void> => {
      列表容器.innerHTML = ''
      let res = await API管理器.请求postJson('/api/project/repo/get-ignored-list', {})
      if (res.status === 'success') {
        let 列表 = res.data.list as { id: string; fullName: string }[]
        if (列表.length === 0) {
          列表容器.appendChild(
            创建元素('div', {
              textContent: '暂无屏蔽的仓库',
              style: { color: 'var(--次要文字颜色)', textAlign: 'center', padding: '20px 0' },
            }),
          )
          return
        }

        for (let item of 列表) {
          let 行 = 创建元素('div', {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              backgroundColor: 'var(--主要背景颜色)',
              borderRadius: '6px',
              border: '1px solid var(--边框颜色)',
            },
          })
          let 名称 = 创建元素('span', {
            textContent: item.fullName,
            style: { color: 'var(--文字颜色)', fontSize: '14px' },
          })

          let 取消按钮 = new 普通按钮({
            文本: '取消屏蔽',
            点击处理函数: async (): Promise<void> => {
              let 取消结果 = await API管理器.请求postJson('/api/project/repo/unignore', { fullName: item.fullName })
              if (取消结果.status === 'success') {
                成功提示('已取消屏蔽')
                await 刷新列表()
              }
            },
          })

          行.appendChild(名称)
          行.appendChild(取消按钮)
          列表容器.appendChild(行)
        }
      }
    }

    await 刷新列表()

    let 底部容器 = 创建元素('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '8px' } })
    let 关闭按钮 = new 主要按钮({
      文本: '关闭',
      点击处理函数: (): void => {
        document.body.removeChild(遮罩层)
      },
    })
    底部容器.appendChild(关闭按钮)
    对话框.appendChild(底部容器)

    遮罩层.appendChild(对话框)
    document.body.appendChild(遮罩层)
  }
}
