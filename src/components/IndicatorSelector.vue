<template>
  <div class="indicator-selector">
    <div class="indicator-scroll-container" ref="scrollContainerRef">
      <div class="indicator-list">
        <button
          v-for="indicator in indicators"
          :key="indicator.id"
          class="indicator-btn"
          :class="{ active: isActive(indicator.id) }"
          @click="toggleIndicator(indicator.id)"
          :title="indicator.name"
        >
          {{ indicator.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

export interface Indicator {
  id: string
  label: string
  name: string
}

const indicators: Indicator[] = [
  { id: 'MA', label: 'MA', name: '均线' },
  { id: 'BOLL', label: 'BOLL', name: '布林带' },
  { id: 'MACD', label: 'MACD', name: '指数平滑异同移动平均线' },
  { id: 'RSI', label: 'RSI', name: '相对强弱指标' },
  { id: 'CCI', label: 'CCI', name: '顺势指标' },
  { id: 'STOCH', label: 'STOCH', name: '随机指标' },
  { id: 'MOM', label: 'MOM', name: '动量指标' },
  { id: 'WMSR', label: 'WMSR', name: '威廉指标' },
  { id: 'KST', label: 'KST', name: '确然指标' },
  { id: 'FASTK', label: 'FASTK', name: '快速随机指标' },
]

const props = defineProps<{
  /** 当前选中的指标列表 */
  activeIndicators?: string[]
}>()

const emit = defineEmits<{
  toggle: [indicatorId: string, active: boolean]
}>()

const scrollContainerRef = ref<HTMLDivElement | null>(null)

function isActive(indicatorId: string): boolean {
  return props.activeIndicators?.includes(indicatorId) ?? false
}

function toggleIndicator(indicatorId: string) {
  const active = !isActive(indicatorId)
  if (active) {
    // 单选模式：只选当前点击的指标
    emit('toggle', indicatorId, true)
    // 取消其他指标的选择
    indicators.forEach((ind) => {
      if (ind.id !== indicatorId && isActive(ind.id)) {
        emit('toggle', ind.id, false)
      }
    })
  } else {
    // 取消选择
    emit('toggle', indicatorId, false)
  }
}
</script>

<style scoped>
.indicator-selector {
  margin: 20px;
  width: 80%;
}

.indicator-scroll-container {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  display: flex;
  justify-content: center;
}

.indicator-scroll-container::-webkit-scrollbar {
  display: none;
}

.indicator-list {
  display: flex;
  gap: 8px;
  padding: 2px;
}

.indicator-btn {
  flex-shrink: 0;
  padding: 6px 16px;
  border: 1px solid #d0d0d0;
  border-radius: 16px;
  background: #ffffff;
  color: #666;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.indicator-btn:hover {
  background: #f0f0f0;
  border-color: #b0b0b0;
  color: #333;
}

.indicator-btn.active {
  background: #1890ff;
  border-color: #1890ff;
  color: #ffffff;
}

.indicator-btn.active:hover {
  background: #40a9ff;
  border-color: #40a9ff;
}
</style>
