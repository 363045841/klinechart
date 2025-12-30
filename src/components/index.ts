// src/components/index.ts
import type { DefineComponent } from 'vue'
import KLineChartVue from './KLineChart.vue'

// 关键：把 .vue 组件转成 TS 能稳定生成声明的类型
export const KLineChart = KLineChartVue as unknown as DefineComponent