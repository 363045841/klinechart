import type { Chart } from '../chart'

/**
 * 交互控制器：只依赖 Chart 公共 API，不依赖 Vue。
 * 先落地：拖拽滚动 / wheel 缩放。
 * hover/crosshair 后续按同样方式接入。
 */
export class InteractionController {
    private chart: Chart
    private isDragging = false
    private dragStartX = 0
    private scrollStartX = 0

    // ===== Crosshair / Hover 状态（给渲染与 Vue tooltip 使用） =====
    crosshairPos: { x: number; y: number } | null = null
    crosshairIndex: number | null = null
    hoveredIndex: number | null = null
    activePaneId: string | null = null
    tooltipPos: { x: number; y: number } = { x: 0, y: 0 }
    tooltipSize: { width: number; height: number } = { width: 220, height: 180 }

    constructor(chart: Chart) {
        this.chart = chart
    }

    onMouseDown(e: MouseEvent) {
        if (e.button !== 0) return
        const container = this.chart.getDom().container
        this.isDragging = true
        this.clearHover()
        this.dragStartX = e.clientX
        this.scrollStartX = container.scrollLeft
        e.preventDefault()
    }

    onMouseMove(e: MouseEvent) {
        const container = this.chart.getDom().container
        if (this.isDragging) {
            const deltaX = this.dragStartX - e.clientX
            container.scrollLeft = this.scrollStartX + deltaX
            return
        }

        this.updateHover(e)
        this.chart.scheduleDraw()
    }

    onMouseUp() {
        this.isDragging = false
    }

    onMouseLeave() {
        this.isDragging = false
        this.clearHover()
        this.chart.scheduleDraw()
    }

    onScroll() {
        this.clearHover()
        this.chart.scheduleDraw()
    }

    onWheel(e: WheelEvent) {
        const container = this.chart.getDom().container
        const rect = container.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const scrollLeft = container.scrollLeft

        this.clearHover()
        this.chart.zoomAt(mouseX, scrollLeft, e.deltaY)
    }

    setTooltipSize(size: { width: number; height: number }) {
        this.tooltipSize = size
    }

    private clearHover() {
        this.crosshairPos = null
        this.crosshairIndex = null
        this.hoveredIndex = null
        this.activePaneId = null
    }

    private updateHover(e: MouseEvent) {
        const container = this.chart.getDom().container
        const rect = container.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const opt = this.chart.getOption()
        const viewWidth = Math.max(1, Math.round(rect.width))
        const viewHeight = Math.max(1, Math.round(rect.height))
        const plotWidth = viewWidth - opt.rightAxisWidth
        const plotHeight = viewHeight - opt.bottomAxisHeight

        if (mouseX < 0 || mouseY < 0 || mouseX > plotWidth || mouseY > plotHeight) {
            this.clearHover()
            return
        }

        const scrollLeft = container.scrollLeft
        const unit = opt.kWidth + opt.kGap
        const worldX = scrollLeft + mouseX
        const offset = worldX - opt.kGap
        if (offset < 0) {
            this.clearHover()
            return
        }

        const data = this.chart.getData()
        const idx = Math.floor(offset / unit)

        // pane 选择：按鼠标 y 落在哪个 pane（先基于 layout.top/height）
        const panes = this.chart.getPanes()
        const pane = panes.find((p) => mouseY >= p.top && mouseY <= p.top + p.height)
        if (!pane) {
            // 鼠标在 plot 区域但落在 paneGap 上：仍显示 crosshair（不属于任何 pane），但不显示 tooltip/label
            this.activePaneId = null
        } else {
            this.activePaneId = pane.id
        }

        // ===== 十字线：只要在 plot 区域内就显示（不要求命中 K 线） =====
        // X 方向仍吸附到最近 K（如果 idx 有效），否则保持 mouseX。
        if (idx >= 0 && idx < (data?.length ?? 0)) {
            this.crosshairIndex = idx
            const centerWorldX = opt.kGap + idx * unit + opt.kWidth / 2
            const snappedX = centerWorldX - scrollLeft
            this.crosshairPos = {
                x: Math.min(Math.max(snappedX, 0), plotWidth),
                y: Math.min(Math.max(mouseY, 0), plotHeight),
            }
        } else {
            this.crosshairIndex = null
            this.crosshairPos = {
                x: Math.min(Math.max(mouseX, 0), plotWidth),
                y: Math.min(Math.max(mouseY, 0), plotHeight),
            }
        }

        // ===== Tooltip 命中判定：仍要求命中 candle body/wick 才显示 tooltip =====
        const k = typeof this.crosshairIndex === 'number' ? data[this.crosshairIndex] : undefined
        if (!k || !pane) {
            this.hoveredIndex = null
            return
        }

        const localY = mouseY - pane.top
        const openY = pane.yAxis.priceToY(k.open)
        const closeY = pane.yAxis.priceToY(k.close)
        const highY = pane.yAxis.priceToY(k.high)
        const lowY = pane.yAxis.priceToY(k.low)
        const bodyTop = Math.min(openY, closeY)
        const bodyBottom = Math.max(openY, closeY)

        const inUnitX = offset - (this.crosshairIndex as number) * unit
        const HIT_WICK_HALF = 3
        const cx = opt.kWidth / 2
        const hitBody = localY >= bodyTop && localY <= bodyBottom && inUnitX >= 0 && inUnitX <= opt.kWidth
        const hitWick = Math.abs(inUnitX - cx) <= HIT_WICK_HALF && localY >= highY && localY <= lowY

        if (!hitBody && !hitWick) {
            this.hoveredIndex = null
            return
        }

        this.hoveredIndex = this.crosshairIndex

        // tooltip 防溢出定位（复用旧逻辑）
        const padding = 12
        const preferGap = 14
        const tooltipW = this.tooltipSize.width
        const tooltipH = this.tooltipSize.height
        const rightX = mouseX + preferGap
        const leftX = mouseX - preferGap - tooltipW
        const desiredX = rightX + tooltipW + padding <= viewWidth ? rightX : leftX

        const desiredY = mouseY + preferGap
        const maxX = Math.max(padding, viewWidth - tooltipW - padding)
        const maxY = Math.max(padding, viewHeight - tooltipH - padding)
        this.tooltipPos = {
            x: Math.min(Math.max(desiredX, padding), maxX),
            y: Math.min(Math.max(desiredY, padding), maxY),
        }
    }
}
