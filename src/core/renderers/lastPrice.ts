import type { PaneRenderer } from '@/core/layout/pane'
import { drawLastPriceDashedLine } from '@/utils/kLineDraw/axis'

/**
 * 最新价虚线：画在 plotCanvas 的 world 坐标系（需 translate(-scrollLeft,0)）
 */
export const LastPriceLineRenderer: PaneRenderer = {
    draw({ ctx, pane, data, range, scrollLeft, kWidth, kGap, dpr }) {
        const lastIdx = Math.min(range.end - 1, data.length - 1)
        const last = data[lastIdx]
        if (!last) return

        ctx.save()
        ctx.translate(-scrollLeft, 0)

        drawLastPriceDashedLine(ctx, {
            plotWidth: ctx.canvas.width / dpr,
            plotHeight: pane.height,
            scrollLeft,
            startIndex: range.start,
            endIndex: range.end,
            kWidth,
            kGap,
            priceRange: pane.priceRange,
            lastPrice: last.close,
            yPaddingPx: 0,
            dpr,
        })

        ctx.restore()
    },
}

