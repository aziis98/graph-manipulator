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

export function groupByKeyset<T, K>(list: T[], getKeyset: (item: T) => Set<K>): T[][] {
    const map = new Map<string, T[]>()

    for (const item of list) {
        const keyset = getKeyset(item)
        const key = Array.from(keyset).sort().join(',')

        if (!map.has(key)) {
            map.set(key, [])
        }

        map.get(key)!.push(item)
    }

    return [...map.values()]
}

export function intersperse<T>(arr: T[], sep: T): T[] {
    return arr.flatMap((v, i) => (i === 0 ? [v] : [sep, v]))
}

export const objectWith = <T extends object, K extends keyof T>(obj: T, key: K, value: T[K]): T => {
    return { ...obj, [key]: value }
}

export const objectWithout = <T extends object, K extends keyof T>(obj: T, key: K): T => {
    const newObj = { ...obj }
    delete newObj[key]
    return newObj
}
