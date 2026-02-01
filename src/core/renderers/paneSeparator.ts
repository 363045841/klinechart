import { createHorizontalLineRect } from '@/core/draw/pixelAlign'
import { BORDER_COLORS } from '@/core/theme/colors'

/**
 * 绘制 pane 之间的分隔线
 * @param ctx Canvas 绘图上下文
 * @param dpr 设备像素比
 * @param plotWidth 绘图区宽度
 * @param panes pane 数组，每个包含 top 和 height 属性
 * @param color 分隔线颜色
 */
export function drawPaneSeparators(args: {
    ctx: CanvasRenderingContext2D
    dpr: number
    plotWidth: number
    panes: Array<{ top: number; height: number }>
    color?: string
}) {
    const { ctx, dpr, plotWidth, panes, color = BORDER_COLORS.SEPARATOR } = args
    if (panes.length <= 1) return

    ctx.save()
    ctx.fillStyle = color

    const margin = 0.5 / dpr
    for (let i = 1; i < panes.length; i++) {
        const p = panes[i]
        if (!p) continue

        const y = p.top - margin

        const h = createHorizontalLineRect(0, plotWidth, y, dpr)
        if (h) ctx.fillRect(h.x, h.y, h.width, h.height)
    }

    ctx.restore()
}