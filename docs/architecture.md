# 项目架构（v2 / 2026-01）

本项目是一个基于 **Canvas + Vue 3** 的 K 线图组件库/示例工程。近期已将核心逻辑从 Vue composables 中下沉到 **纯 TypeScript Core 层**，以支持多窗格（Pane）、插件化渲染（Renderers）、以及可复用的交互控制器（InteractionController）。

> 目标：Vue 只负责 DOM/props 绑定和事件转发；核心绘制与交互在 `src/core` 中独立演进。

---

## 目录分层

```
src/
  components/               # Vue 组件（对外 UI）
    KLineChart.vue          # 画布容器 + 事件转发 + tooltip 渲染
    KLineTooltip.vue        # 悬浮详情（DOM）

  core/                     # 纯 TS 核心（无 Vue 依赖）
    chart.ts                # Chart：总控（viewport/调度/绘制顺序/pane 布局）
    controller/
      interaction.ts        # InteractionController：拖拽/缩放/hover 命中/十字线状态
    layout/
      pane.ts               # Pane：窗格（top/height、priceRange、yAxis、renderers 列表）
    scale/
      price.ts              # priceToY/yToPrice 等通用函数
      priceScale.ts         # PriceScale：pane 级 y 轴缩放
    viewport/
      viewport.ts           # getVisibleRange/getVisiblePriceRange（可视范围计算）
    renderers/              # 渲染器（插件化）
      candle.ts             # 蜡烛图
      gridLines.ts          # 仅网格线（不画任何文字刻度，避免与轴层重复）
      lastPrice.ts          # 最新价虚线
      ma.ts                 # MA 线（MA5/10/20）
      maLegend.ts           # MA 图例（屏幕坐标）
      timeAxis.ts           # 底部时间轴（x-axis-canvas）
      yAxis.ts              # 右侧价格轴（y-axis-canvas，分 pane 分段）
      crosshair.ts          # 十字线线体（绘图区 overlay）
      crosshairLabels.ts    # 十字线标签：价格标签绘制在 y-axis-canvas
      paneTitle.ts          # pane 左上角标题（例如“副图(占位)”）
      paneBorder.ts         # 绘图区整体边框（按需求仅保留 plotCanvas 边框）

  utils/                    # 旧实现/通用绘制工具（逐步迁移/复用）
    kLineDraw/              # axis/MA/pixelAlign 等（core renderer 目前复用部分实现）
    kline/                  # MA 计算等数据工具
```

---

## Canvas 分层（核心设计）

`KLineChart.vue` 维持 3 层 canvas（叠放）：

1. **plotCanvas**：绘图层（主图/副图的内容渲染 + 十字线线体）
2. **yAxisCanvas**：右侧价格轴层（每个 Pane 一段 y 轴；十字线价格标签也在此绘制）
3. **xAxisCanvas**：底部时间轴层（共享一条时间轴；十字线日期标签也在此绘制）

> 规则：
>
> - **plotCanvas 不绘制任何价格/日期刻度文字**，避免出现“两套坐标轴”视觉冲突。
> - 网格线在 plotCanvas 绘制（但只画线，不画字）。

---

## 核心对象模型

### Chart（`src/core/chart.ts`）

职责：

- 管理 DOM（container/canvasLayer/三个 canvas）
- 计算 viewport（viewWidth/viewHeight/plotWidth/plotHeight/dpr/scrollLeft）
- 计算可视范围（start/end）
- 管理 Pane 布局（支持 `paneGap` 形成真实分隔）
- RAF 调度：`scheduleDraw()` 合并多次重绘请求
- 统一绘制顺序（plot → yAxis → xAxis → overlay）

关键 API：

- `updateData(data)`
- `updateOptions(partial)`
- `resize()`
- `scheduleDraw()` / `draw()`
- `zoomAt(mouseX, scrollLeft, deltaY)`

### Pane（`src/core/layout/pane.ts`）

职责：

- 管理自身布局：`top/height`（位于 plot 区域内部）
- 独立价格范围：`priceRange`（由可视数据计算）
- 独立 y 轴缩放：`yAxis: PriceScale`
- 维护渲染器列表：`renderers: PaneRenderer[]`

### Renderers（`src/core/renderers/*`）

职责：

- 每个 renderer 是一个“可插拔的绘制策略”
- 接口统一：

```ts
export interface PaneRenderer {
  draw(args: {
    ctx: CanvasRenderingContext2D
    pane: Pane
    data: KLineData[]
    range: { start: number; end: number }
    scrollLeft: number
    kWidth: number
    kGap: number
    dpr: number
  }): void
}
```

#### 坐标系约定

- **pane 内容渲染**：在 `Chart.draw()` 中 `ctx.translate(0, pane.top)` 后调用 renderer，使 renderer 的 y=0 对应 pane 顶部。
- **world 坐标（随 scrollLeft 平移）**：需要渲染器自己 `ctx.translate(-scrollLeft, 0)`。
- **屏幕坐标（不随滚动）**：不做 `translate(-scrollLeft,0)`，用于 overlay（如图例）。

### InteractionController（`src/core/controller/interaction.ts`）

职责：

- 拖拽滚动（mousedown/mousemove）
- wheel 缩放（zoomAt）
- hover 命中（蜡烛实体/影线）
- 维护十字线状态：`crosshairPos/crosshairIndex`
- 维护 tooltip 状态：`hoveredIndex/tooltipPos/tooltipSize` + `activePaneId`

> 注意：InteractionController 内部状态是普通属性，Vue 组件需在事件回调中同步到响应式变量，驱动 tooltip 视图更新。

---

## Vue 层职责（`src/components/KLineChart.vue`）

Vue 层仅负责：

- 维护 DOM refs（container、三个 canvas）
- 实例化 `Chart`
- 将鼠标/滚轮/scroll 事件转发到 `chart.interaction.*`
- 同步 interaction 状态到 Vue 响应式（hoveredIdx/tooltipPos）
- 渲染 Tooltip（DOM），并在 tooltip mount 时回传尺寸给 `interaction.setTooltipSize()`

---

## 组件 Props 文档

### `KLineChart`（`src/components/KLineChart.vue`）

> 对外主要组件（组件库入口：`src/components/index.ts` 导出 `KLineChart`）。

#### Props

| Prop                | 类型                                                | 必填 | 默认值                               | 说明                                                                     |
| ------------------- | --------------------------------------------------- | ---: | ------------------------------------ | ------------------------------------------------------------------------ |
| `data`              | `KLineData[]`                                       |   是 | -                                    | K 线数据数组。`timestamp/open/high/low/close` 等字段用于绘制与 tooltip。 |
| `kWidth`            | `number`                                            |   否 | `10`                                 | 单根 K 线实体宽度（逻辑像素）。支持滚轮缩放时作为初始值。                |
| `kGap`              | `number`                                            |   否 | `2`                                  | K 线之间间距（逻辑像素）。                                               |
| `yPaddingPx`        | `number`                                            |   否 | `40`                                 | 上下留白（用于 y 轴缩放/视觉留白）。                                     |
| `showMA`            | `{ ma5?: boolean; ma10?: boolean; ma20?: boolean }` |   否 | `{ ma5:true, ma10:true, ma20:true }` | 是否绘制 MA5/MA10/MA20。当前仅作用于主图 pane。                          |
| `autoScrollToRight` | `boolean`                                           |   否 | `true`                               | 数据变化时是否自动滚到最右侧（最新数据）。                               |
| `minKWidth`         | `number`                                            |   否 | `2`                                  | 滚轮缩放允许的最小 `kWidth`。                                            |
| `maxKWidth`         | `number`                                            |   否 | `50`                                 | 滚轮缩放允许的最大 `kWidth`。                                            |
| `rightAxisWidth`    | `number`                                            |   否 | `70`                                 | 右侧价格轴 canvas 宽度（逻辑像素）。                                     |
| `bottomAxisHeight`  | `number`                                            |   否 | `24`                                 | 底部时间轴 canvas 高度（逻辑像素）。                                     |
| `paneRatios`        | `[number, number]`                                  |   否 | `[0.85, 0.15]`                       | 主图/副图高度比例。副图目前为占位（仅网格线 + 标题）。                   |

#### Expose（对外方法）

| 方法             | 签名         | 说明                                                |
| ---------------- | ------------ | --------------------------------------------------- |
| `scheduleRender` | `() => void` | 请求下一帧重绘（内部调用 `chart.scheduleDraw()`）。 |
| `scrollToRight`  | `() => void` | 将容器横向滚动到最右侧并触发重绘。                  |

#### 备注

- 目前组件内部固定传入 `paneGap = 8` 给 `ChartOptions`（形成主/副图真实留白）。如需对外配置，可将其提升为 props。
- Tooltip 是否出现取决于 `InteractionController` 的命中判定（蜡烛 body/wick）。

---

### `KLineTooltip`（`src/components/KLineTooltip.vue`）

> Tooltip 目前为 **内部组件**（由 `KLineChart` 渲染），但也可以复用（如果你将它导出）。

#### Props

| Prop    | 类型                                   | 必填 | 默认值 | 说明                                                               |
| ------- | -------------------------------------- | ---: | ------ | ------------------------------------------------------------------ |
| `k`     | `KLineData \| null`                    |   是 | -      | 当前悬停的 K 线数据。为 `null` 时不渲染。                          |
| `index` | `number \| null`                       |   是 | -      | 当前 K 在 `data` 中的索引，用于计算涨跌色（与前一根比较）。        |
| `data`  | `KLineData[]`                          |   是 | -      | 全量数据，用于通过 `index-1` 取上一根 K。                          |
| `pos`   | `{ x: number; y: number }`             |   是 | -      | Tooltip 在容器内的定位坐标（像素）。                               |
| `setEl` | `(el: HTMLDivElement \| null) => void` |   否 | -      | 回传 tooltip 根元素给父组件，用于测量 tooltip 宽高并做防溢出布局。 |

---

## 当前默认行为（可配置点）

- 多 pane：默认主/副比例 `paneRatios=[0.85, 0.15]`
- paneGap：默认在组件内传入 `paneGap=8`（形成真实分隔）
- 副图当前只保留网格线与标题（占位），不绘制数据
- 十字线价格标签只在鼠标所在 pane 的 yAxis 段绘制（避免副图标签重叠）
- 边框：按需求目前 **只保留 plotCanvas 绘图区整体外框**（其它区域不画边线）

---

## 后续扩展建议

1. **副图指标（MACD/VOL/RSI）**
   - 新增 renderer：`core/renderers/macd.ts` / `volume.ts`
   - 仅挂在 sub pane（`chart.setPaneRenderers('sub', [...])`）

2. **轴策略（每 pane 一条 xAxis）**
   - 当前为共享底部 xAxis；如需要每 pane 也显示日期刻度，可为 sub pane 增加独立时间轴 renderer（会占高度）。

3. **showMA 与 legend 同步**
   - 目前 MA 线按 `props.showMA` 接入；legend 默认全开显示，可进一步将 showMA 下沉到 ChartOptions，以便 legend 严格跟随开关。
