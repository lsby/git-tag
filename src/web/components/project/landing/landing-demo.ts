import { 组件基类 } from '../../../base/base'
import { 创建元素 } from '../../../global/tools/create-element'
import { 主要按钮, 普通按钮 } from '../../general/base/base-button'
import { FCA格图查看器 } from '../fca/fca-lattice-viewer'
import { FCA树左侧组件 } from '../fca/fca-tree-left'
import { 演示剧本 } from './landing-demo-data'
import { 获取演示树子节点, 计算演示概念格 } from './landing-demo-fca-logic'

type 发出事件类型 = {}
type 监听事件类型 = {}

export class 落地页演示区组件 extends 组件基类<发出事件类型, 监听事件类型> {
  static {
    this.注册组件('lsby-landing-demo', this)
  }

  // 状态数据
  private 剧本 = 演示剧本

  private 当前步骤索引 = 0
  private 当前概念意图: string[] = []

  // UI 容器
  private 左侧仓库容器 = 创建元素('div')
  private 格图查看器容器 = 创建元素('div')
  private 过滤结果容器 = 创建元素('div')
  private 树组件 = new FCA树左侧组件()

  // 底部控件
  private 上一步按钮: 普通按钮 | null = null
  private 下一步按钮: 主要按钮 | null = null
  private 解说文本 = 创建元素('div')

  protected override async 当加载时(): Promise<void> {
    this.树组件.监听发出事件('节点选中', async (e) => {
      let tags = e.detail.节点id !== '' ? e.detail.节点id.split(',') : []
      this.当前概念意图 = tags
      this.更新过滤结果()
    })

    let 样式 = 创建元素('style', {
      textContent: `
        * {
          box-sizing: border-box;
        }
        :host {
          display: block;
          width: 100%;
        }
        @media (max-width: 1024px) {
          #section-demo {
            padding: 40px 16px !important;
          }
          #demo-simulator {
            height: auto !important;
          }
          #demo-dashboard-body {
            padding: 12px 16px !important;
            height: auto !important;
            overflow: visible !important;
          }
          #demo-three-columns {
            flex-direction: column !important;
            height: auto !important;
            overflow: visible !important;
          }
          .demo-column {
            flex: none !important;
            height: 380px !important;
          }
          #demo-footer {
            height: auto !important;
            flex-direction: column !important;
            gap: 12px !important;
            padding: 16px !important;
          }
          #demo-footer-text {
            padding: 8px 0 !important;
          }
        }
      `,
    })
    this.shadow.append(样式)

    let 演示区 = this.渲染演示区()
    this.shadow.append(演示区)
    this.渲染当前步骤()
  }

  private 渲染演示区(): HTMLElement {
    let 演示区 = 创建元素('section', {
      id: 'section-demo',
      style: {
        padding: '80px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '40px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      },
    })

    let 头部信息 = 创建元素('div', {
      style: {
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '10px',
        boxSizing: 'border-box',
      },
    })

    let 标题 = 创建元素('h3', {
      textContent: 'FCA 互动演示教程',
      style: { margin: '0', fontSize: '32px', fontWeight: 'bold', color: 'var(--文字颜色)' },
    })

    let 副标题 = 创建元素('p', {
      textContent: '根据预设剧本为演示项目打标签，观察概念格图与分类过滤树如何自动生成与演进',
      style: { margin: '0', fontSize: '16px', color: 'var(--次要文字颜色)' },
    })
    头部信息.append(标题, 副标题)

    let 模拟器 = 创建元素('div', {
      id: 'demo-simulator',
      style: {
        width: '100%',
        height: '800px',
        backgroundColor: 'var(--卡片背景颜色)',
        borderRadius: '16px',
        border: '1px solid var(--边框颜色)',
        boxShadow: '0 8px 32px var(--深阴影颜色)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
      },
    })

    let 仪表盘主体 = 创建元素('div', {
      id: 'demo-dashboard-body',
      style: {
        display: 'flex',
        flexDirection: 'column',
        flex: '1',
        overflow: 'hidden',
        padding: '16px 24px',
        gap: '16px',
        boxSizing: 'border-box',
      },
    })

    let 顶部数据源栏 = 创建元素('div', {
      style: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--背景颜色)',
        borderRadius: '8px',
        border: '1px solid var(--边框颜色)',
        overflow: 'hidden',
        flexShrink: '0',
        boxSizing: 'border-box',
      },
    })

    let 数据源标题 = 创建元素('div', {
      textContent: '数据源 (仓库列表)',
      style: {
        padding: '8px 12px',
        fontWeight: 'bold',
        borderBottom: '1px solid var(--边框颜色)',
        backgroundColor: 'var(--次要背景颜色)',
        fontSize: '13px',
        boxSizing: 'border-box',
      },
    })

    this.左侧仓库容器.style.display = 'flex'
    this.左侧仓库容器.style.flexDirection = 'row'
    this.左侧仓库容器.style.gap = '12px'
    this.左侧仓库容器.style.padding = '8px 12px'
    this.左侧仓库容器.style.overflowX = 'auto'
    this.左侧仓库容器.style.boxSizing = 'border-box'
    顶部数据源栏.append(数据源标题, this.左侧仓库容器)

    let 三栏区域 = 创建元素('div', {
      id: 'demo-three-columns',
      style: { display: 'flex', flex: '1', gap: '16px', overflow: 'hidden', boxSizing: 'border-box' },
    })

    let 创建栏目 = (栏目标题: string, 内容容器: HTMLElement, 弹性系数: string): HTMLElement => {
      let 栏 = 创建元素('div', {
        className: 'demo-column',
        style: {
          flex: 弹性系数,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--背景颜色)',
          borderRadius: '8px',
          border: '1px solid var(--边框颜色)',
          overflow: 'hidden',
          boxSizing: 'border-box',
        },
      })
      let 栏标 = 创建元素('div', {
        textContent: 栏目标题,
        style: {
          padding: '8px 12px',
          borderBottom: '1px solid var(--边框颜色)',
          fontWeight: 'bold',
          backgroundColor: 'var(--次要背景颜色)',
          flexShrink: '0',
          fontSize: '13px',
          boxSizing: 'border-box',
        },
      })
      内容容器.style.flex = '1'
      内容容器.style.overflowY = 'auto'
      内容容器.style.padding = '12px'
      内容容器.style.position = 'relative'
      内容容器.style.boxSizing = 'border-box'
      栏.append(栏标, 内容容器)
      return 栏
    }

    this.树组件.设置数据提供者({
      获取子节点: async (parentId) => this.获取树子节点(parentId),
      隐藏按钮: true,
      默认展开全部: true,
      显示提示徽章: true,
    })
    this.树组件.className = 'demo-column'
    let 树宿主 = this.树组件.获得宿主样式()
    树宿主.flex = '1'
    树宿主.borderRadius = '8px'
    树宿主.border = '1px solid var(--边框颜色)'
    树宿主.boxSizing = 'border-box'

    三栏区域.append(
      创建栏目('FCA 概念格图', this.格图查看器容器, '2'),
      this.树组件,
      创建栏目('筛选后的项目列表', this.过滤结果容器, '1'),
    )

    仪表盘主体.append(顶部数据源栏, 三栏区域)

    let 仪表盘底部 = 创建元素('div', {
      id: 'demo-footer',
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        backgroundColor: 'var(--次要背景颜色)',
        borderTop: '1px solid var(--边框颜色)',
        flexShrink: '0',
        height: '80px',
        boxSizing: 'border-box',
      },
    })

    this.上一步按钮 = new 普通按钮({
      文本: '上一步',
      元素样式: { padding: '8px 20px', fontSize: '14px', borderRadius: '6px' },
      点击处理函数: (): void => {
        if (this.当前步骤索引 > 0) {
          this.当前步骤索引--
          this.当前概念意图 = []
          this.渲染当前步骤()
        }
      },
    })

    this.解说文本.id = 'demo-footer-text'
    this.解说文本.style.flex = '1'
    this.解说文本.style.textAlign = 'center'
    this.解说文本.style.fontSize = '15px'
    this.解说文本.style.padding = '0 20px'
    this.解说文本.style.lineHeight = '1.4'
    this.解说文本.style.color = 'var(--主色调)'
    this.解说文本.style.fontWeight = 'bold'
    this.解说文本.style.boxSizing = 'border-box'

    this.下一步按钮 = new 主要按钮({
      文本: '下一步',
      元素样式: { padding: '8px 20px', fontSize: '14px', borderRadius: '6px' },
      点击处理函数: (): void => {
        if (this.当前步骤索引 < this.剧本.length - 1) {
          this.当前步骤索引++
          this.当前概念意图 = []
          this.渲染当前步骤()
        }
      },
    })

    仪表盘底部.append(this.上一步按钮, this.解说文本, this.下一步按钮)

    模拟器.append(仪表盘主体, 仪表盘底部)
    演示区.append(头部信息, 模拟器)

    return 演示区
  }

  private 渲染当前步骤(): void {
    let 步骤 = this.剧本[this.当前步骤索引]
    if (步骤 === undefined) return

    // 更新底部控制台
    this.解说文本.textContent = 步骤.解说
    if (this.上一步按钮 !== null) {
      this.上一步按钮.获得宿主样式().visibility = this.当前步骤索引 === 0 ? 'hidden' : 'visible'
    }
    if (this.下一步按钮 !== null) {
      this.下一步按钮.获得宿主样式().visibility = this.当前步骤索引 === this.剧本.length - 1 ? 'hidden' : 'visible'
    }

    // 渲染顶部数据源仓库
    this.左侧仓库容器.innerHTML = ''
    for (let repo of 步骤.仓库状态) {
      let 卡片 = 创建元素('div', {
        style: {
          padding: '10px 16px',
          border: '1px solid var(--边框颜色)',
          borderRadius: '8px',
          backgroundColor: 'var(--背景颜色)',
          flex: '1',
          minWidth: '200px',
        },
      })
      let 名字 = 创建元素('div', { textContent: repo.name, style: { fontWeight: 'bold', marginBottom: '8px' } })
      let 标签区 = 创建元素('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } })
      if (repo.tags.length === 0) {
        标签区.append(
          创建元素('span', {
            textContent: '(无标签)',
            style: { color: 'var(--次要文字颜色)', fontSize: '12px', fontStyle: 'italic' },
          }),
        )
      } else {
        for (let tag of repo.tags) {
          标签区.append(
            创建元素('span', {
              textContent: tag,
              style: {
                fontSize: '12px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'var(--主色调)',
                color: 'white',
              },
            }),
          )
        }
      }
      卡片.append(名字, 标签区)
      this.左侧仓库容器.append(卡片)
    }

    // 刷新格图、树与结果
    this.刷新格图()
    this.当前概念意图 = []
    this.树组件.取消选中()
    void this.树组件.刷新树()
    this.更新过滤结果()
  }

  private 刷新格图(): void {
    this.格图查看器容器.innerHTML = ''
    this.格图查看器容器.style.padding = '0'
    let 步骤 = this.剧本[this.当前步骤索引]
    let 数据 = 步骤 !== undefined ? 计算演示概念格(步骤.仓库状态) : { nodes: [], edges: [] }

    let 查看器 = new FCA格图查看器()
    localStorage.removeItem('fca_lattice_state')
    ;(查看器 as any).当前用户Id = 'demo'
    查看器.设置数据(数据)
    this.格图查看器容器.append(查看器)
  }

  private 更新过滤结果(): void {
    let 步骤 = this.剧本[this.当前步骤索引]
    if (步骤 === undefined) return
    let 当前仓库 = 步骤.仓库状态
    let 当前意图集 = new Set(this.当前概念意图)
    let 匹配仓库 = 当前仓库.filter((repo) => {
      for (let tag of 当前意图集) {
        if (repo.tags.includes(tag) === false) return false
      }
      return true
    })

    this.过滤结果容器.innerHTML = ''
    let 结果标题 = 创建元素('div', {
      textContent: `当前匹配: ${匹配仓库.length} 个`,
      style: { color: 'var(--次要文字颜色)', marginBottom: '16px' },
    })
    this.过滤结果容器.append(结果标题)

    for (let repo of 匹配仓库) {
      let 卡片 = 创建元素('div', {
        style: {
          padding: '12px',
          border: '1px solid var(--边框颜色)',
          borderRadius: '8px',
          marginBottom: '12px',
          backgroundColor: 'var(--背景颜色)',
        },
      })
      let 名字 = 创建元素('div', { textContent: repo.name, style: { fontWeight: 'bold', marginBottom: '8px' } })
      let 标签区 = 创建元素('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } })
      if (repo.tags.length === 0) {
        标签区.append(
          创建元素('span', {
            textContent: '(无标签)',
            style: { color: 'var(--次要文字颜色)', fontSize: '12px', fontStyle: 'italic' },
          }),
        )
      } else {
        for (let tag of repo.tags) {
          let 高亮 = 当前意图集.has(tag)
          标签区.append(
            创建元素('span', {
              textContent: tag,
              style: {
                fontSize: '12px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 高亮 ? 'var(--主色调)' : 'var(--按钮背景)',
                color: 高亮 ? 'white' : 'var(--文字颜色)',
              },
            }),
          )
        }
      }
      卡片.append(名字, 标签区)
      this.过滤结果容器.append(卡片)
    }
  }

  private async 获取树子节点(
    parentId: string,
  ): Promise<import('../../../../interface/project/fca/get-children/types').FcaTreeNodeData[]> {
    let 步骤 = this.剧本[this.当前步骤索引]
    if (步骤 === undefined) return []
    return 获取演示树子节点(parentId, 步骤.仓库状态)
  }
}
