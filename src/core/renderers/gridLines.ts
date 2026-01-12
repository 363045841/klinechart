import type { PaneRenderer } from '@/core/layout/pane'
import { createHorizontalLineRect, createVerticalLineRect } from '@/utils/kLineDraw/pixelAlign'

/**
 * 仅绘制网格线（不绘制任何文字刻度）。
 * - 横向：按 priceRange 分档
 * - 纵向：按月分割（与时间轴刻度保持“同一规则”，但不画文字）
 */
export const GridLinesRenderer: PaneRenderer = {
    draw({ ctx, pane, data, range, scrollLeft, kWidth, kGap, dpr }) {
        if (!data.length) return

        const unit = kWidth + kGap
        const gridColor = 'rgba(0,0,0,0.06)'

        // 使用与 yAxis 相同的“均匀分档”规则 + priceToY，将 tick 价格映射到与 y 轴完全一致的 y
        const { maxPrice, minPrice } = pane.priceRange
        const priceRange = maxPrice - minPrice
        const targetTickCount = Math.max(2, Math.min(8, Math.round(pane.height / 80)))
        const tickCount = Math.max(2, targetTickCount)
        const step = priceRange === 0 ? 0 : priceRange / (tickCount - 1)

        // 直接复用 pane.yAxis（PriceScale）的 priceToY：
        // - padding/top/bottom 已由 Chart.layoutPanes -> pane.setPadding 写入 PriceScale
        // - 避免从 Pane 上读取不存在的 paddingTop 导致 NaN

        ctx.save()
        ctx.fillStyle = gridColor

        // world 坐标系
        ctx.translate(-scrollLeft, 0)

        // 横线：画满整个绘图区域宽度（不能只画到K线边缘）
        // 当前 ctx 已 translate(-scrollLeft,0)，因此可视区域 worldX 范围为 [scrollLeft, scrollLeft + plotWidth]
        const plotWidth = ctx.canvas.width / dpr
        const startX = scrollLeft
        const endX = scrollLeft + plotWidth

        for (let i = 0; i < tickCount; i++) {
            const p = priceRange === 0 ? maxPrice : maxPrice - step * i
            // 使用 pane.yAxis.priceToY，并对 y 进行四舍五入，与 y 轴保持同一精度
            const y = Math.round(pane.yAxis.priceToY(p))

            const h = createHorizontalLineRect(startX, endX, y, dpr)
            if (h) ctx.fillRect(h.x, h.y, h.width, h.height)
        }

        // 竖线：按月份变化画竖线（不画文字）
        function monthKey(ts: number): string {
            const d = new Date(ts)
            return `${d.getFullYear()}-${d.getMonth()}`
        }

        for (let i = Math.max(range.start, 1); i < range.end && i < data.length; i++) {
            const cur = data[i]
            const prev = data[i - 1]
            if (!cur || !prev) continue
            if (monthKey(cur.timestamp) !== monthKey(prev.timestamp)) {
                const worldX = kGap + i * unit
                const v = createVerticalLineRect(worldX, 0, pane.height, dpr)
                if (v) ctx.fillRect(v.x, v.y, v.width, v.height)
            }
        }

        ctx.restore()
    },
}
