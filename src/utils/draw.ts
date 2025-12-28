import { getKLineTrend, type kLineTrend } from '@/types/kLine'
import type { KLineData } from '@/types/price'

interface drawOption {
  kWidth: number
  kGap: number
  /** 上下各留白像素 */
  yPaddingPx?: number
}

function priceToY(
  price: number,
  maxPrice: number,
  minPrice: number,
  canvasHeight: number,
  paddingTop: number,
  paddingBottom: number,
): number {
  const range = maxPrice - minPrice || 1
  const ratio = (price - minPrice) / range

  const viewHeight = Math.max(1, canvasHeight - paddingTop - paddingBottom)
  return paddingTop + viewHeight * (1 - ratio)
}

export function draw(
  ctx: CanvasRenderingContext2D,
  data: KLineData[],
  option: drawOption,
  logicHeight: number,
  dpr: number = 1,
) {
  if (data.length === 0) return

  const height = logicHeight

  // 1) 处理上下留白像素
  const wantPad = option.yPaddingPx ?? 0
  // 防止留白过大：最多只能用掉高度的一半（否则 viewHeight<=0）
  const pad = Math.max(0, Math.min(wantPad, Math.floor(height / 2) - 1))
  const paddingTop = pad
  const paddingBottom = pad

  // 2) 价格范围（不再扩展，用像素留白来做空间）
  const maxPrice = data.reduce((acc, cur) => Math.max(acc, cur.maxPrice), -Infinity)
  const minPrice = data.reduce((acc, cur) => Math.min(acc, cur.minPrice), Infinity)

  ctx.lineWidth = 1 / dpr

  let rectX = option.kGap

  for (let i = 0; i < data.length; i++) {
    const e = data[i]
    if (!e) continue

    const highY = priceToY(e.maxPrice, maxPrice, minPrice, height, paddingTop, paddingBottom)
    const lowY = priceToY(e.minPrice, maxPrice, minPrice, height, paddingTop, paddingBottom)
    const openY = priceToY(e.open, maxPrice, minPrice, height, paddingTop, paddingBottom)
    const closeY = priceToY(e.close, maxPrice, minPrice, height, paddingTop, paddingBottom)

    const rectY = Math.min(openY, closeY)
    const rectHeight = Math.abs(openY - closeY) || 1

    const trend: kLineTrend = getKLineTrend(e)
    const color = trend === 'up' ? 'red' : 'green'

    // 实体
    ctx.fillStyle = color
    ctx.fillRect(rectX, rectY, option.kWidth, rectHeight)

    // 影线
    ctx.strokeStyle = color
    ctx.lineWidth = 3 / dpr
    const cx = rectX + option.kWidth / 2

    ctx.beginPath()
    ctx.moveTo(cx, highY)
    ctx.lineTo(cx, rectY)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx, rectY + rectHeight)
    ctx.lineTo(cx, lowY)
    ctx.stroke()

    rectX += option.kWidth + option.kGap
  }
}
