<template>
  <div class="chart-container" ref="containerRef">
    <canvas ref="canvasRef" class="chart-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { genRandomPriceData, reversalExampleData } from '@/utils/mock/genRandomPriceData'
import { draw } from '@/utils/draw'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

// 数据缓存，避免每次 resize 都重新生成
// const data = genRandomPriceData(30)
const data = reversalExampleData()

// 用于节流的 rAF id
let rafId: number | null = null

/**
 * 核心渲染函数：初始化 canvas + 绑定 DPR + 绘制
 */
function render() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 1) 取容器的逻辑尺寸（CSS 像素）
  const rect = container.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))

  // 2) DPR（浏览器缩放时可能变化）
  const dpr = window.devicePixelRatio || 1

  // 3) 设置画布的物理像素尺寸
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)

  // 4) 设置画布的 CSS 尺寸（逻辑尺寸）
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  // 5) 重置变换矩阵，避免重复 scale 叠加
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)

  // 6) 清屏（用逻辑尺寸）
  ctx.clearRect(0, 0, width, height)

  // 7) 绘制
  draw(ctx, data, {
    kWidth: 20,
    kGap: 5,
    yPaddingPx: 60,
  }, height, dpr)
}

/**
 * 节流调度：用 rAF 合并高频 resize 事件
 */
function scheduleRender() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
  rafId = requestAnimationFrame(() => {
    rafId = null
    render()
  })
}

onMounted(() => {
  // 首次渲染
  render()

  // 监听窗口 resize（包括浏览器缩放）
  window.addEventListener('resize', scheduleRender, { passive: true })
})

onUnmounted(() => {
  // 清理监听器
  window.removeEventListener('resize', scheduleRender)

  // 取消未执行的 rAF
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
})
</script>

<style scoped>
.chart-container {
  width: 1000px;
  height: 400px;
  background: white;
}

.chart-canvas {
  display: block;
}
</style>