import { alignToPhysicalPixelCenter, roundToPhysicalPixel } from '@/core/draw/pixelAlign'
import { BORDER_COLORS } from '@/core/theme/colors'

/**
 * 绘制所有 pane 的外边框
 * @param ctx Canvas 绘图上下文
 * @param dpr 设备像素比
 * @param plotWidth 绘图区宽度
 * @param panes pane 数组，每个包含 top 和 height 属性
 * @param color 边框颜色
 */
export function drawAllPanesBorders(args: {
    ctx: CanvasRenderingContext2D
    dpr: number
    plotWidth: number
    panes: Array<{ top: number; height: number }>
    color?: string
}) {
    const { ctx, dpr, plotWidth, panes, color = BORDER_COLORS.DARK } = args
    if (panes.length === 0) return

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 3

    const margin = 1.5 / dpr
    const x1 = alignToPhysicalPixelCenter(margin, dpr)
    const x2 = alignToPhysicalPixelCenter(plotWidth - margin, dpr)
    let outerTop = Infinity
    let outerBottom = -Infinity
    for (const p of panes) {
        outerTop = Math.min(outerTop, p.top)
        outerBottom = Math.max(outerBottom, p.top + p.height)
    }
    outerTop = Number.isFinite(outerTop) ? outerTop : 0
    outerBottom = Number.isFinite(outerBottom) ? outerBottom : 0

    ctx.beginPath()
    const firstPane = panes[0]!
    const y1 = alignToPhysicalPixelCenter(firstPane.top + margin, dpr)
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y1)
    const lastPane = panes[panes.length - 1]!
    const y2 = alignToPhysicalPixelCenter(lastPane.top + lastPane.height - margin, dpr)
    ctx.moveTo(x1, y2)
    ctx.lineTo(x2, y2)
    const yTop = alignToPhysicalPixelCenter(outerTop + margin, dpr)
    const yBottom = roundToPhysicalPixel(outerBottom - margin, dpr)
    ctx.moveTo(x1, yTop)
    ctx.lineTo(x1, yBottom)
    ctx.moveTo(x2, yTop)
    ctx.lineTo(x2, yBottom)
    for (let i = 1; i < panes.length; i++) {
        const currentPane = panes[i]!
        const y = alignToPhysicalPixelCenter(currentPane.top, dpr)
        ctx.moveTo(x1, y)
        ctx.lineTo(x2, y)
    }

    ctx.stroke()
    ctx.restore()
}