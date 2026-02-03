import type { PaneRenderer } from '@/core/layout/pane'
import { getKLineTrend, type kLineTrend } from '@/types/kLine'
import { createAlignedKLineFromPx, createVerticalLineRect } from '@/core/draw/pixelAlign'
import { PRICE_COLORS } from '@/core/theme/colors'
import { getPhysicalKLineConfig } from '@/core/chart'
import { VolumePriceRelation } from '@/types/volumePrice'
import { analyzeVolumePriceRelationBatch, DEFAULT_VOLUME_PRICE_CONFIG } from '@/utils/volumePrice'

/**
 * Candle 渲染器：在单个 pane 中绘制 K 线蜡烛图
 * 依赖 pane.yAxis 做 price->y 坐标映射，使用物理像素空间计算避免浮点误差
 */
export const CandleRenderer: PaneRenderer = {
    /**
     * 绘制 K 线蜡烛图
     * @param ctx Canvas 绘图上下文，Chart 已执行 translate(0, pane.top)，y=0 对应 pane 顶部
     * @param pane 当前 pane 实例
     * @param data 全量 K 线数据
     * @param range 当前视口可见的索引范围
     * @param scrollLeft 滚动偏移量，renderer 内部如需 world 坐标需执行 ctx.translate(-scrollLeft, 0)
     * @param kWidth K 线宽度
     * @param kGap K 线间隔
     * @param dpr 设备像素比
     * @param _paneWidth pane 宽度（未使用）
     * @param kLinePositions K 线起始 x 坐标数组（由 Chart 统一计算）
     */
    draw({ ctx, pane, data, range, scrollLeft, kWidth, kGap, dpr, paneWidth: _paneWidth, kLinePositions }) {
        if (!data.length) return

        const { kWidthPx } = getPhysicalKLineConfig(kWidth, kGap, dpr)

        ctx.save()
        ctx.translate(-scrollLeft, 0)

        const positions = kLinePositions || []
        const realPos: number[] = []

        // 批量计算量价关系，使用前缀和优化性能
        const relations = analyzeVolumePriceRelationBatch(
            data,
            range.start,
            range.end,
            DEFAULT_VOLUME_PRICE_CONFIG
        )

        for (let i = range.start; i < range.end && i < data.length; i++) {
            const e = data[i]
            if (!e) continue

            const openY = pane.yAxis.priceToY(e.open)
            const closeY = pane.yAxis.priceToY(e.close)
            const highY = pane.yAxis.priceToY(e.high)
            const lowY = pane.yAxis.priceToY(e.low)

            const rawRectY = Math.min(openY, closeY)
            const rawRectH = Math.max(Math.abs(openY - closeY), 1)

            // 使用 Chart 统一计算的 x 坐标
            const leftLogical = positions[i - range.start]
            if (!leftLogical) continue
            const aligned = createAlignedKLineFromPx(
                Math.round(leftLogical * dpr),
                rawRectY,
                kWidthPx,
                rawRectH,
                dpr
            )

            const trend: kLineTrend = getKLineTrend(e)
            const color = trend === 'up' ? PRICE_COLORS.UP : PRICE_COLORS.DOWN

            ctx.fillStyle = color
            ctx.fillRect(aligned.bodyRect.x, aligned.bodyRect.y, aligned.bodyRect.width, aligned.bodyRect.height)
            realPos[i - range.start] = aligned.bodyRect.x
            const wickWidth = aligned.wickRect.width
            const wickX = aligned.wickRect.x
            const bodyTop = aligned.bodyRect.y
            const bodyBottom = aligned.bodyRect.y + aligned.bodyRect.height
            const bodyHigh = Math.max(e.open, e.close)
            const bodyLow = Math.min(e.open, e.close)

            if (e.high > bodyHigh) {
                const wick = createVerticalLineRect(wickX, highY, bodyTop, dpr)
                if (wick) ctx.fillRect(wick.x, wick.y, wickWidth, wick.height)
            }
            if (e.low < bodyLow) {
                const wick = createVerticalLineRect(wickX, bodyBottom, lowY, dpr)
                if (wick) ctx.fillRect(wick.x, wick.y, wickWidth, wick.height)
            }

            // 绘制量价关系标记
            const relation = relations[i - range.start]
            if (relation !== VolumePriceRelation.OTHERS) {
                // 根据量价关系决定标记位置
                const isRising = relation === VolumePriceRelation.RISE_WITH_VOLUME ||
                    relation === VolumePriceRelation.RISE_WITHOUT_VOLUME
                const markerY = isRising ? highY - 15 : lowY + 15
                const markerX = aligned.bodyRect.x + aligned.bodyRect.width / 2

                drawVolumePriceMarker(ctx, markerX, markerY, relation!, kWidth, dpr)
            }
        }

        ctx.restore()
    },
}

/**
 * 绘制量价关系标记
 * 在K线图上标注量价关系标记符号（使用Canvas绘制三角形）
 * 
 * @param ctx - Canvas绘图上下文
 * @param x - 标记的x坐标（三角形中心）
 * @param y - 标记的y坐标（三角形中心）
 * @param relation - 量价关系类型
 * @param kWidth - K线宽度，作为三角形边长
 * @param dpr - 设备像素比
 */
export function drawVolumePriceMarker(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    relation: VolumePriceRelation,
    kWidth: number,
    dpr: number
): void {
    const sideLength = kWidth
    // 等边三角形的高度 = 边长 * √3 / 2
    const height = sideLength * Math.sqrt(3) / 2

    let color: string
    let isUp: boolean

    switch (relation) {
        case VolumePriceRelation.RISE_WITH_VOLUME:
            // 量价齐升 - 红色实心向上箭头
            color = '#FF4444'
            isUp = true
            break
        case VolumePriceRelation.RISE_WITHOUT_VOLUME:
            // 缩量上涨 - 绿色空心向上箭头
            color = '#00C853'
            isUp = true
            break
        case VolumePriceRelation.FALL_WITH_VOLUME:
            // 放量下跌 - 红色实心向下箭头
            color = '#FF4444'
            isUp = false
            break
        case VolumePriceRelation.FALL_WITHOUT_VOLUME:
            // 缩量下跌 - 绿色空心向下箭头
            color = '#00C853'
            isUp = false
            break
        default:
            return
    }

    ctx.save()
    ctx.beginPath()

    if (isUp) {
        // 向上三角形：顶点在上
        ctx.moveTo(x, y - height / 2)                    // 顶点
        ctx.lineTo(x - sideLength / 2, y + height / 2)   // 左下角
        ctx.lineTo(x + sideLength / 2, y + height / 2)   // 右下角
    } else {
        // 向下三角形：顶点在下
        ctx.moveTo(x, y + height / 2)                    // 顶点
        ctx.lineTo(x - sideLength / 2, y - height / 2)   // 左上角
        ctx.lineTo(x + sideLength / 2, y - height / 2)   // 右上角
    }

    ctx.closePath()

    ctx.fillStyle = color
    ctx.fill()


    ctx.restore()
}