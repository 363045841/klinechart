<template>
  <div class="chart-container" ref="containerRef" @scroll.passive="scheduleRender">
    <div class="scroll-content" :style="{ width: totalWidth + 'px' }">
      <canvas class="chart-canvas" ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { KLineData } from '@/types/price'
import { kLineDraw } from '@/utils/kLineDraw/kLine'
import { drawMA5Line, drawMA10Line, drawMA20Line } from '@/utils/kLineDraw/MA'
import { tagLog } from '@/utils/logger'

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
}>(), {
  kWidth: 10,
  kGap: 2,
  yPaddingPx: 60,
  showMA: () => ({ ma5: true, ma10: true, ma20: true }),
  autoScrollToRight: true,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

let rafId: number | null = null

/* 计算总宽度，用于撑开滚动区域 */
const totalWidth = computed(() => {
  const n = props.data?.length ?? 0
  return props.kGap + n * (props.kWidth + props.kGap)
})

function option() {
  return { kWidth: props.kWidth, kGap: props.kGap, yPaddingPx: props.yPaddingPx }
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
  /* 向下取整找起点，减1防止边缘闪烁 */
  const start = Math.max(0, Math.floor(scrollLeft / unit) - 1)
  /* 向上取整找终点，加1防止边缘闪烁 */
  const end = Math.min(totalDataCount, Math.ceil((scrollLeft + viewWidth) / unit) + 1)
  return { start, end }
}

/* 预计算全局价格范围（仅当数据变化时重算） */
let cachedPriceRange: { maxPrice: number; minPrice: number } | null = null
let cachedDataLength = 0

function getPriceRange(data: KLineData[]): { maxPrice: number; minPrice: number } {
  if (cachedPriceRange && cachedDataLength === data.length) {
    return cachedPriceRange
  }

  let maxPrice = -Infinity
  let minPrice = Infinity
  for (let i = 0; i < data.length; i++) {
    const e = data[i]
    if (e.high > maxPrice) maxPrice = e.high
    if (e.low < minPrice) minPrice = e.low
  }

  cachedDataLength = data.length
  cachedPriceRange = { maxPrice, minPrice }
  return cachedPriceRange
}

/* 核心渲染：仅渲染可视区域 */
function render() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return
  if (!props.data || props.data.length === 0) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const kdata = props.data
  const rect = container.getBoundingClientRect()
  const viewWidth = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))
  tagLog('tag', height)
  const dpr = window.devicePixelRatio || 1

  const opt = option()
  const n = kdata.length

  /* Canvas 只保持视口大小，不再撑开整个内容 */
  canvas.style.width = `${viewWidth}px`
  canvas.style.height = `${height}px`
  canvas.width = Math.round(viewWidth * dpr)
  canvas.height = Math.round(height * dpr)

  const scrollLeft = container.scrollLeft

  /* 计算可视范围 */
  const { start, end } = getVisibleRange(scrollLeft, viewWidth, opt.kWidth, opt.kGap, n)

  /* 计算全局价格范围（用于Y轴映射） */
  const priceRange = getPriceRange(kdata)

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, viewWidth, height)

  /* 绘制偏移量：将K线坐标转换到canvas坐标系 */
  const offsetX = -scrollLeft

  /* 画K线 - 仅可视范围 */
  kLineDraw(ctx, kdata, opt, height, dpr, start, end, offsetX, priceRange)

  /* 画MA - 仅可视范围 */
  if (props.showMA.ma5) {
    drawMA5Line(ctx, kdata, opt, height, dpr, start, end, offsetX, priceRange)
  }
  if (props.showMA.ma10) {
    drawMA10Line(ctx, kdata, opt, height, dpr, start, end, offsetX, priceRange)
  }
  if (props.showMA.ma20) {
    drawMA20Line(ctx, kdata, opt, height, dpr, start, end, offsetX, priceRange)
  }
}

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

/* 数据变化时清除价格范围缓存 */
function invalidatePriceCache() {
  cachedPriceRange = null
  cachedDataLength = 0
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
  () => [props.data, props.kWidth, props.kGap, props.yPaddingPx, props.showMA],
  async () => {
    invalidatePriceCache()
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
  height: 1000px;
  min-height: 200px;
}

.scroll-content {
  height: 100%;
  min-height: inherit;
}

.chart-canvas {
  position: sticky;
  left: 0;
  top: 0;
  display: block;
}
</style>