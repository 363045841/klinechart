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
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    const x = 8
    const y = paneTop + 8
    ctx.fillText(title, x, y)
    ctx.restore()
}

