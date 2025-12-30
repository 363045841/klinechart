<template>
  <KLineChart :data="kdata" :kWidth="10" :kGap="2" :yPaddingPx="60" :showMA="{ ma5: true, ma10: true, ma20: true }"
    :autoScrollToRight="true" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import KLineChart from '@/components/KLineChart.vue'
import { getKlineDataDongCai } from '@/api/data/kLine'
import { toKLineData, type KLineData } from '@/types/price'

const kdata = ref<KLineData[]>([])

onMounted(async () => {
  const raw = await getKlineDataDongCai({
    symbol: '601360',
    period: 'daily',
    start_date: '20250501',
    end_date: '20251230',
    adjust: 'qfq',
  })
  kdata.value = toKLineData(raw) // 这里就排序好
})
</script>
