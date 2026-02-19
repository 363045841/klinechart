<template>
  <div
    v-if="marker"
    class="marker-tooltip"
    :style="{ left: `${pos.x + 12}px`, top: `${pos.y + 12}px` }"
  >
    <div class="marker-tooltip__title">{{ markerTypeDescription }}</div>
    <div class="marker-tooltip__content">
      <div v-for="(value, key) in marker.metadata" :key="key" class="row">
        <span>{{ key }}</span>
        <span>{{ value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MarkerEntity } from '@/core/marker/registry'
import { MARKER_TYPE_DESCRIPTIONS } from '@/core/marker/registry'

const props = defineProps<{
  marker: MarkerEntity | null
  pos: { x: number; y: number }
}>()

const markerTypeDescription = computed(() => {
  if (!props.marker) return ''
  return MARKER_TYPE_DESCRIPTIONS[props.marker.markerType] || props.marker.markerType
})
</script>

<style scoped>
.marker-tooltip {
  position: absolute;
  z-index: 10;
  min-width: 180px;
  max-width: 260px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  color: rgba(0, 0, 0, 0.78);
  font-size: 12px;
  line-height: 1.4;
  pointer-events: none;
  backdrop-filter: blur(6px);
}

.marker-tooltip__title {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-weight: 600;
  margin-bottom: 6px;
}

.marker-tooltip__content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2px;
}

.marker-tooltip__content .row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.marker-tooltip__content .row span:first-child {
  color: rgba(0, 0, 0, 0.56);
}
</style>