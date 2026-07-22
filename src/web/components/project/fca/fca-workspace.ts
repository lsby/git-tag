import { 组件基类 } from '../../../base/base'
import './fca-tree-left'
import './repo-query-list'

type 发出事件类型 = {}
type 监听事件类型 = {}

export class FCA工作区组件 extends 组件基类<发出事件类型, 监听事件类型> {
  static {
    this.注册组件('fca-workspace', this)
  }

  protected override async 当加载时(): Promise<void> {
    this.获得宿主样式().display = 'flex'
    this.获得宿主样式().width = '100%'
    this.获得宿主样式().height = '100%'
    this.获得宿主样式().overflow = 'hidden'

    this.shadow.innerHTML = `
      <div style="width: 320px; border-right: 1px solid var(--边框颜色); display: flex; flex-direction: column; background: var(--次要背景颜色);">
        <fca-tree-left style="flex: 1; overflow: hidden;"></fca-tree-left>
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; background: var(--主要背景颜色);">
        <repo-query-list style="flex: 1; overflow: hidden;"></repo-query-list>
      </div>
    `
  }
}
