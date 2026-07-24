import { 组件基类 } from '../../../base/base'
import { 创建元素 } from '../../../global/tools/create-element'
import { 普通按钮 } from '../../general/base/base-button'

type 发出事件类型 = { 导航点击: { 目标id: string } }
type 监听事件类型 = {}

export class 落地页英雄区组件 extends 组件基类<发出事件类型, 监听事件类型> {
  static {
    this.注册组件('lsby-landing-hero', this)
  }

  protected override async 当加载时(): Promise<void> {
    let 样式 = 创建元素('style', {
      textContent: `
        .hero-section {
          box-sizing: border-box;
          width: 100%;
        }
        @media (max-width: 900px) {
          .hero-section {
            flex-direction: column !important;
            padding: 40px 20px !important;
            gap: 30px !important;
            text-align: center;
          }
          .hero-left-column {
            align-items: center !important;
            flex: none !important;
            width: 100%;
          }
          .hero-right-column {
            flex: none !important;
            width: 100%;
            max-width: 320px;
            margin: 0 auto;
          }
          .hero-title {
            font-size: 28px !important;
          }
          .hero-description {
            font-size: 14px !important;
            text-align: justify;
          }
          .hero-button-group {
            justify-content: center;
            width: 100%;
          }
        }
        @media (max-width: 480px) {
          .hero-title {
            font-size: 24px !important;
          }
        }
      `,
    })

    let 英雄区 = 创建元素('section', {
      id: 'section-hero',
      className: 'hero-section',
      style: {
        display: 'flex',
        flexDirection: 'row',
        padding: '80px 60px',
        gap: '60px',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1200px',
        margin: '0 auto',
        minHeight: '500px',
      },
    })

    let 左侧 = 创建元素('div', {
      className: 'hero-left-column',
      style: { flex: '1.2', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start' },
    })

    let 徽章 = 创建元素('span', {
      textContent: '基于 FCA 的 Git 仓库管理工具',
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
        padding: '6px 12px',
        borderRadius: '20px',
        backgroundColor: 'rgba(24, 144, 255, 0.1)',
        color: 'var(--主色调)',
        border: '1px solid rgba(24, 144, 255, 0.2)',
      },
    })

    let 标题 = 创建元素('h2', {
      className: 'hero-title',
      textContent: '还在用前缀给仓库分类？',
      style: { margin: '0', fontSize: '38px', fontWeight: '800', lineHeight: '1.25', color: 'var(--文字颜色)' },
    })

    let 渐变文本 = 创建元素('span', {
      textContent: ' 体验智能的 Git 仓库管理',
      style: {
        display: 'block',
        background: 'linear-gradient(135deg, var(--主色调), #a855f7)',
        webkitBackgroundClip: 'text',
        webkitTextFillColor: 'transparent',
      },
    })
    标题.append(渐变文本)

    let 描述 = 创建元素('p', {
      className: 'hero-description',
      textContent:
        '在 GitHub 等平台上，庞杂的仓库通常只能平铺呈现，依靠“项目名前缀”模拟分类低效且难以维护，而平台自带的标签功能又缺乏好用的管理页面。Git-Tag 原生读写 Topics 标签，通过数学模型自动整理并可视化出标签间的交叉与包含关系，为您建立仓库群的秩序。',
      style: { margin: '0', fontSize: '16px', color: 'var(--次要文字颜色)', lineHeight: '1.6' },
    })

    let 按钮组 = 创建元素('div', {
      className: 'hero-button-group',
      style: { display: 'flex', gap: '16px', marginTop: '12px' },
    })

    let 演示按钮 = new 普通按钮({
      文本: '查看互动演示 ↓',
      元素样式: { padding: '12px 32px', fontSize: '16px', borderRadius: '24px' },
      点击处理函数: (): void => {
        this.派发事件('导航点击', { 目标id: 'section-demo' })
      },
    })

    按钮组.append(演示按钮)
    左侧.append(徽章, 标题, 描述, 按钮组)

    let 右侧 = 创建元素('div', {
      className: 'hero-right-column',
      style: { flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' },
    })

    let svg = this.创建动态格图SVG()
    右侧.append(svg)

    英雄区.append(左侧, 右侧)
    this.shadow.append(样式)
    this.shadow.append(英雄区)
  }

  private 创建动态格图SVG(): SVGElement {
    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 420 420')
    svg.style.overflow = 'visible'
    svg.style.width = '100%'
    svg.style.height = 'auto'
    svg.style.maxWidth = '420px'

    let defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    let filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    filter.setAttribute('id', 'glow')
    filter.setAttribute('x', '-20%')
    filter.setAttribute('y', '-20%')
    filter.setAttribute('width', '140%')
    filter.setAttribute('height', '140%')
    let blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur')
    blur.setAttribute('stdDeviation', '4')
    blur.setAttribute('result', 'blur')
    let merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge')
    let node1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode')
    node1.setAttribute('in', 'blur')
    let node2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode')
    node2.setAttribute('in', 'SourceGraphic')
    merge.append(node1, node2)
    filter.append(blur, merge)
    defs.append(filter)
    svg.append(defs)

    type 图节点 = { id: string; x: number; y: number; label: string; subLabel: string; size: number }
    let 节点列表: 图节点[] = [
      { id: 'top', x: 210, y: 50, label: '全部项目', subLabel: '4 repos', size: 24 },
      { id: 'left', x: 100, y: 160, label: '前端开发', subLabel: 'Vue, React', size: 18 },
      { id: 'mid', x: 210, y: 160, label: 'TypeScript', subLabel: '4 repos', size: 20 },
      { id: 'right', x: 320, y: 160, label: '桌面应用', subLabel: 'VS Code, Electron', size: 18 },
      { id: 'bot-left', x: 140, y: 280, label: '前端 & TS & UI', subLabel: 'Vue, React', size: 16 },
      { id: 'bot-right', x: 280, y: 280, label: '桌面 & TS', subLabel: 'VS Code, Electron', size: 16 },
      { id: 'bottom', x: 210, y: 370, label: '空概念', subLabel: '0 repos', size: 14 },
    ]

    let 边列表: [string, string][] = [
      ['top', 'left'],
      ['top', 'mid'],
      ['top', 'right'],
      ['left', 'bot-left'],
      ['mid', 'bot-left'],
      ['mid', 'bot-right'],
      ['right', 'bot-right'],
      ['bot-left', 'bottom'],
      ['bot-right', 'bottom'],
    ]

    let 渲染的边Map = new Map<string, SVGLineElement>()
    for (let 边 of 边列表) {
      let 起点 = 节点列表.find((n) => n.id === 边[0])
      let 终点 = 节点列表.find((n) => n.id === 边[1])
      if (起点 !== undefined && 终点 !== undefined) {
        let line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.setAttribute('x1', 起点.x.toString())
        line.setAttribute('y1', 起点.y.toString())
        line.setAttribute('x2', 终点.x.toString())
        line.setAttribute('y2', 终点.y.toString())
        line.setAttribute('stroke', 'var(--边框颜色)')
        line.setAttribute('stroke-width', '2')
        line.style.opacity = '0.5'
        line.style.transition = 'all 0.3s ease'
        svg.append(line)
        渲染的边Map.set(`${边[0]}-${边[1]}`, line)
      }
    }

    let 动画圈列表: { ellipse: SVGEllipseElement; rx: number; ry: number }[] = []
    let 渲染的点Map = new Map<string, SVGGElement>()
    for (let 点 of 节点列表) {
      let g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      g.style.cursor = 'pointer'

      let 字符宽度 = 0
      for (let char of 点.label) {
        if (char.match(/[^\x00-\xff]/) !== null) {
          字符宽度 += 12
        } else {
          字符宽度 += 7
        }
      }
      let rx = 字符宽度 / 2 + 12
      let ry = 点.size

      let ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
      ellipse.setAttribute('cx', 点.x.toString())
      ellipse.setAttribute('cy', 点.y.toString())
      ellipse.setAttribute('rx', rx.toString())
      ellipse.setAttribute('ry', ry.toString())
      ellipse.setAttribute('fill', 'var(--卡片背景颜色)')
      ellipse.setAttribute('stroke', 'var(--主色调)')
      ellipse.setAttribute('stroke-width', '3')
      ellipse.style.transition = 'all 0.3s ease'
      ellipse.style.filter = 'drop-shadow(0 2px 4px var(--深阴影颜色))'

      let text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('x', 点.x.toString())
      text.setAttribute('y', (点.y + 4).toString())
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('fill', 'var(--文字颜色)')
      text.style.fontSize = '12px'
      text.style.fontWeight = 'bold'
      text.style.pointerEvents = 'none'
      text.style.userSelect = 'none'
      text.textContent = 点.label

      g.append(ellipse, text)
      svg.append(g)
      渲染的点Map.set(点.id, g)
      动画圈列表.push({ ellipse, rx, ry })

      g.onmouseenter = (): void => {
        ellipse.setAttribute('rx', (rx + 4).toString())
        ellipse.setAttribute('ry', (ry + 4).toString())
        ellipse.setAttribute('stroke-width', '4')
        ellipse.setAttribute('fill', 'var(--选中背景颜色)')
        ellipse.setAttribute('filter', 'url(#glow)')

        for (let [k, line] of 渲染的边Map.entries()) {
          let parts = k.split('-')
          let from = parts[0]
          let to = parts[1]
          if (from === 点.id || to === 点.id) {
            line.setAttribute('stroke', 'var(--主色调)')
            line.setAttribute('stroke-width', '4')
            line.style.opacity = '1'
          }
        }
      }

      g.onmouseleave = (): void => {
        ellipse.setAttribute('rx', rx.toString())
        ellipse.setAttribute('ry', ry.toString())
        ellipse.setAttribute('stroke-width', '3')
        ellipse.setAttribute('fill', 'var(--卡片背景颜色)')
        ellipse.removeAttribute('filter')

        for (let [_k, line] of 渲染的边Map.entries()) {
          line.setAttribute('stroke', 'var(--边框颜色)')
          line.setAttribute('stroke-width', '2')
          line.style.opacity = '0.5'
        }
      }
    }

    let angle = 0
    let 循环 = (): void => {
      angle += 0.05
      let offset = Math.sin(angle) * 1.5
      for (let item of 动画圈列表) {
        item.ellipse.setAttribute('rx', (item.rx + offset).toString())
        item.ellipse.setAttribute('ry', (item.ry + offset).toString())
      }
      requestAnimationFrame(循环)
    }
    requestAnimationFrame(循环)

    return svg
  }
}
