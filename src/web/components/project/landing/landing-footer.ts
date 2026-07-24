import { 组件基类 } from '../../../base/base'
import { 创建元素 } from '../../../global/tools/create-element'

let 公安备案图标 = new URL('../../../../../public/公安备案图标.png', import.meta.url).toString()

type 发出事件类型 = {}
type 监听事件类型 = {}

export class 落地页页脚组件 extends 组件基类<发出事件类型, 监听事件类型> {
  static {
    this.注册组件('lsby-landing-footer', this)
  }

  protected override async 当加载时(): Promise<void> {
    let 页脚 = 创建元素('footer', {
      style: {
        padding: '40px 20px',
        backgroundColor: 'var(--次要背景颜色)',
        borderTop: '1px solid var(--边框颜色)',
        textAlign: 'center',
        color: 'var(--次要文字颜色)',
        fontSize: '14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      },
    })

    let 主站链接 = 'https://hbybyyang.cn/'

    let 版权文本 = 创建元素('div')
    let 前缀文本 = 创建元素('span', { textContent: '© 2026 ' })
    let 主站超链接 = 创建元素('a', { textContent: '科达雅软件工作室' })
    主站超链接.href = 主站链接
    主站超链接.style.color = 'inherit'
    主站超链接.style.textDecoration = 'none'
    主站超链接.style.transition = 'color 0.3s ease'
    主站超链接.onmouseenter = (): void => {
      主站超链接.style.color = '#a78bfa'
    }
    主站超链接.onmouseleave = (): void => {
      主站超链接.style.color = 'inherit'
    }
    let 后缀文本 = 创建元素('span', { textContent: ' All rights reserved.' })
    版权文本.appendChild(前缀文本)
    版权文本.appendChild(主站超链接)
    版权文本.appendChild(后缀文本)

    let 备案容器 = 创建元素('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '16px',
        marginTop: '4px',
      },
    })

    let 备案文本 = 创建元素('a', {
      textContent: '新ICP备2026003876号-1',
      href: 'https://beian.miit.gov.cn/',
      target: '_blank',
      style: { color: 'var(--次要文字颜色)', textDecoration: 'none', transition: 'color 0.3s ease', marginTop: '0px' },
    })
    备案文本.onmouseenter = (): void => {
      备案文本.style.color = '#a78bfa'
    }
    备案文本.onmouseleave = (): void => {
      备案文本.style.color = 'var(--次要文字颜色)'
    }

    let 公安备案链接 = 创建元素('a', {
      href: 'https://beian.mps.gov.cn/#/query/webSearch?code=65010402002238',
      target: '_blank',
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        marginTop: '0px',
        color: 'var(--次要文字颜色)',
        textDecoration: 'none',
        transition: 'color 0.3s ease',
      },
    })
    公安备案链接.onmouseenter = (): void => {
      公安备案链接.style.color = '#a78bfa'
    }
    公安备案链接.onmouseleave = (): void => {
      公安备案链接.style.color = 'var(--次要文字颜色)'
    }

    let 公安图标 = 创建元素('img', { src: 公安备案图标, style: { width: '16px', height: '16px' } })
    let 公安文本 = 创建元素('span', { textContent: '新公网安备65010402002238号' })

    公安备案链接.appendChild(公安图标)
    公安备案链接.appendChild(公安文本)

    备案容器.appendChild(备案文本)
    备案容器.appendChild(公安备案链接)

    页脚.append(版权文本, 备案容器)
    this.shadow.append(页脚)
  }
}
