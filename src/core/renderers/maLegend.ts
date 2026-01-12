import type { MAFlags } from '@/core/renderers/ma'
import type { KLineData } from '@/types/price'
import { calcMAAtIndex } from '@/utils/kline/ma'
import { MA10_COLOR, MA20_COLOR, MA5_COLOR } from '@/utils/kLineDraw/MA'

export function drawMALegend(args: {
    ctx: CanvasRenderingContext2D
    data: KLineData[]
    endIndex: number
    showMA: MAFlags
    dpr: number
}) {
    const { ctx, data, endIndex, showMA } = args
    if (!data.length) return

    const legendX = 8
    const legendY = 8
    const fontSize = 12
    const gap = 10

    ctx.save()
    ctx.font = `${fontSize}px Arial`
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'

    const lastIndex = Math.min(endIndex - 1, data.length - 1)

    const items: Array<{ label: string; color: string; value?: number }> = []
    if (showMA.ma5) items.push({ label: 'MA5', color: MA5_COLOR, value: calcMAAtIndex(data, lastIndex, 5) })
    if (showMA.ma10) items.push({ label: 'MA10', color: MA10_COLOR, value: calcMAAtIndex(data, lastIndex, 10) })
    if (showMA.ma20) items.push({ label: 'MA20', color: MA20_COLOR, value: calcMAAtIndex(data, lastIndex, 20) })

    if (items.length > 0) {
        const paddingX = 8
        const paddingY = 6

        let contentWidth = ctx.measureText('均线').width + gap
        for (const it of items) {
            const valText = typeof it.value === 'number' ? ` ${it.value.toFixed(2)}` : ''
            contentWidth += ctx.measureText(`${it.label}${valText}`).width + gap
        }
        contentWidth -= gap

        const bgW = Math.ceil(contentWidth + paddingX * 2)
        const bgH = Math.ceil(fontSize + paddingY * 2)

        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.fillRect(legendX, legendY, bgW, bgH)

        let x = legendX + paddingX
        const y = legendY + paddingY

        ctx.fillStyle = '#333'
        ctx.fillText('均线', x, y)
        x += ctx.measureText('均线').width + gap

        for (const it of items) {
            const valText = typeof it.value === 'number' ? ` ${it.value.toFixed(2)}` : ''
            const text = `${it.label}${valText}`
            ctx.fillStyle = it.color
            ctx.fillText(text, x, y)
            x += ctx.measureText(text).width + gap
        }
    }

    ctx.restore()
}

