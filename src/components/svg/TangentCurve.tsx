import { Vec2, type Vector2 } from "@/lib/vec2"
import type { SVGAttributes } from "preact"

export const getCurveInfo = (from: Vector2, fromDir: Vector2, to: Vector2, toDir: Vector2) => {
    const len = Math.max(1, Vec2.distance(from, to))
    const control1 = Vec2.add(from, Vec2.scale(fromDir, len / 2))
    const control2 = Vec2.add(to, Vec2.scale(toDir, len / 2))

    const strPath = `M ${from.x} ${from.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${to.x} ${to.y}`

    const $svgPath = document.createElementNS("http://www.w3.org/2000/svg", "path")
    $svgPath.setAttribute("d", strPath)

    return {
        getPointAtLength: (length: number): Vector2 => {
            const pt = $svgPath.getPointAtLength(length)
            return { x: pt.x, y: pt.y }
        },
        getTotalLength: () => {
            return $svgPath.getTotalLength()
        },
    }
}

export const TangentCurve = ({
    from,
    fromDir,
    to,
    toDir,

    curveRef,

    pathProps,
}: {
    from: Vector2
    fromDir: Vector2
    to: Vector2
    toDir: Vector2

    curveRef?: (el: SVGPathElement | null) => void

    pathProps?: SVGAttributes<SVGPathElement>
}) => {
    const len = Math.max(1, Vec2.distance(from, to))

    const control1 = Vec2.add(from, Vec2.scale(fromDir, len / 2))
    const control2 = Vec2.add(to, Vec2.scale(toDir, len / 2))

    return (
        <>
            <path
                ref={curveRef}
                d={`M ${from.x} ${from.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${to.x} ${to.y}`}
                {...pathProps}
            />
        </>
    )
}
