import { 组件基类 } from '../../../base/base'
import { 创建元素 } from '../../../global/tools/create-element'

type 发出事件类型 = {}
type 监听事件类型 = {}

export class 落地页特性区组件 extends 组件基类<发出事件类型, 监听事件类型> {
  static {
    this.注册组件('lsby-landing-features', this)
  }

  protected override async 当加载时(): Promise<void> {
    let 样式 = 创建元素('style', {
      textContent: `
        .features-section {
          box-sizing: border-box;
          width: 100%;
        }
        @media (max-width: 768px) {
          .features-section {
            padding: 40px 20px !important;
            gap: 32px !important;
          }
          .features-title {
            font-size: 24px !important;
          }
          .features-subtitle {
            font-size: 14px !important;
          }
          .features-grid {
            gap: 20px !important;
          }
          .feature-card {
            padding: 20px !important;
            gap: 12px !important;
          }
          .feature-card-title {
            font-size: 18px !important;
          }
          .feature-card-desc {
            font-size: 13px !important;
          }
        }
      `,
    })

    let 特性区 = 创建元素('section', {
      id: 'section-features',
      className: 'features-section',
      style: {
        padding: '80px 40px',
        backgroundColor: 'var(--次要背景颜色)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '48px',
      },
    })

    let 头部信息 = 创建元素('div', {
      style: { textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' },
    })

    let 标题 = 创建元素('h3', {
      className: 'features-title',
      textContent: '为什么选择 Git-Tag？',
      style: { margin: '0', fontSize: '32px', fontWeight: 'bold', color: 'var(--文字颜色)' },
    })

    let 副标题 = 创建元素('p', {
      className: 'features-subtitle',
      textContent: '基于形式概念分析理论设计，让海量代码仓库的管理井然有序',
      style: { margin: '0', fontSize: '16px', color: 'var(--次要文字颜色)' },
    })
    头部信息.append(标题, 副标题)

    let 网格 = 创建元素('div', {
      className: 'features-grid',
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '30px',
        width: '100%',
        maxWidth: '1200px',
      },
    })

    type 特性项 = { 标题: string; 描述: string; 背景色: string }
    let 特性列表: 特性项[] = [
      {
        标题: '多维交叉分类',
        描述: '引入形式概念分析（FCA）数学理论，打破传统单继承分类限制。当项目拥有多个标签时，系统自动发掘其包含与相交关系并生成动态概念格。',
        背景色: 'linear-gradient(135deg, rgba(64, 158, 255, 0.1), transparent)',
      },
      {
        标题: '格图智能树形化',
        描述: '将复杂的网状概念格智能转化为符合直觉的树形层级目录。在完美保留 FCA 数学模型科学性的同时，极大地降低日常管理的心智成本。',
        背景色: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), transparent)',
      },
      {
        标题: 'Git 深度无缝集成',
        描述: '原生读写 Git 仓库的 Topics 信息，无需额外配置。您在系统中的每次标签变更都会直接生效并更新到 Git 仓库，不会因为更换电脑而丢失标签。',
        背景色: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1), transparent)',
      },
    ]

    for (let 项 of 特性列表) {
      let 卡片 = 创建元素('div', {
        className: 'feature-card',
        style: {
          padding: '32px',
          backgroundColor: 'var(--卡片背景颜色)',
          borderRadius: '16px',
          border: '1px solid var(--边框颜色)',
          boxShadow: '0 4px 12px var(--深阴影颜色)',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: 项.背景色,
        },
      })

      let 卡片标题 = 创建元素('h4', {
        className: 'feature-card-title',
        textContent: 项.标题,
        style: { margin: '0', fontSize: '20px', fontWeight: 'bold', color: 'var(--文字颜色)' },
      })

      let 卡片描述 = 创建元素('p', {
        className: 'feature-card-desc',
        textContent: 项.描述,
        style: { margin: '0', fontSize: '14px', color: 'var(--次要文字颜色)', lineHeight: '1.6' },
      })

      卡片.append(卡片标题, 卡片描述)
      网格.append(卡片)

      卡片.onmouseenter = (): void => {
        卡片.style.transform = 'translateY(-8px)'
        卡片.style.boxShadow = '0 12px 24px var(--深阴影颜色)'
        卡片.style.borderColor = 'var(--主色调)'
      }
      卡片.onmouseleave = (): void => {
        卡片.style.transform = 'translateY(0)'
        卡片.style.boxShadow = '0 4px 12px var(--深阴影颜色)'
        卡片.style.borderColor = 'var(--边框颜色)'
      }
    }

    特性区.append(头部信息, 网格)
    this.shadow.append(样式)
    this.shadow.append(特性区)
  }
}
