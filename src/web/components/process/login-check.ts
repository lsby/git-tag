import { 组件基类 } from '../../base/base'
import { API管理器 } from '../../global/manager/api-manager'

type 发出事件类型 = { 检测到未登录: null }
type 监听事件类型 = {}

export class 检查登录组件 extends 组件基类<发出事件类型, 监听事件类型> {
  static {
    this.注册组件('lsby-login-check', this)
  }

  protected override async 当加载时(): Promise<void> {
    try {
      let 结果 = await API管理器.请求postJson并处理错误('/api/project/is-login', {})
      if (结果.isLogin === true) {
        let 路径 = window.location.pathname
        let 文件名 = 路径.substring(路径.lastIndexOf('/') + 1)
        if (文件名 === '' || 文件名 === 'index.html') {
          window.location.assign(`./app.html`)
        }
        return
      }

      // 尝试本地免密码登录
      let 本地登录结果 = await API管理器.请求postJson('/api/project/local-login', {})
      if (本地登录结果.status === 'success') {
        API管理器.设置token(本地登录结果.data.token)
        let 路径 = window.location.pathname
        let 文件名 = 路径.substring(路径.lastIndexOf('/') + 1)
        if (文件名 === '' || 文件名 === 'index.html') {
          window.location.assign(`./app.html`)
        }
        return
      }
    } catch (_错误) {
      // 忽略请求失败（可能是静态托管环境，直接导流到落地页）
    }

    window.location.assign(`./landing.html`)
  }
}
