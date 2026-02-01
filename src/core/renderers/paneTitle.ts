import { TEXT_COLORS } from '@/core/theme/colors'

/**
 * 绘制 pane 标题
 * @param ctx Canvas 上下文
 * @param dpr 设备像素比
 * @param paneTop pane 顶部偏移
 * @param title 标题文本
 */
export function drawPaneTitle(args: {
    ctx: CanvasRenderingContext2D
    dpr: number
    paneTop: number
    title: string
}) {
    const { ctx, dpr, paneTop, title } = args
    ctx.save()
    ctx.font = `12px Arial`
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    ctx.fillStyle = TEXT_COLORS.TERTIARY
    const x = 8
    const y = paneTop + 8
    ctx.fillText(title, x, y)
    ctx.restore()
}
