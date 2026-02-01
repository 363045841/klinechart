import { TEXT_COLORS } from '@/core/theme/colors'

/**
 * Ø6 pane ˜
 * @param ctx Canvas Øþ
‡
 * @param dpr ¾Ï Ô
 * @param paneTop pane vèMn
 * @param title ˜‡,
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
