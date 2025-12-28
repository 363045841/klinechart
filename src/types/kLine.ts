import type { KLineData } from './price'

export type kLineTrend = 'up' | 'down' | 'flat'

export function getKLineTrend(KLineData: KLineData): kLineTrend {
  if (KLineData.open > KLineData.close) {
    return 'down'
  } else if (KLineData.open < KLineData.close) {
    return 'up'
  } else {
    return 'flat'
  }
}
