import { 组件基类 } from '../../../base/base'
import { 创建元素 } from '../../../global/tools/create-element'
import { 落地页演示区组件 } from './landing-demo'
import { 落地页特性区组件 } from './landing-features'
import { 落地页页脚组件 } from './landing-footer'
import { 落地页头部组件 } from './landing-header'
import { 落地页英雄区组件 } from './landing-hero'

type 发出事件类型 = {}
type 监听事件类型 = {}

export class FCA落地页演示组件 extends 组件基类<发出事件类型, 监听事件类型> {
  static {
    this.注册组件('lsby-landing', this)
  }

  protected override async 当加载时(): Promise<void> {
    this.初始化布局()
  }

  private 初始化布局(): void {
    let 容器 = 创建元素('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--主要背景颜色)',
        color: 'var(--文字颜色)',
        fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollBehavior: 'smooth',
      },
    })

    let 头部 = new 落地页头部组件()
    let 英雄区 = new 落地页英雄区组件()
    let 特性区 = new 落地页特性区组件()
    let 演示区 = new 落地页演示区组件()
    let 页脚 = new 落地页页脚组件()

    // 监听导航点击事件，实现页面内滚动
    let 处理导航点击 = (e: CustomEvent<{ 目标id: string }>): void => {
      let 目标id = e.detail.目标id
      let 目标 = null
      if (目标id === 'section-features') 目标 = 特性区
      if (目标id === 'section-demo') 目标 = 演示区

      if (目标 !== null) {
        目标.scrollIntoView({ behavior: 'smooth' })
      }
    }

    // 给头部组件赋予 ID 或者使用 shadow 查找不太好，直接监听
    头部.监听发出事件('导航点击', async (e) => {
      处理导航点击(e as CustomEvent<{ 目标id: string }>)
    })
    英雄区.监听发出事件('导航点击', async (e) => {
      处理导航点击(e as CustomEvent<{ 目标id: string }>)
    })

    // 给予特性区和演示区 ID 以便其他方法通过 getElementById 找到它（如果有需要）
    特性区.id = 'section-features'
    演示区.id = 'section-demo'

    容器.append(头部, 英雄区, 特性区, 演示区, 页脚)
    this.shadow.append(容器)
  }
}
