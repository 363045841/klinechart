import { alignToPhysicalPixelCenter } from '@/core/draw/pixelAlign'
import { BORDER_COLORS } from '@/core/theme/colors'

/**
 * 绘制 pane 边框
 * @param ctx Canvas 绘图上下文
 * @param dpr 设备像素比
 * @param width 绘图区宽度
 * @param panes pane 数组，每个包含 top 和 height 属性
 * @param color 边框颜色
 * @param omitOuterTop 是否忽略上边界
 * @param omitOuterRight 是否忽略右边界
 * @param omitOuterBottom 是否忽略下边界
 * @param omitOuterLeft 是否忽略左边界
 */
export function drawPaneBorders(args: {
    ctx: CanvasRenderingContext2D
    dpr: number
    width: number
    panes: Array<{ top: number; height: number }>
    color?: string
    omitOuterTop?: boolean
    omitOuterRight?: boolean
    omitOuterBottom?: boolean
    omitOuterLeft?: boolean
}) {
    const {
        ctx,
        dpr,
        width,
        panes,
        color = BORDER_COLORS.DARK,
        omitOuterTop = false,
        omitOuterRight = false,
        omitOuterBottom = false,
        omitOuterLeft = false,
    } = args
    if (!panes.length) return

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 20

    const margin = 10 / dpr
    const x1 = alignToPhysicalPixelCenter(margin, dpr)
    const x2 = alignToPhysicalPixelCenter(width - margin, dpr)
    let outerTop = Infinity
    let outerBottom = -Infinity
    for (const p of panes) {
        outerTop = Math.min(outerTop, p.top)
        outerBottom = Math.max(outerBottom, p.top + p.height)
    }
    outerTop = Number.isFinite(outerTop) ? outerTop : 0
    outerBottom = Number.isFinite(outerBottom) ? outerBottom : 0

    for (const p of panes) {
        const y1 = alignToPhysicalPixelCenter(p.top, dpr)
        const y2 = alignToPhysicalPixelCenter(p.top + p.height, dpr)

        const isOuterTop = Math.abs(p.top - outerTop) < 1e-6
        const isOuterBottom = Math.abs(p.top + p.height - outerBottom) < 1e-6

        ctx.beginPath()
        if (!(omitOuterTop && isOuterTop)) {
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y1)
        }
        if (!omitOuterRight) {
            ctx.moveTo(x2, y1)
            ctx.lineTo(x2, y2)
        }
        if (!(omitOuterBottom && isOuterBottom)) {
            ctx.moveTo(x1, y2)
            ctx.lineTo(x2, y2)
        }
        if (!omitOuterLeft) {
            ctx.moveTo(x1, y1)
            ctx.lineTo(x1, y2)
        }

        ctx.stroke()
    }

    ctx.restore()
}