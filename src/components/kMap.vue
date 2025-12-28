<template>
  <div class="chart-container" ref="containerRef">
    <canvas ref="canvasRef" class="chart-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { genRandomPriceData } from '@/utils/mock/genRandomPriceData'
import { draw } from '@/utils/draw'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

onMounted(() => {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 1) 取容器的逻辑尺寸（CSS 像素）
  const rect = container.getBoundingClientRect()
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)

  // 2) DPR
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

  // 6) 清屏（用逻辑尺寸清即可，因为坐标系已 scale）
  ctx.clearRect(0, 0, width, height)

  // 7) 绘制：关键是把“逻辑高度 height”和 dpr 传给 draw
  draw(ctx, genRandomPriceData(30), {
    kWidth: 20,
    kGap: 5,
    yPaddingPx: 60,
  }, height, dpr)
})
</script>

<style scoped>
.chart-container {
  width: 1000px;
  height: 800px;
  background: white;
}

.chart-canvas {
  display: block;
  /* 防止 canvas 底部出现空隙 */
}
</style>