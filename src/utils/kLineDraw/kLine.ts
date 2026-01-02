import { getKLineTrend, type kLineTrend } from '@/types/kLine'
import type { KLineData } from '@/types/price'
import { priceToY } from '../priceToY'

export interface drawOption {
  kWidth: number
  kGap: number
  yPaddingPx?: number
}

export interface PriceRange {
  maxPrice: number
  minPrice: number
}

const UP_COLOR = 'rgba(214, 10, 34, 1)'
const DOWN_COLOR = 'rgba(3, 123, 102, 1)'

/**
 * K线图绘制 - 仅渲染指定索引范围
 */
export function kLineDraw(
  ctx: CanvasRenderingContext2D,
  data: KLineData[],
  option: drawOption,
  logicHeight: number,
  dpr: number = 1,
  startIndex: number = 0,
  endIndex: number = data.length,
  offsetX: number = 0,
  priceRange?: PriceRange,
) {
  if (data.length === 0) return

  const height = logicHeight

  /* 处理上下留白 */
  const wantPad = option.yPaddingPx ?? 0
  const pad = Math.max(0, Math.min(wantPad, Math.floor(height / 2) - 1))
  const paddingTop = pad
  const paddingBottom = pad

  /* 价格范围 */
  let maxPrice: number
  let minPrice: number

  if (priceRange) {
    maxPrice = priceRange.maxPrice
    minPrice = priceRange.minPrice
  } else {
    maxPrice = -Infinity
    minPrice = Infinity
    for (let i = 0; i < data.length; i++) {
      const e = data[i]
      if (e.high > maxPrice) maxPrice = e.high
      if (e.low < minPrice) minPrice = e.low
    }
  }

  if (!Number.isFinite(maxPrice) || !Number.isFinite(minPrice)) return

  const unit = option.kWidth + option.kGap

  /* 仅遍历可视范围 */
  for (let i = startIndex; i < endIndex && i < data.length; i++) {
    const e = data[i]
    if (!e) continue

    const highY = priceToY(e.high, maxPrice, minPrice, height, paddingTop, paddingBottom)
    const lowY = priceToY(e.low, maxPrice, minPrice, height, paddingTop, paddingBottom)
    const openY = priceToY(e.open, maxPrice, minPrice, height, paddingTop, paddingBottom)
    const closeY = priceToY(e.close, maxPrice, minPrice, height, paddingTop, paddingBottom)

    /* 世界坐标 + 偏移 = 画布坐标 */
    const rectX = option.kGap + i * unit + offsetX
    const rectY = Math.min(openY, closeY)
    const rectHeight = Math.max(Math.abs(openY - closeY), 2 / dpr)

    const trend: kLineTrend = getKLineTrend(e)
    const color = trend === 'up' ? UP_COLOR : DOWN_COLOR

    /* 实体 */
    ctx.fillStyle = color
    ctx.fillRect(rectX, rectY, option.kWidth, rectHeight)

    /* 影线 */
    ctx.strokeStyle = color
    ctx.lineWidth = 2 / dpr
    const cx = rectX + option.kWidth / 2

    ctx.beginPath()
    ctx.moveTo(cx, highY)
    ctx.lineTo(cx, lowY)
    ctx.stroke()
  }
}