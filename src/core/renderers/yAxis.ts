import type { PaneRenderer } from '@/core/layout/pane'
import { drawPriceAxis } from '@/utils/kLineDraw/axis'

/**
 * 创建 Y 轴渲染器，每个 pane 各画一段，复用 drawPriceAxis
 * @param opts 配置选项
 * @param opts.axisX 轴的横坐标
 * @param opts.axisWidth 轴宽度
 * @param opts.yPaddingPx 垂直内边距
 * @param opts.ticks 刻度数量（可选，默认根据 pane 高度自动计算）
 * @returns PaneRenderer 实例
 */
export function createYAxisRenderer(opts: {
    axisX: number
    axisWidth: number
    yPaddingPx: number
    ticks?: number
}): PaneRenderer {
    return {
        draw({ ctx, pane, dpr, paneWidth: _paneWidth }) {
            const ticks = typeof opts.ticks === 'number' ? opts.ticks : Math.max(2, Math.min(8, Math.round(pane.height / 80)))
            drawPriceAxis(ctx, {
                x: opts.axisX,
                y: pane.top,
                width: opts.axisWidth,
                height: pane.height,
                priceRange: pane.priceRange,
                yPaddingPx: opts.yPaddingPx,
                dpr,
                ticks,
                drawLeftBorder: false,
                drawTickLines: false,
            })
        },
    }
}