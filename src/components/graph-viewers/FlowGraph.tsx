import { type AnyComponent, type Ref, type SVGAttributes } from 'preact'

import { decoratedGraphToEdgeDecorationMap, type Decoration } from '@/lib/port-graph'
import type { Viewer, ViewerOverlay } from '.'
import { Vec2, type Vector2 } from '@/lib/vec2'
import { decoration, latexDecoration } from '@/lib/graph-dsl'
import { useEffect, useRef, useState } from 'preact/hooks'

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

/**
 * A viewer that displays a flow graph with directed edges and port labels.
 * A flow graph is a directed graph where edges have ports called `in`
 * and `out`. Each edge connects from the `out` port of the source
 * vertex to the `in` port of the target vertex. There can be cycles in
 * the graph.
 */
export const FlowGraph: Viewer = ({ graph, decorations, vertexProps, edgeProps }) => {
    const positionDeco = decorations.position
    const directionDeco: Decoration<number> =
        'direction' in decorations ? (decorations.direction as Decoration<number>) : decoration<number>()

    // Map edge IDs to all the decorations for that edge
    const edgeIdToDecorationsDict = decoratedGraphToEdgeDecorationMap({ graph, decorations })

    const nodeCurveDirections = Object.fromEntries(
        positionDeco.entries().map(([v, pos]) => {
            const outNodes = graph.outset(v).map(e => e.to.vertex)
            const inNodes = graph.inset(v).map(e => e.from.vertex)

            const size = 2 + Math.max(outNodes.length, inNodes.length)

            const angle = directionDeco.get(v)
            if (angle !== undefined) {
                const outDir = Vec2.rotor(angle)
                return [
                    v,
                    {
                        position: pos,
                        size,
                        out: outDir,
                        in: Vec2.scale(outDir, -1),
                    },
                ]
            }

            const outNodePositions = outNodes.flatMap(v => {
                const pos = positionDeco.get(v)
                if (pos) return [pos]
                return []
            })
            const inNodePositions = inNodes.flatMap(v => {
                const pos = positionDeco.get(v)
                if (pos) return [pos]
                return []
            })

            const outDirAvg =
                outNodePositions.length > 0
                    ? Vec2.normalize(Vec2.average(outNodePositions.map(p => Vec2.sub(p, pos))))
                    : Vec2.of(0, -1)
            const inDirAvg =
                inNodePositions.length > 0
                    ? Vec2.normalize(Vec2.average(inNodePositions.map(p => Vec2.sub(p, pos))))
                    : Vec2.of(0, 1)

            // Finally, ensure that outDir and inDir are parallel
            // This is done by averaging them and picking the perpendicular direction
            let avgDir = Vec2.add(outDirAvg, inDirAvg)
            if (Vec2.isClose(avgDir, Vec2.Zero)) {
                // avgDir = Vec2.perpendicular(outDir)
                avgDir = { x: 1, y: 0 }
            }
            avgDir = Vec2.normalize(avgDir)

            const perpDir = Vec2.perpendicular(avgDir)
            const perpDirOpp = Vec2.scale(perpDir, -1)

            // Choose the direction that is closest to the original outDir
            if (Vec2.dot(perpDir, outDirAvg) < Vec2.dot(perpDirOpp, outDirAvg)) {
                return [
                    v,
                    {
                        position: pos,
                        size,
                        out: perpDirOpp,
                        in: perpDir,
                    },
                ]
            } else {
                return [
                    v,
                    {
                        position: pos,
                        size,
                        out: perpDir,
                        in: perpDirOpp,
                    },
                ]
            }
        })
    )

    const edgeCurveRefs = useRef<Record<string, SVGPathElement | null>>({})

    // const [edgeMidInfo, setEdgeMidInfo] = useState<{ [edgeId: string]: { position: Vector2; direction: Vector2 } }>({})

    // useEffect(() => {
    //     // Reset edge mid info when graph or decorations change
    //     setEdgeMidInfo({})
    // }, [graph, decorations])

    let overlays: ViewerOverlay[] = []

    return [
        <>
            {positionDeco.entries().map(([v, pos]) => {
                return (
                    <g transform={`translate(${pos.x}, ${pos.y})`} {...(vertexProps?.(v) ?? {})}>
                        <circle class="interactive cursor-pointer" r={nodeCurveDirections[v].size} fill="#333" />
                    </g>
                )
            })}

            {graph.edges().map(e => {
                const fromPos = positionDeco.get(e.from.vertex)!
                const toPos = positionDeco.get(e.to.vertex)!

                const fromDir = nodeCurveDirections[e.from.vertex].out
                const toDir = nodeCurveDirections[e.to.vertex].in
                // const fromDir = { x: 0, y: -1 }
                // const toDir = { x: 0, y: 1 }

                // Offset the start and end positions by 20 in the direction of the curve
                const fromPosOffset = Vec2.add(fromPos, Vec2.scale(fromDir, nodeCurveDirections[e.from.vertex].size))
                const toPosOffset = Vec2.add(toPos, Vec2.scale(toDir, nodeCurveDirections[e.to.vertex].size))

                return (
                    <>
                        <TangentCurve
                            from={fromPosOffset}
                            fromDir={fromDir}
                            to={toPosOffset}
                            toDir={toDir}
                            curveRef={
                                $path =>
                                    // {
                                    // if ($path) {
                                    //     const midPoint = $path.getPointAtLength($path.getTotalLength() / 2)
                                    //     const midPointAfter = $path.getPointAtLength($path.getTotalLength() / 2 + 0.1)

                                    //     const midPointDir = Vec2.normalize(Vec2.sub(midPointAfter, midPoint))

                                    //     setEdgeMidInfo(old => {
                                    //         if (e.id in old) {
                                    //             return old
                                    //         }

                                    //         return {
                                    //             ...old,
                                    //             [e.id]: {
                                    //                 position: { x: midPoint.x, y: midPoint.y },
                                    //                 direction: midPointDir,
                                    //             },
                                    //         }
                                    //     })
                                    // }
                                    (edgeCurveRefs.current[e.id] = $path)
                                // }
                            }
                            pathProps={{
                                'fill': 'none',
                                'stroke': '#333',
                                'stroke-width': 2,
                                'marker-mid': 'url(#arrowhead)',
                                ...(edgeProps?.(e.id) ?? {}),
                            }}
                        />
                    </>
                )
            })}

            {/* {Object.values(edgeMidInfo).map(({ position, direction }) => { */}
            {graph.edges().map(e => {
                const midPoint = edgeCurveRefs.current[e.id]?.getPointAtLength(
                    (edgeCurveRefs.current[e.id]?.getTotalLength() ?? 0) / 2
                )
                const midPointAfter = edgeCurveRefs.current[e.id]?.getPointAtLength(
                    (edgeCurveRefs.current[e.id]?.getTotalLength() ?? 0) / 2 + 0.1
                )

                if (!midPoint || !midPointAfter) return <></>

                const direction = Vec2.normalize(Vec2.sub(midPointAfter, midPoint))
                const position = { x: midPoint.x, y: midPoint.y }

                const arrowSize = 10

                return (
                    <>
                        {/* Arrow as arrowhead below */}
                        <g
                            transform={`translate(${position.x}, ${position.y}) rotate(${
                                (Math.atan2(direction.y, direction.x) * 180) / Math.PI
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
                    </>
                )
            })}

            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="5" refY="3.5" orient="auto">
                    <path
                        d="M0,0 L5,3.5 L0,7"
                        fill="none"
                        stroke="#000"
                        stroke-width="1"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </marker>
            </defs>
        </>,
        overlays,
    ]
}
