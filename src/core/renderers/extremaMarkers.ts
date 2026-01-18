import type { PaneRenderer } from '@/core/layout/pane'
import { roundToPhysicalPixel, createHorizontalLineRect } from '@/core/draw/pixelAlign'

/**
 * 可视区最高/最低价标注（仅绘制标注，不绘制蜡烛）。
 * 说明：
 * - 使用 pane.yAxis.priceToY 作为 Y 映射（与当前 pane 的 priceRange 一致）
 * - world 坐标绘制（会 translate(-scrollLeft, 0)）
 */
export const ExtremaMarkersRenderer: PaneRenderer = {
    draw({ ctx, pane, data, range, scrollLeft, kWidth, kGap, dpr }) {
        if (!data.length) return

        // 副图占位时不画极值标注（避免空白区域出现无意义标注）
        if (pane.id !== 'main') return

        const start = Math.max(0, range.start)
        const end = Math.min(data.length, range.end)
        if (end - start <= 0) return

        let max = -Infinity
        let min = Infinity
        let maxIndex = start
        let minIndex = start

        for (let i = start; i < end; i++) {
            const e = data[i]
            if (!e) continue
            if (e.high >= max) {
                max = e.high
                maxIndex = i
            }
            if (e.low <= min) {
                min = e.low
                minIndex = i
            }
        }

        if (!Number.isFinite(max) || !Number.isFinite(min)) return

        const unit = kWidth + kGap
        const centerX = (i: number) => kGap + i * unit + kWidth / 2

        ctx.save()
        ctx.translate(-scrollLeft, 0)
        drawPriceMarker(ctx, centerX(maxIndex), pane.yAxis.priceToY(max), max, dpr)
        drawPriceMarker(ctx, centerX(minIndex), pane.yAxis.priceToY(min), min, dpr)
        ctx.restore()
    },
}

function drawPriceMarker(ctx: CanvasRenderingContext2D, x: number, y: number, price: number, dpr: number) {
    const text = price.toFixed(2)
    const padding = 4
    const lineLength = 30
    const dotRadius = 2

    // 引导线
    const lineRect = createHorizontalLineRect(x, x + lineLength, y, dpr)
    if (lineRect) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(lineRect.x, lineRect.y, lineRect.width, lineRect.height)
    }

    // 末端点
    const endX = roundToPhysicalPixel(x + lineLength, dpr)
    const alignedY = roundToPhysicalPixel(y, dpr)
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.beginPath()
    ctx.arc(endX, alignedY, dotRadius, 0, Math.PI * 2)
    ctx.fill()

    // 文本
    ctx.font = '12px Arial'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(0,0,0,0.70)'
    ctx.fillText(text, roundToPhysicalPixel(x + lineLength + padding, dpr), roundToPhysicalPixel(y, dpr))
}
