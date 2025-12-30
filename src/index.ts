// src/index.ts
import type { App } from 'vue'
import './style.css'

import { KLineChart } from './components'

export { KLineChart }
export type { KLineData } from './types/price'

export const KMapPlugin = {
    install(app: App) {
        app.component('KLineChart', KLineChart)
    },
}