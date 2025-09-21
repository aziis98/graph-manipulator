import { type AnyComponent, type Ref, type SVGAttributes } from 'preact'

import { decoratedGraphToEdgeDecorationMap, type Decoration } from '@/lib/port-graph'
import type { Viewer, ViewerOverlay } from '.'
import { Vec2, type Vector2 } from '@/lib/vec2'
import { decoration, latexDecoration } from '@/lib/graph-dsl'
import { useEffect, useRef, useState } from 'preact/hooks'

const getCurveInfo = (from: Vector2, fromDir: Vector2, to: Vector2, toDir: Vector2) => {
    const len = Math.max(1, Vec2.distance(from, to))
    const control1 = Vec2.add(from, Vec2.scale(fromDir, len / 2))
    const control2 = Vec2.add(to, Vec2.scale(toDir, len / 2))

    const strPath = `M ${from.x} ${from.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${to.x} ${to.y}`

    const $svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    $svgPath.setAttribute('d', strPath)

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

const TangentCurve = ({
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

const CROSSING_RADIUS = 15

/**
 * A viewer that displays a graph with curved edges representing knot diagrams.
 * Nodes that represent crossings have 4 edges connected to them named `0`, `1`, `2`, and `3`.
 * The edges `0` and `2` are opposite each other, as are `1` and `3`.
 * The crossing resolution decoration determines which pair of edges goes "over" the other pair.
 * - `over`: edges `0` and `2` go over edges `1` and `3`
 * - `under`: edges `1` and `3` go over edges `0` and `2`
 *
 * Resolution decorations `0-resolution` and `1-resolution` are used to easily splice crossings in
 * a knot:
 * - `0-resolution`: edges `0` and `1` are connected, and edges `2` and `3` are connected
 * - `1-resolution`: edges `1` and `2` are connected, and edges `3` and `0` are connected
 *
 */
export const KnotLink: Viewer<{
    angle?: Decoration<number>
    flip?: Decoration<boolean>
    mirror?: Decoration<boolean>
    resolved?: Decoration<boolean>
}> = ({ graph, decorations, vertexProps, edgeProps }) => {
    console.log(decorations)

    const positionDeco = decorations.position

    const flipDeco: Decoration<boolean> =
        'flip' in decorations ? (decorations.flip as Decoration<boolean>) : decoration<boolean>()
    const mirrorDeco: Decoration<boolean> =
        'mirror' in decorations ? (decorations.mirror as Decoration<boolean>) : decoration<boolean>()
    const resolvedDeco: Decoration<boolean> =
        'resolved' in decorations ? (decorations.resolved as Decoration<boolean>) : decoration<boolean>()

    const angleDeco: Decoration<number> =
        'angle' in decorations ? (decorations.angle as Decoration<number>) : decoration<number>()

    const crossingCtrlPoints: {
        [vertexId: string]: {
            position: Vector2
            directions: [Vector2, Vector2, Vector2, Vector2] // directions for edges 0, 1, 2, 3
        }
    } = Object.fromEntries(
        graph.nodes().map(v => {
            const pos = positionDeco.get(v)!
            const neighbors = ['0', '1', '2', '3'].map(port => {
                const neighboringVertices = graph.neighbors(v, port)
                if (neighboringVertices.length !== 1) {
                    throw new Error(`Crossing vertex ${v} must have exactly one edge for port ${port}`)
                }

                return neighboringVertices[0]
            })

            // Get the positions of the neighboring vertices
            const neighborPositions = neighbors.map(n => {
                const p = positionDeco.get(n)!
                if (!p) {
                    throw new Error(`Neighbor vertex ${n} of crossing ${v} must have a position`)
                }
                return p
            })

            // const baseAngle = angleDeco.has(v)
            //     ? angleDeco.get(v)!
            //     : Math.atan2(neighborPositions[0].y - pos.y, neighborPositions[0].x - pos.x)

            const baseAngle = Math.atan2(neighborPositions[0].y - pos.y, neighborPositions[0].x - pos.x)
            const deltaAngle = angleDeco.get(v) ?? 0

            const flipSign = flipDeco.has(v) && flipDeco.get(v) ? -1 : 1

            return [
                v,
                {
                    position: pos,
                    directions: Array.from({ length: 4 }, (_, i) => {
                        return Vec2.rotor(baseAngle + deltaAngle - flipSign * (Math.PI / 2) * i)
                    }) as [Vector2, Vector2, Vector2, Vector2],
                },
            ]
        })
    )

    return [
        <>
            {graph.edges().map(e => {
                const fromPos = positionDeco.get(e.from.vertex)!
                const toPos = positionDeco.get(e.to.vertex)!

                const fromDir = crossingCtrlPoints[e.from.vertex]?.directions[parseInt(e.from.port)] ?? { x: 0, y: -1 }
                const toDir = crossingCtrlPoints[e.to.vertex]?.directions[parseInt(e.to.port)] ?? { x: 0, y: 1 }

                const fromPosOffset = Vec2.add(fromPos, Vec2.scale(fromDir, CROSSING_RADIUS))
                const toPosOffset = Vec2.add(toPos, Vec2.scale(toDir, CROSSING_RADIUS))

                // const fromDir = { x: 0, y: -1 }
                // const toDir = { x: 0, y: 1 }

                // Offset the start and end positions by 20 in the direction of the curve

                const curve = getCurveInfo(fromPosOffset, fromDir, toPosOffset, toDir)

                const len = curve.getTotalLength()
                const midPoint = curve.getPointAtLength(len / 2)
                const midPointAfter = curve.getPointAtLength(len / 2 + 0.1)
                const midDir = Vec2.normalize(Vec2.sub(midPointAfter, midPoint))

                const arrowSize = 10

                return (
                    <>
                        <TangentCurve
                            from={fromPosOffset}
                            fromDir={fromDir}
                            to={toPosOffset}
                            toDir={toDir}
                            pathProps={{
                                'class': 'edge-hitbox interactive cursor-pointer',
                                'fill': 'none',
                                'stroke': 'transparent',
                                'stroke-width': 15,
                                'stroke-linecap': 'round',
                                ...(edgeProps?.(e.id) ?? {}),
                            }}
                        />

                        <TangentCurve
                            from={fromPosOffset}
                            fromDir={fromDir}
                            to={toPosOffset}
                            toDir={toDir}
                            pathProps={{
                                'fill': 'none',
                                'stroke': '#333',
                                'stroke-width': 2,
                                'marker-mid': 'url(#arrowhead)',
                            }}
                        />

                        {e.directed && (
                            <g
                                transform={`translate(${midPoint.x}, ${midPoint.y}) rotate(${
                                    (Math.atan2(midDir.y, midDir.x) * 180) / Math.PI
                                }) translate(${-arrowSize / 2}, ${-arrowSize / 2})`}
                            >
                                <path
                                    d={`M0,0 L${arrowSize * 0.75},${arrowSize / 2} L0,${arrowSize}`}
                                    fill="none"
                                    stroke="#333"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </g>
                        )}
                    </>
                )
            })}

            {positionDeco.entries().map(([v, pos]) => {
                const { directions } = crossingCtrlPoints[v] ?? {
                    directions: [
                        { x: 0, y: -1 },
                        { x: 1, y: 0 },
                        { x: 0, y: 1 },
                        { x: -1, y: 0 },
                    ],
                }

                // If this vertex is a crossing, draw the crossing lines
                // if (resolutionDeco.has(v)) {

                // }

                const [overFrom, overTo] = (mirrorDeco.get(v) ?? false) ? [0, 2] : [1, 3]
                const [overFromDir, overToDir] = [directions[overFrom], directions[overTo]]

                return (
                    <g transform={`translate(${pos.x}, ${pos.y})`} {...(vertexProps?.(v) ?? {})}>
                        <circle class="interactive cursor-pointer" r={CROSSING_RADIUS} fill="#f0f0f0" />

                        {/* Over strand */}
                        <line
                            x1={Vec2.scale(overFromDir, CROSSING_RADIUS).x}
                            y1={Vec2.scale(overFromDir, CROSSING_RADIUS).y}
                            x2={Vec2.scale(overToDir, CROSSING_RADIUS).x}
                            y2={Vec2.scale(overToDir, CROSSING_RADIUS).y}
                            stroke="#333"
                            stroke-width="2"
                            stroke-linecap="round"
                        />
                    </g>
                )
            })}
        </>,
        [],
    ]
}
