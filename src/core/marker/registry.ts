/**
 * 标记类型
 */
export type MarkerShape = 'triangle' | 'circle'

/**
 * 标记状态
 */
export type MarkerState = 'normal' | 'hovered'

/**
 * 标记类型描述注册表
 */
export const MARKER_TYPE_DESCRIPTIONS: Record<string, string> = {
    'RISE_WITH_VOLUME': '量价齐升',
    'RISE_WITHOUT_VOLUME': '量缩价升',
    'FALL_WITH_VOLUME': '量价齐缩',
    'FALL_WITHOUT_VOLUME': '量升价缩',
}

/**
 * 注册新的标记类型描述
 * @param type 标记类型
 * @param description 描述文本
 */
export function registerMarkerTypeDescription(type: string, description: string): void {
    MARKER_TYPE_DESCRIPTIONS[type] = description
}

/**
 * 标记实体
 */
export interface MarkerEntity {
    id: string
    type: MarkerShape
    /** 标记类型描述 */
    markerType: string
    /** 包围盒左上角 x 坐标 */
    x: number
    /** 包围盒左上角 y 坐标 */
    y: number
    /** 包围盒宽度 */
    width: number
    /** 包围盒高度 */
    height: number
    /** 对应的 K 线索引 */
    dataIndex: number
    /** 额外元数据（如量价关系类型等） */
    metadata: Record<string, any>
}

/**
 * 标记 Manager
 */
export class MarkerManager {
    /** 当前帧可见的标记集合（key: marker.id） */
    private markers: Map<string, MarkerEntity> = new Map()
    /** 当前 hover 的标记 ID（跨帧持久） */
    private hoveredMarkerId: string | null = null
    /** 上一帧 hover 的标记 ID（用于触发 enter/leave 事件） */
    private lastHoveredId: string | null = null

    /**
     * 清空标记集合
     * 注意：不清除 hoveredMarkerId，保持 hover 状态跨帧持久
     */
    clear(): void {
        this.markers.clear()
    }

    /**
     * 注册标记
     * @param marker 标记实体
     */
    register(marker: MarkerEntity): void {
        this.markers.set(marker.id, marker)
    }

    /**
     * 获取标记状态
     * @param id 标记 ID
     * @returns 'hovered' 或 'normal'
     */
    getState(id: string): MarkerState {
        if (this.hoveredMarkerId === id) {
            return 'hovered'
        }
        return 'normal'
    }

    /**
     * 命中测试
     * @param x 鼠标 x 坐标
     * @param y 鼠标 y 坐标
     * @param padding 命中区域扩展（默认 3px）
     * @returns 命中的标记，未命中返回 null
     */
    hitTest(x: number, y: number, padding: number = 3): MarkerEntity | null {
        for (const marker of this.markers.values()) {
            if (x >= marker.x - padding && x <= marker.x + marker.width + padding &&
                y >= marker.y - padding && y <= marker.y + marker.height + padding
            ) {
                return marker
            }
        }
        return null
    }

    /**
     * 设置 hover 状态
     * @param id 标记 ID，null 表示清除 hover
     */
    setHover(id: string | null): void {
        this.hoveredMarkerId = id
        this.lastHoveredId = id
    }

    /**
     * 验证 hover 状态
     * 检查当前 hover 的标记是否仍在视口内，不在则清除
     */
    validateHoverState(): void {
        if (this.hoveredMarkerId !== null && !this.markers.has(this.hoveredMarkerId)) {
            this.hoveredMarkerId = null
        }
    }

    /**
     * 获取当前 hover 的标记实体
     * @returns hover 的标记，不存在返回 null
     */
    getHoveredMarker(): MarkerEntity | null {
        if (this.hoveredMarkerId !== null) {
            return this.markers.get(this.hoveredMarkerId) || null
        }
        return null
    }

    /**
     * 获取上一帧 hover 的标记 ID
     * 用于检测 hover 状态变化
     * @returns 上一帧的 hover ID
     */
    getLastHoverId(): string | null {
        return this.lastHoveredId
    }

    /**
     * 获取所有当前可见的标记
     * @returns 标记数组
     */
    getAllMarkers(): MarkerEntity[] {
        return Array.from(this.markers.values())
    }
}