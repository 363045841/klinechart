import type { KLineData } from '@/types/price'
import { drawTimeAxis, drawCrosshairTimeLabel } from '@/utils/kLineDraw/axis'

export function drawTimeAxisLayer(args: {
    ctx: CanvasRenderingContext2D
    data: KLineData[]
    scrollLeft: number
    kWidth: number
    kGap: number
    startIndex: number
    endIndex: number
    dpr: number
    crosshair?: { x: number; index: number } | null
}) {
    const { ctx, data, scrollLeft, kWidth, kGap, startIndex, endIndex, dpr, crosshair } = args
    const w = ctx.canvas.width / dpr
    const h = ctx.canvas.height / dpr

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    drawTimeAxis(ctx, {
        x: 0,
        y: 0,
        width: w,
        height: h,
        data,
        scrollLeft,
        kWidth,
        kGap,
        startIndex,
        endIndex,
        dpr,
    })

    if (crosshair && typeof crosshair.index === 'number') {
        const k = data[crosshair.index]
        if (k) {
            drawCrosshairTimeLabel(ctx, {
                x: 0,
                y: 0,
                width: w,
                height: h,
                crosshairX: crosshair.x,
                timestamp: k.timestamp,
                dpr,
            })
        }
    }
}

