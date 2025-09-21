import type { Vector2 } from './vec2'

export function worldToScreen(svgElement: SVGSVGElement, point: { x: number; y: number }): Vector2 {
    const pt = svgElement.createSVGPoint()
    pt.x = point.x
    pt.y = point.y
    const screenPt = pt.matrixTransform(svgElement.getScreenCTM() || undefined)
    return { x: screenPt.x, y: screenPt.y }
}

export function roundTo(value: number, step: number) {
    return Math.round(value / step) * step
}
