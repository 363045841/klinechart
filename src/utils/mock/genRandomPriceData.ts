import { type KLineData } from '@/types/price'

export function genRandomPriceData(count: number): KLineData[] {
  let data: KLineData[] = []
  for (let i = 0; i < count; i++) {
    const open = parseFloat((Math.random() * 9 + 1).toFixed(2))
    const close = parseFloat((Math.random() * 9 + 1).toFixed(2))
    const randomMaxPriceFlag = Math.random() > 0.5
    const randomMinPriceFlag = Math.random() > 0.5
    let maxPrice = open
    let minPrice = close
    if (randomMaxPriceFlag) {
      maxPrice = open + Math.random() * 10
    }
    if (randomMinPriceFlag) {
      minPrice = close - Math.random() * 10
    }
    data.push({
      timestamp: i,
      open: open,
      maxPrice: maxPrice,
      minPrice: minPrice,
      close: close,
    })
  }
  console.log(data)
  return data
}
