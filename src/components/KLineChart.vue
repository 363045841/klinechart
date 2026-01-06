<template>
  <div class="chart-container" :class="{ 'is-dragging': isDragging }" ref="containerRef"
    @scroll.passive="scheduleRender" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp"
    @mouseleave="onMouseUp" @wheel.prevent="onWheel">
    <!-- scroll-content 负责撑开横向滚动宽度，并承载 sticky 的画布层 -->
    <div class="scroll-content" :style="{ width: totalWidth + 'px' }">
      <!-- 画布层：sticky 固定在可视区域左上角，滚动只影响绘制时的 scrollLeft -->
      <div class="canvas-layer" ref="canvasLayerRef">
        <!-- 1) 绘图区：K线 + MA + 网格线（随 scrollLeft 平移） -->
        <canvas class="plot-canvas" ref="plotCanvasRef"></canvas>

        <!-- 2) 右侧价格轴（固定，不随滚动） -->
        <canvas class="y-axis-canvas" ref="yAxisCanvasRef"></canvas>

        <!-- 3) 底部时间轴（随 X 滚动，但画布不移动） -->
        <canvas class="x-axis-canvas" ref="xAxisCanvasRef"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { KLineData } from '@/types/price'
import { kLineDraw } from '@/utils/kLineDraw/kLine'
import { drawMA5Line, drawMA10Line, drawMA20Line, MA5_COLOR, MA10_COLOR, MA20_COLOR } from '@/utils/kLineDraw/MA'
import { drawLastPriceDashedLine, drawPriceAxis, drawTimeAxis } from '@/utils/kLineDraw/axis'

type MAFlags = {
  ma5?: boolean
  ma10?: boolean
  ma20?: boolean
}

const props = withDefaults(defineProps<{
  data: KLineData[]
  kWidth?: number
  kGap?: number
  yPaddingPx?: number
  showMA?: MAFlags
  autoScrollToRight?: boolean
  minKWidth?: number
  maxKWidth?: number
  /** 右侧价格轴宽度 */
  rightAxisWidth?: number
  /** 底部时间轴高度 */
  bottomAxisHeight?: number
}>(), {
  kWidth: 10,
  kGap: 2,
  yPaddingPx: 40,
  showMA: () => ({ ma5: true, ma10: true, ma20: true }),
  autoScrollToRight: true,
  minKWidth: 2,
  maxKWidth: 50,
  rightAxisWidth: 70,
  bottomAxisHeight: 24,
})

const plotCanvasRef = ref<HTMLCanvasElement | null>(null)
const yAxisCanvasRef = ref<HTMLCanvasElement | null>(null)
const xAxisCanvasRef = ref<HTMLCanvasElement | null>(null)
const canvasLayerRef = ref<HTMLDivElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

// 内部动态K线宽度和间隙
const currentKWidth = ref(props.kWidth)
const currentKGap = ref(props.kGap)

// 计算初始比例
const initialRatio = props.kGap / props.kWidth

let rafId: number | null = null

/* ========== 拖拽相关 ========== */
const isDragging = ref(false)
let dragStartX = 0
let scrollStartX = 0

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  const container = containerRef.value
  if (!container) return
  isDragging.value = true
  dragStartX = e.clientX
  scrollStartX = container.scrollLeft
  e.preventDefault()
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  const container = containerRef.value
  if (!container) return
  const deltaX = dragStartX - e.clientX
  container.scrollLeft = scrollStartX + deltaX
}

function onMouseUp() {
  isDragging.value = false
}

/* ========== 滚轮缩放 ========== */
function onWheel(e: WheelEvent) {
  const container = containerRef.value
  if (!container) return

  const rect = container.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const scrollLeft = container.scrollLeft
  const oldUnit = currentKWidth.value + currentKGap.value
  const centerIndex = (scrollLeft + mouseX) / oldUnit

  const delta = e.deltaY > 0 ? -1 : 1
  const newKWidth = Math.max(
    props.minKWidth,
    Math.min(props.maxKWidth, currentKWidth.value + delta)
  )

  if (newKWidth === currentKWidth.value) return

  const newKGap = Math.max(0.5, newKWidth * initialRatio)
  currentKWidth.value = newKWidth
  currentKGap.value = newKGap

  const newUnit = newKWidth + newKGap

  nextTick(() => {
    const newScrollLeft = centerIndex * newUnit - mouseX
    container.scrollLeft = Math.max(0, newScrollLeft)
    scheduleRender()
  })
}

/* 计算总宽度：绑图区域宽度 + 右侧轴宽度 */
const totalWidth = computed(() => {
  const n = props.data?.length ?? 0
  const plotWidth = currentKGap.value + n * (currentKWidth.value + currentKGap.value)
  return plotWidth + props.rightAxisWidth
})

function option() {
  return {
    kWidth: currentKWidth.value,
    kGap: currentKGap.value,
    yPaddingPx: props.yPaddingPx
  }
}

/* 计算可视范围的索引 */
function getVisibleRange(
  scrollLeft: number,
  viewWidth: number,
  kWidth: number,
  kGap: number,
  totalDataCount: number
): { start: number; end: number } {
  const unit = kWidth + kGap
  const start = Math.max(0, Math.floor(scrollLeft / unit) - 1)
  const end = Math.min(totalDataCount, Math.ceil((scrollLeft + viewWidth) / unit) + 1)
  return { start, end }
}

/* 计算可见区间的价格范围 */
function getVisiblePriceRange(
  data: KLineData[],
  startIndex: number,
  endIndex: number
): { maxPrice: number; minPrice: number } {
  let maxPrice = -Infinity
  let minPrice = Infinity

  for (let i = startIndex; i < endIndex && i < data.length; i++) {
    const e = data[i]
    if (!e) continue
    if (e.high > maxPrice) maxPrice = e.high
    if (e.low < minPrice) minPrice = e.low
  }

  if (!Number.isFinite(maxPrice) || !Number.isFinite(minPrice)) {
    return { maxPrice: 100, minPrice: 0 }
  }

  return { maxPrice, minPrice }
}

function calcMAAtIndex(data: KLineData[], index: number, period: number): number | undefined {
  if (index < period - 1) return undefined
  let sum = 0
  for (let j = 0; j < period; j++) {
    const e = data[index - j]
    if (!e) return undefined
    sum += e.close
  }
  return sum / period
}

/* 核心渲染 */
function render() {
  const plotCanvas = plotCanvasRef.value
  const yAxisCanvas = yAxisCanvasRef.value
  const xAxisCanvas = xAxisCanvasRef.value
  const container = containerRef.value
  const canvasLayer = canvasLayerRef.value
  if (!plotCanvas || !yAxisCanvas || !xAxisCanvas || !container || !canvasLayer) return
  if (!props.data || props.data.length === 0) return

  const plotCtx = plotCanvas.getContext('2d')
  const yAxisCtx = yAxisCanvas.getContext('2d')
  const xAxisCtx = xAxisCanvas.getContext('2d')
  if (!plotCtx || !yAxisCtx || !xAxisCtx) return

  const kdata = props.data
  const rect = container.getBoundingClientRect()

  const viewWidth = Math.max(1, Math.round(rect.width))
  const viewHeight = Math.max(1, Math.round(rect.height))

  // 让 canvas-layer 始终覆盖视口区域
  canvasLayer.style.width = `${viewWidth}px`
  canvasLayer.style.height = `${viewHeight}px`

  let dpr = window.devicePixelRatio || 1

  const MAX_CANVAS_PIXELS = 16 * 1024 * 1024
  const requestedPixels = (viewWidth * dpr) * (viewHeight * dpr)
  if (requestedPixels > MAX_CANVAS_PIXELS) {
    dpr = Math.sqrt(MAX_CANVAS_PIXELS / (viewWidth * viewHeight))
  }

  const opt = option()
  const n = kdata.length

  const scrollLeft = container.scrollLeft

  // ===== 计算各区域尺寸 =====
  const rightAxisWidth = props.rightAxisWidth
  const bottomAxisHeight = props.bottomAxisHeight
  const plotWidth = viewWidth - rightAxisWidth   // 绑图区域宽度
  const plotHeight = viewHeight - bottomAxisHeight  // 绑图区域高度

  // 三层 canvas 使用同一 DPR，但各自尺寸不同
  plotCanvas.style.width = `${plotWidth}px`
  plotCanvas.style.height = `${plotHeight}px`
  plotCanvas.width = Math.round(plotWidth * dpr)
  plotCanvas.height = Math.round(plotHeight * dpr)

  yAxisCanvas.style.width = `${rightAxisWidth}px`
  yAxisCanvas.style.height = `${plotHeight}px`
  yAxisCanvas.width = Math.round(rightAxisWidth * dpr)
  yAxisCanvas.height = Math.round(plotHeight * dpr)

  xAxisCanvas.style.width = `${plotWidth}px`
  xAxisCanvas.style.height = `${bottomAxisHeight}px`
  xAxisCanvas.width = Math.round(plotWidth * dpr)
  xAxisCanvas.height = Math.round(bottomAxisHeight * dpr)

  const { start, end } = getVisibleRange(scrollLeft, plotWidth, opt.kWidth, opt.kGap, n)
  const priceRange = getVisiblePriceRange(kdata, start, end)

  // ===== 1) 绘图区（plotCanvas） =====
  plotCtx.setTransform(1, 0, 0, 1, 0, 0)
  plotCtx.scale(dpr, dpr)
  plotCtx.clearRect(0, 0, plotWidth, plotHeight)

  // ===== 1. 绘制绑图区域（K线、MA线）使用裁剪 =====
  plotCtx.save()
  plotCtx.beginPath()
  plotCtx.rect(0, 0, plotWidth, plotHeight)
  plotCtx.clip()

  plotCtx.translate(-scrollLeft, 0)

  // 最新价水平虚线（在绘图区 world 坐标系绘制）
  const lastIdx = Math.min(end - 1, kdata.length - 1)
  const last = kdata[lastIdx]
  if (last) {
    drawLastPriceDashedLine(plotCtx, {
      plotWidth,
      plotHeight,
      scrollLeft,
      startIndex: start,
      endIndex: end,
      kWidth: opt.kWidth,
      kGap: opt.kGap,
      priceRange,
      lastPrice: last.close,
      yPaddingPx: opt.yPaddingPx,
      dpr,
    })
  }

  // 绘制网格线（在绑图区域内）
  drawPlotGrid(plotCtx, opt, plotHeight, dpr, start, end, priceRange, scrollLeft, plotWidth)

  // 绘制K线
  kLineDraw(plotCtx, kdata, opt, plotHeight, dpr, start, end, priceRange)

  // 绘制MA线
  if (props.showMA.ma5) {
    drawMA5Line(plotCtx, kdata, opt, plotHeight, dpr, start, end, priceRange)
  }
  if (props.showMA.ma10) {
    drawMA10Line(plotCtx, kdata, opt, plotHeight, dpr, start, end, priceRange)
  }
  if (props.showMA.ma20) {
    drawMA20Line(plotCtx, kdata, opt, plotHeight, dpr, start, end, priceRange)
  }

  plotCtx.restore()

  // ===== 2. 绘制右侧价格轴（固定位置，不随滚动） =====
  // ===== 2) 右侧价格轴（yAxisCanvas） =====
  yAxisCtx.setTransform(1, 0, 0, 1, 0, 0)
  yAxisCtx.scale(dpr, dpr)
  yAxisCtx.clearRect(0, 0, rightAxisWidth, plotHeight)
  drawPriceAxis(yAxisCtx, {
    x: 0,
    y: 0,
    width: rightAxisWidth,
    height: plotHeight,
    priceRange,
    yPaddingPx: opt.yPaddingPx,
    dpr,
    ticks: 10,
  })

  // ===== 3. 绘制底部时间轴（X方向随滚动） =====
  // ===== 3) 底部时间轴（xAxisCanvas） =====
  xAxisCtx.setTransform(1, 0, 0, 1, 0, 0)
  xAxisCtx.scale(dpr, dpr)
  xAxisCtx.clearRect(0, 0, plotWidth, bottomAxisHeight)
  drawTimeAxis(xAxisCtx, {
    x: 0,
    y: 0,
    width: plotWidth,
    height: bottomAxisHeight,
    data: kdata,
    scrollLeft,
    kWidth: opt.kWidth,
    kGap: opt.kGap,
    startIndex: start,
    endIndex: end,
    dpr,
  })

  // ===== 4. 绘制 MA 图注（左上角） =====
  // MA 图注画在 plotCanvas 上即可
  drawMALegend(plotCtx, kdata, end, dpr)
}

/* 绘制绑图区域内的网格线 */
function drawPlotGrid(
  ctx: CanvasRenderingContext2D,
  opt: ReturnType<typeof option>,
  plotHeight: number,
  dpr: number,
  start: number,
  end: number,
  priceRange: { maxPrice: number; minPrice: number },
  scrollLeft: number,
  plotWidth: number
) {
  const unit = opt.kWidth + opt.kGap
  const startX = opt.kGap + start * unit
  const endX = opt.kGap + end * unit

  const wantPad = opt.yPaddingPx ?? 0
  const pad = Math.max(0, Math.min(wantPad, Math.floor(plotHeight / 2) - 1))

  const { maxPrice, minPrice } = priceRange
  const range = maxPrice - minPrice
  const priceTicks = 6

  ctx.save()
  ctx.strokeStyle = 'rgba(0,0,0,0.06)'
  ctx.lineWidth = 1

  // 水平网格线
  const step = range === 0 ? 0 : range / (priceTicks - 1)
  for (let t = 0; t < priceTicks; t++) {
    const p = range === 0 ? maxPrice : maxPrice - step * t
    const y = priceToY(p, maxPrice, minPrice, plotHeight, pad, pad)

    ctx.beginPath()
    ctx.moveTo(startX, Math.round(y) + 0.5)
    ctx.lineTo(endX, Math.round(y) + 0.5)
    ctx.stroke()
  }

  ctx.restore()
}

/* 绘制MA图注 */
function drawMALegend(
  ctx: CanvasRenderingContext2D,
  kdata: KLineData[],
  endIndex: number,
  dpr: number
) {
  const legendX = 8
  const legendY = 8
  const fontSize = 12
  const gap = 10

  ctx.save()
  ctx.font = `${fontSize}px Arial`
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'

  const lastIndex = Math.min(endIndex - 1, kdata.length - 1)

  const items: Array<{ label: string; color: string; value?: number }> = []
  if (props.showMA.ma5) items.push({ label: 'MA5', color: MA5_COLOR, value: calcMAAtIndex(kdata, lastIndex, 5) })
  if (props.showMA.ma10) items.push({ label: 'MA10', color: MA10_COLOR, value: calcMAAtIndex(kdata, lastIndex, 10) })
  if (props.showMA.ma20) items.push({ label: 'MA20', color: MA20_COLOR, value: calcMAAtIndex(kdata, lastIndex, 20) })

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

// 引入 priceToY
import { priceToY } from '@/utils/priceToY'

/* rAF节流 */
function scheduleRender() {
  if (rafId !== null) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    rafId = null
    render()
  })
}

function scrollToRight() {
  const container = containerRef.value
  if (!container) return
  container.scrollLeft = container.scrollWidth
  scheduleRender()
}

defineExpose({ scheduleRender, scrollToRight })

onMounted(() => {
  window.addEventListener('resize', scheduleRender, { passive: true })
  scheduleRender()
})

onUnmounted(() => {
  window.removeEventListener('resize', scheduleRender)
  if (rafId !== null) cancelAnimationFrame(rafId)
})

watch(
  () => [props.kWidth, props.kGap],
  ([newWidth, newGap]) => {
    if (typeof newWidth === 'number') currentKWidth.value = newWidth
    if (typeof newGap === 'number') currentKGap.value = newGap
  }
)

watch(
  () => [props.data, props.yPaddingPx, props.showMA],
  async () => {
    if (props.autoScrollToRight) {
      await nextTick()
      scrollToRight()
    } else {
      scheduleRender()
    }
  },
  { deep: true },
)
</script>

<style scoped>
.chart-container {
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chart-container::-webkit-scrollbar {
  display: none;
}

.chart-container:hover {
  cursor: grab;
}

.chart-container:active {
  cursor: grabbing;
}

.scroll-content {
  height: 100%;
  min-height: inherit;
  position: relative;
}

/* 关键：sticky 固定在可视区域左上角 */
.canvas-layer {
  position: sticky;
  left: 0;
  top: 0;
  /* width/height 由 JS 在 render() 中设置为视口大小 */
  pointer-events: none;
}

/* 三层 canvas 叠放 */
.plot-canvas {
  position: absolute;
  left: 0;
  top: 0;
  display: block;
}

.y-axis-canvas {
  position: absolute;
  top: 0;
  right: 0;
  display: block;
}

.x-axis-canvas {
  position: absolute;
  left: 0;
  bottom: 0;
  display: block;
}
</style>
