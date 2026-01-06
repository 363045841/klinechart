import type { KLineData } from '@/types/price'
import { priceToY } from '../priceToY'
import { alignToPhysicalPixelCenter, roundToPhysicalPixel } from './pixelAlign'

export interface PriceAxisOptions {
    x: number
    y: number
    width: number
    height: number
    priceRange: { maxPrice: number; minPrice: number }
    yPaddingPx?: number
    dpr: number
    ticks?: number
    bgColor?: string
    textColor?: string
    lineColor?: string
    fontSize?: number
    paddingX?: number
}

/** 右侧价格轴（固定，不随 translate/scroll 变化） */
export function drawPriceAxis(ctx: CanvasRenderingContext2D, opts: PriceAxisOptions) {
    const {
        x,
        y,
        width,
        height,
        priceRange,
        yPaddingPx = 0,
        dpr,
        ticks = 10,
        bgColor = 'rgba(255,255,255,0.85)',
        textColor = 'rgba(0,0,0,0.65)',
        lineColor = 'rgba(0,0,0,0.12)',
        fontSize = 16,
        paddingX = 12,
    } = opts

    const wantPad = yPaddingPx
    const pad = Math.max(0, Math.min(wantPad, Math.floor(height / 2) - 1))

    const { maxPrice, minPrice } = priceRange
    const range = maxPrice - minPrice
    const step = range === 0 ? 0 : range / (Math.max(2, ticks) - 1)

    // 背景
    ctx.fillStyle = bgColor
    ctx.fillRect(x, y, width, height)

    // 左边界线
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(alignToPhysicalPixelCenter(x, dpr), y)
    ctx.lineTo(alignToPhysicalPixelCenter(x, dpr), y + height)
    ctx.stroke()

    ctx.font = `${fontSize}px -apple-system,BlinkMacSystemFont,Trebuchet MS,Roboto,Ubuntu,sans-serif`
    ctx.textBaseline = 'middle'
    // 价格轴文字靠左对齐（文字从轴区域左侧往右绘制）
    ctx.textAlign = 'left'

    const textX = x + paddingX

    for (let i = 0; i < Math.max(2, ticks); i++) {
        const p = range === 0 ? maxPrice : maxPrice - step * i
        const yy = priceToY(p, maxPrice, minPrice, height, pad, pad) + y

        // 刻度短线
        ctx.strokeStyle = lineColor
        ctx.beginPath()
        const lineY = alignToPhysicalPixelCenter(yy, dpr)
        ctx.moveTo(x, lineY)
        ctx.lineTo(x + 4, lineY)
        ctx.stroke()

        // 文字
        ctx.fillStyle = textColor
        ctx.fillText(p.toFixed(2), roundToPhysicalPixel(textX, dpr), roundToPhysicalPixel(yy, dpr))
    }
}

export interface TimeAxisOptions {
    x: number
    y: number
    width: number
    height: number
    data: KLineData[]
    scrollLeft: number
    kWidth: number
    kGap: number
    startIndex: number
    endIndex: number
    dpr: number
    bgColor?: string
    textColor?: string
    lineColor?: string
    fontSize?: number
    /** 左右内边距（逻辑像素），避免月份/年份文字贴边 */
    paddingX?: number
}

export interface LastPriceLineOptions {
    /** 绘图区宽度（逻辑像素） */
    plotWidth: number
    /** 绘图区高度（逻辑像素） */
    plotHeight: number
    /** 当前滚动位置（逻辑像素） */
    scrollLeft: number
    /** 可视范围：用于确定虚线的起止 worldX */
    startIndex: number
    endIndex: number
    /** K线布局 */
    kWidth: number
    kGap: number
    /** 价格范围 */
    priceRange: { maxPrice: number; minPrice: number }
    /** 最新价 */
    lastPrice: number
    /** Y轴 padding（与绘图区一致） */
    yPaddingPx?: number
    dpr: number
    color?: string
}

/** 绘制“最新价水平虚线”（画在 plotCanvas 的 world 坐标系：需在 translate(-scrollLeft,0) 之后调用） */
export function drawLastPriceDashedLine(ctx: CanvasRenderingContext2D, opts: LastPriceLineOptions) {
    const {
        plotWidth,
        plotHeight,
        scrollLeft,
        startIndex,
        endIndex,
        kWidth,
        kGap,
        priceRange,
        lastPrice,
        yPaddingPx = 0,
        dpr,
        color = 'rgba(0,0,0,0.28)',
    } = opts

    const { maxPrice, minPrice } = priceRange
    if (!(lastPrice >= minPrice && lastPrice <= maxPrice)) return

    const pad = Math.max(0, Math.min(yPaddingPx, Math.floor(plotHeight / 2) - 1))
    const y = priceToY(lastPrice, maxPrice, minPrice, plotHeight, pad, pad)

    const unit = kWidth + kGap
    const startX = kGap + startIndex * unit
    const endX = kGap + endIndex * unit

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    const yy = alignToPhysicalPixelCenter(y, dpr)
    ctx.moveTo(roundToPhysicalPixel(startX, dpr), yy)
    ctx.lineTo(roundToPhysicalPixel(endX, dpr), yy)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
}

function monthKey(ts: number): string {
    const d = new Date(ts)
    return `${d.getFullYear()}-${d.getMonth()}`
}

function formatMonthOrYear(ts: number): { text: string; isYear: boolean } {
    const d = new Date(ts)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    if (month === 1) return { text: String(year), isYear: true }
    return { text: String(month).padStart(2, '0'), isYear: false }
}

/** 底部时间轴（X方向随 scrollLeft 变化） */
export function drawTimeAxis(ctx: CanvasRenderingContext2D, opts: TimeAxisOptions) {
    const {
        x,
        y,
        width,
        height,
        data,
        scrollLeft,
        kWidth,
        kGap,
        startIndex,
        endIndex,
        dpr,
        bgColor = 'rgba(255,255,255,0.85)',
        textColor = 'rgba(0,0,0,0.65)',
        lineColor = 'rgba(0,0,0,0.12)',
        fontSize = 16,
        paddingX = 12,
    } = opts

    const unit = kWidth + kGap

    // 背景
    ctx.fillStyle = bgColor
    ctx.fillRect(x, y, width, height)

    // 上边界线
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, alignToPhysicalPixelCenter(y, dpr))
    ctx.lineTo(x + width, alignToPhysicalPixelCenter(y, dpr))
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const textY = y + height / 2

    for (let i = Math.max(startIndex, 1); i < endIndex && i < data.length; i++) {
        const cur = data[i]
        const prev = data[i - 1]
        if (!cur || !prev) continue

        if (monthKey(cur.timestamp) !== monthKey(prev.timestamp)) {
            const worldX = kGap + i * unit
            const screenX = worldX - scrollLeft

            // 避免文字/刻度贴边：按左右 padding 收紧可绘制区域
            const minX = paddingX
            const maxX = Math.max(paddingX, width - paddingX)

            if (screenX >= minX && screenX <= maxX) {
                const drawX = Math.min(Math.max(screenX, minX), maxX)
                // 刻度短线
                ctx.strokeStyle = lineColor
                ctx.beginPath()
                const lx = alignToPhysicalPixelCenter(drawX, dpr)
                ctx.moveTo(lx, y)
                ctx.lineTo(lx, y + 4)
                ctx.stroke()

                const { text, isYear } = formatMonthOrYear(cur.timestamp)
                ctx.fillStyle = textColor
                ctx.font = `${isYear ? 'bold ' : ''}${fontSize}px -apple-system,BlinkMacSystemFont,Trebuchet MS,Roboto,Ubuntu,sans-serif`
                ctx.fillText(text, roundToPhysicalPixel(drawX, dpr), roundToPhysicalPixel(textY, dpr))
            }
        }
    }
}
