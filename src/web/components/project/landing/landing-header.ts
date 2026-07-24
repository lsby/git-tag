import { 组件基类 } from '../../../base/base'
import { 创建元素 } from '../../../global/tools/create-element'

type 发出事件类型 = { 导航点击: { 目标id: string } }
type 监听事件类型 = {}

export class 落地页头部组件 extends 组件基类<发出事件类型, 监听事件类型> {
  static {
    this.注册组件('lsby-landing-header', this)
  }

  protected override async 当加载时(): Promise<void> {
    // 宿主样式
    let style = this.获得宿主样式()
    style.display = 'block'
    style.width = '100%'
    style.boxSizing = 'border-box'

    let 顶栏容器 = 创建元素('header', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '70px',
        padding: '0 40px',
        boxSizing: 'border-box',
        zIndex: '100',
        position: 'sticky',
        top: '0',
        transition: 'all 0.3s ease',
        background: 'rgba(20, 21, 26, 0.5)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--边框颜色)',
        flexShrink: '0',
        boxShadow: '0 2px 8px var(--深阴影颜色)',
      },
    })

    // Logo区总容器，包含主项目图标、连接符和当前项目区
    let 标志总容器 = 创建元素('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } })

    // 主项目图标容器
    let 主项目图标容器 = 创建元素('div', {
      className: 'header-main-logo',
      style: {
        width: '34px',
        height: '34px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        borderRadius: '9px',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      },
    })
    let 主项目图标图片 = 创建元素('img', {
      src: '/public/kedaya-logo.svg',
      style: { width: '100%', height: '100%', objectFit: 'contain' },
    })
    主项目图标容器.appendChild(主项目图标图片)

    主项目图标容器.onmouseenter = (): void => {
      主项目图标容器.style.transform = 'scale(1.08)'
      主项目图标容器.style.boxShadow = '0 0 15px rgba(168, 85, 247, 0.4)'
    }
    主项目图标容器.onmouseleave = (): void => {
      主项目图标容器.style.transform = 'scale(1.0)'
      主项目图标容器.style.boxShadow = 'none'
    }

    let 主站链接 = 'https://hbybyyang.cn/'
    主项目图标容器.onclick = (): void => {
      window.location.assign(主站链接)
    }

    // 连接符号
    let 连接符号 = 创建元素('span', {
      className: 'header-logo-separator',
      textContent: '×',
      style: {
        fontSize: '18px',
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.3)',
        userSelect: 'none',
        padding: '0 4px',
      },
    })

    // 当前项目区
    let 当前项目区 = 创建元素('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'transform 0.2s ease',
      },
    })

    // Logo 图标
    let 标志图标 = 创建元素('div', {
      style: {
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease',
      },
    })
    let 标志图片 = 创建元素('img', {
      src: '/public/git-tag-logo.svg',
      style: { width: '100%', height: '100%', objectFit: 'contain' },
    })
    标志图标.appendChild(标志图片)

    // Logo 文本
    let 标志文本 = 创建元素('span', {
      textContent: 'Git-Tag',
      style: {
        fontSize: '22px',
        margin: '0',
        fontWeight: 'bold',
        background: 'linear-gradient(135deg, var(--主色调), #a855f7)',
        webkitBackgroundClip: 'text',
        webkitTextFillColor: 'transparent',
        fontFamily: "'Outfit', 'Inter', sans-serif",
      },
    })

    当前项目区.appendChild(标志图标)
    当前项目区.appendChild(标志文本)

    当前项目区.onmouseenter = (): void => {
      当前项目区.style.transform = 'scale(1.02)'
      标志图标.style.boxShadow = '0 0 15px rgba(24, 144, 255, 0.4)'
    }
    当前项目区.onmouseleave = (): void => {
      当前项目区.style.transform = 'scale(1.0)'
      标志图标.style.boxShadow = 'none'
    }
    当前项目区.onclick = (): void => {
      window.location.assign('./landing.html')
    }

    标志总容器.appendChild(主项目图标容器)
    标志总容器.appendChild(连接符号)
    标志总容器.appendChild(当前项目区)

    顶栏容器.appendChild(标志总容器)

    let 顶栏Github按钮 = 创建元素('a', {
      className: 'header-github-btn',
      href: 'https://github.com/lsby/git-tag',
      target: '_blank',
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '20px',
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid var(--边框颜色)',
        color: 'var(--文字颜色)',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      },
    })

    顶栏Github按钮.onmouseenter = (): void => {
      顶栏Github按钮.style.background = 'rgba(255, 255, 255, 0.15)'
      顶栏Github按钮.style.borderColor = 'rgba(168, 85, 247, 0.6)'
      顶栏Github按钮.style.boxShadow = '0 0 12px rgba(168, 85, 247, 0.3)'
    }

    顶栏Github按钮.onmouseleave = (): void => {
      顶栏Github按钮.style.background = 'rgba(255, 255, 255, 0.08)'
      顶栏Github按钮.style.borderColor = 'var(--边框颜色)'
      顶栏Github按钮.style.boxShadow = 'none'
    }

    let 顶栏Github图标容器 = 创建元素('div', {
      style: { width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    })
    顶栏Github图标容器.innerHTML = `<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 3.12.9.01.64.01 1.11.01 1.38 0 .21-.15.46-.55.38A8.013 8.013 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path></svg>`

    let 顶栏Github文本 = 创建元素('span', { className: 'header-github-text', textContent: 'GitHub' })
    顶栏Github按钮.appendChild(顶栏Github图标容器)
    顶栏Github按钮.appendChild(顶栏Github文本)

    顶栏容器.appendChild(顶栏Github按钮)

    let 响应式样式 = 创建元素('style', {
      textContent: `
        @media (max-width: 768px) {
          header[style*="height: 70px"] {
            padding: 0 16px !important;
            height: 60px !important;
          }
          span[style*="font-size: 22px"] {
            font-size: 16px !important;
          }
          .header-main-logo, .header-logo-separator {
            display: none !important;
          }
          .header-github-text {
            display: none !important;
          }
          .header-github-btn {
            padding: 8px !important;
            border-radius: 50% !important;
          }
        }
      `,
    })
    this.shadow.appendChild(响应式样式)
    this.shadow.appendChild(顶栏容器)
  }
}
