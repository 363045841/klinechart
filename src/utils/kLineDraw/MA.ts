import type { KLineData } from "@/types/price"
import type { drawOption, PriceRange } from "./kLine"
import { priceToY } from "../priceToY"

const maCache = new Map<string, { dataLen: number; values: number[] }>()

export function clearMACache() {
    maCache.clear()
}

function calcMAx(data: KLineData[], period: number): number[] {
    const cacheKey = `ma${period}`
    const cached = maCache.get(cacheKey)

    if (cached && cached.dataLen === data.length) {
        return cached.values
    }

    const n = data.length
    if (period <= 0 || n < period) {
        maCache.set(cacheKey, { dataLen: n, values: [] })
        return []
    }

    let windowSum = 0
    for (let i = 0; i < period; i++) {
        windowSum += data[i]!.close
    }

    const out: number[] = new Array(n - period + 1)
    out[0] = windowSum / period

    for (let i = period; i < n; i++) {
        windowSum += data[i]!.close - data[i - period]!.close
        out[i - period + 1] = windowSum / period
    }

    maCache.set(cacheKey, { dataLen: n, values: out })
    return out
}

/**
 * 绘制MA线 - 仅可视范围
 * 调用前需已 ctx.translate(-scrollLeft, 0)
 */
function drawMALine(
    ctx: CanvasRenderingContext2D,
    data: KLineData[],
    option: drawOption,
    logicHeight: number,
    period: number,
    color: string,
    dpr: number = 1,
    kStartIndex: number = 0,
    kEndIndex: number = data.length,
    priceRange?: PriceRange,
) {
    if (data.length === 0) return

    const ma = calcMAx(data, period)
    if (ma.length === 0) return

    const height = logicHeight
    const wantPad = option.yPaddingPx ?? 0
    const pad = Math.max(0, Math.min(wantPad, Math.floor(height / 2) - 1))
    const paddingTop = pad
    const paddingBottom = pad

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

    if (!Number.isFinite(maxPrice) || !Number.isFinite(minPrice) || maxPrice <= minPrice) return

    const unit = option.kWidth + option.kGap

    const maStart = Math.max(0, kStartIndex - (period - 1))
    const maEnd = Math.min(ma.length, kEndIndex - (period - 1) + 1)

    if (maStart >= maEnd) return

    ctx.strokeStyle = color
    ctx.lineWidth = 2 / dpr
    ctx.beginPath()

    let started = false

    for (let i = maStart; i < maEnd; i++) {
        const maValue = ma[i]
        if (!Number.isFinite(maValue)) continue

        const y = priceToY(maValue, maxPrice, minPrice, height, paddingTop, paddingBottom)
        if (!Number.isFinite(y)) continue

        const kIndex = i + (period - 1)
        /* 直接用世界坐标 */
        const x = option.kGap + kIndex * unit + option.kWidth / 2

        if (!started) {
            ctx.moveTo(x, y)
            started = true
        } else {
            ctx.lineTo(x, y)
        }
    }

    if (started) ctx.stroke()
}

export function drawMA5Line(
    ctx: CanvasRenderingContext2D,
    data: KLineData[],
    option: drawOption,
    logicHeight: number,
    dpr: number = 1,
    kStartIndex: number = 0,
    kEndIndex: number = data.length,
    priceRange?: PriceRange,
) {
    drawMALine(ctx, data, option, logicHeight, 5, "rgba(251, 186, 62, 1)", dpr, kStartIndex, kEndIndex, priceRange)
}

export function drawMA10Line(
    ctx: CanvasRenderingContext2D,
    data: KLineData[],
    option: drawOption,
    logicHeight: number,
    dpr: number = 1,
    kStartIndex: number = 0,
    kEndIndex: number = data.length,
    priceRange?: PriceRange,
) {
    drawMALine(ctx, data, option, logicHeight, 10, "rgba(190, 131, 12, 1)", dpr, kStartIndex, kEndIndex, priceRange)
}

export function drawMA20Line(
    ctx: CanvasRenderingContext2D,
    data: KLineData[],
    option: drawOption,
    logicHeight: number,
    dpr: number = 1,
    kStartIndex: number = 0,
    kEndIndex: number = data.length,
    priceRange?: PriceRange,
) {
    drawMALine(ctx, data, option, logicHeight, 20, "rgba(69, 112, 249, 1)", dpr, kStartIndex, kEndIndex, priceRange)
}