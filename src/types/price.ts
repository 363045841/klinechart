export interface KLineData {
  /* 时间戳（毫秒） */
  timestamp: number

  /* 开盘价 */
  open: number

  /* 最高价 */
  maxPrice: number

  /* 最低价 */
  minPrice: number

  /* 收盘价 */
  close: number
}
