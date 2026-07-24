export function 导出SVG(svg元素: SVGSVGElement | null): void {
  if (svg元素 === null) return

  let 克隆svg = svg元素.cloneNode(true) as SVGSVGElement

  // 获取计算后的 CSS 变量值并内联
  let 计算样式 = getComputedStyle(document.documentElement)
  let 背景色值 = 计算样式.getPropertyValue('--主要背景颜色').trim()
  let 文字色值 = 计算样式.getPropertyValue('--文字颜色').trim()
  let 边框色值 = 计算样式.getPropertyValue('--边框颜色').trim()
  let 卡片背景值 = 计算样式.getPropertyValue('--卡片背景颜色').trim()
  let 主色调值 = 计算样式.getPropertyValue('--主色调').trim()
  let 背景色 = 背景色值 === '' ? '#1e1e2e' : 背景色值
  let 文字色 = 文字色值 === '' ? '#cdd6f4' : 文字色值
  let 边框色 = 边框色值 === '' ? '#45475a' : 边框色值
  let 卡片背景 = 卡片背景值 === '' ? '#313244' : 卡片背景值
  let 主色调 = 主色调值 === '' ? '#89b4fa' : 主色调值

  克隆svg.style.backgroundColor = 背景色
  替换SVG变量(克隆svg, {
    'var(--主要背景颜色)': 背景色,
    'var(--文字颜色)': 文字色,
    'var(--边框颜色)': 边框色,
    'var(--卡片背景颜色)': 卡片背景,
    'var(--主色调)': 主色调,
  })

  let 序列化器 = new XMLSerializer()
  let svgString = 序列化器.serializeToString(克隆svg)
  let blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  let url = URL.createObjectURL(blob)

  let 链接 = document.createElement('a')
  链接.href = url
  链接.download = 'fca-lattice.svg'
  链接.click()
  URL.revokeObjectURL(url)
}

export function 导出PNG(svg元素: SVGSVGElement | null, svg容器: HTMLDivElement): void {
  if (svg元素 === null) return

  let 克隆svg = svg元素.cloneNode(true) as SVGSVGElement

  // 获取计算后的 CSS 变量值并内联
  let 计算样式 = getComputedStyle(document.documentElement)
  let 背景色值 = 计算样式.getPropertyValue('--主要背景颜色').trim()
  let 文字色值 = 计算样式.getPropertyValue('--文字颜色').trim()
  let 边框色值 = 计算样式.getPropertyValue('--边框颜色').trim()
  let 卡片背景值 = 计算样式.getPropertyValue('--卡片背景颜色').trim()
  let 主色调值 = 计算样式.getPropertyValue('--主色调').trim()
  let 背景色 = 背景色值 === '' ? '#1e1e2e' : 背景色值
  let 文字色 = 文字色值 === '' ? '#cdd6f4' : 文字色值
  let 边框色 = 边框色值 === '' ? '#45475a' : 边框色值
  let 卡片背景 = 卡片背景值 === '' ? '#313244' : 卡片背景值
  let 主色调 = 主色调值 === '' ? '#89b4fa' : 主色调值

  克隆svg.style.backgroundColor = 背景色
  替换SVG变量(克隆svg, {
    'var(--主要背景颜色)': 背景色,
    'var(--文字颜色)': 文字色,
    'var(--边框颜色)': 边框色,
    'var(--卡片背景颜色)': 卡片背景,
    'var(--主色调)': 主色调,
  })

  // 设置实际像素尺寸
  let 宽度 = svg容器.clientWidth === 0 ? 800 : svg容器.clientWidth
  let 高度 = svg容器.clientHeight === 0 ? 600 : svg容器.clientHeight
  let 缩放倍数 = 2
  克隆svg.setAttribute('width', (宽度 * 缩放倍数).toString())
  克隆svg.setAttribute('height', (高度 * 缩放倍数).toString())

  let 序列化器 = new XMLSerializer()
  let svgString = 序列化器.serializeToString(克隆svg)
  let blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  let url = URL.createObjectURL(blob)

  let img = new Image()
  img.onload = (): void => {
    let canvas = document.createElement('canvas')
    canvas.width = 宽度 * 缩放倍数
    canvas.height = 高度 * 缩放倍数
    let ctx = canvas.getContext('2d')
    if (ctx === null) return

    ctx.fillStyle = 背景色
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)

    canvas.toBlob((pngBlob) => {
      if (pngBlob === null) return
      let pngUrl = URL.createObjectURL(pngBlob)
      let 链接 = document.createElement('a')
      链接.href = pngUrl
      链接.download = 'fca-lattice.png'
      链接.click()
      URL.revokeObjectURL(pngUrl)
    }, 'image/png')

    URL.revokeObjectURL(url)
  }
  img.src = url
}

function 替换SVG变量(元素: Element, 变量映射: Record<string, string>): void {
  // 替换所有属性中的 CSS 变量
  for (let i = 0; i < 元素.attributes.length; i++) {
    let 属性 = 元素.attributes[i]
    if (属性 === undefined) continue
    let 值 = 属性.value
    for (let [变量, 实际值] of Object.entries(变量映射)) {
      值 = 值.replaceAll(变量, 实际值)
    }
    属性.value = 值
  }

  // 替换 style 属性
  if (元素 instanceof SVGElement || 元素 instanceof HTMLElement) {
    let 样式文本 = 元素.getAttribute('style')
    if (样式文本 !== null) {
      for (let [变量, 实际值] of Object.entries(变量映射)) {
        样式文本 = 样式文本.replaceAll(变量, 实际值)
      }
      元素.setAttribute('style', 样式文本)
    }
  }

  // 递归处理子元素
  for (let i = 0; i < 元素.children.length; i++) {
    let 子元素 = 元素.children[i]
    if (子元素 === undefined) continue
    替换SVG变量(子元素, 变量映射)
  }
}
