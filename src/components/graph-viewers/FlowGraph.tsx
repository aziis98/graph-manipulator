import { Decoration } from "@/lib/graphs"
import { Vec2 } from "@/lib/vec2"
import type { Viewer, ViewerOverlay } from "."
import { getCurveInfo, TangentCurve } from "../svg/TangentCurve"

/**
 * A viewer that displays a flow graph with directed edges and port labels.
 */
export const FlowGraph: Viewer = ({ graph, decorations, vertexProps, edgeProps }) => {
    const positionDeco = decorations.position
    const directionDeco: Decoration<number> =
        "direction" in decorations ? (decorations.direction as Decoration<number>) : new Decoration<number>()

    // Map edge IDs to all the decorations for that edge
    // const edgeIdToDecorationsDict = decoratedGraphToEdgeDecorationMap({ graph, decorations })

    const nodeCurveDirections = Object.fromEntries(
        positionDeco.entries().map(([v, pos]) => {
            const outNodes = graph.outset(v).map(e => e.to.vertex)
            const inNodes = graph.inset(v).map(e => e.from.vertex)

            const size = outNodes.length === 1 && inNodes.length === 1 ? 4 : 5

            const dir = directionDeco.get(v)
            if (dir !== undefined) {
                const outDir = Vec2.rotor(dir)
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

            let outDirAvg =
                outNodePositions.length > 0
                    ? Vec2.normalize(Vec2.average(outNodePositions.map(p => Vec2.sub(p, pos))))
                    : null
            let inDirAvg =
                inNodePositions.length > 0
                    ? Vec2.normalize(Vec2.average(inNodePositions.map(p => Vec2.sub(p, pos))))
                    : null

            if (outDirAvg === null && inDirAvg === null) {
                // Isolated node, just point right
                return [
                    v,
                    {
                        position: pos,
                        size,
                        out: { x: 1, y: 0 },
                        in: { x: -1, y: 0 },
                    },
                ]
            }
            if (outDirAvg === null && inDirAvg !== null) {
                outDirAvg = Vec2.scale(inDirAvg, -1)
            }
            if (inDirAvg === null && outDirAvg !== null) {
                inDirAvg = Vec2.scale(outDirAvg, -1)
            }

            // console.log(outDirAvg, inDirAvg)

            // Finally, ensure that outDir and inDir are parallel
            // This is done by averaging them and picking the perpendicular direction
            let avgDir = Vec2.add(outDirAvg!, inDirAvg!)
            if (Vec2.isClose(avgDir, Vec2.Zero)) {
                return [
                    v,
                    {
                        position: pos,
                        size,
                        out: outDirAvg!,
                        in: inDirAvg!,
                    },
                ]
            }
            avgDir = Vec2.normalize(avgDir)

            // rotate avgDir by angle
            // avgDir = Vec2.rotate(avgDir, angle)

            let perpDir = Vec2.perpendicular(avgDir)
            let perpDirOpp = Vec2.scale(perpDir, -1)

            // Choose the direction that is closest to the original outDir
            if (Vec2.dot(perpDir, outDirAvg!) < Vec2.dot(perpDirOpp, outDirAvg!)) {
                ;[perpDir, perpDirOpp] = [perpDirOpp, perpDir]
            }

            // rotate perpDir and perpDirOpp by angle
            // perpDir = Vec2.rotate(perpDir, angle)
            // perpDirOpp = Vec2.rotate(perpDirOpp, angle)

            return [
                v,
                {
                    position: pos,
                    size,
                    out: perpDir,
                    in: perpDirOpp,
                },
            ]

            //     return [
            //         v,
            //         {
            //             position: pos,
            //             size,
            //             out: perpDirOpp,
            //             in: perpDir,
            //         },
            //     ]
            // } else {
            //     return [
            //         v,
            //         {
            //             position: pos,
            //             size,
            //             out: perpDir,
            //             in: perpDirOpp,
            //         },
            //     ]
            // }
        })
    )

    // const edgeCurveRefs = useRef<Record<string, SVGPathElement | null>>({})

    // const [edgeMidInfo, setEdgeMidInfo] = useState<{ [edgeId: string]: { position: Vector2; direction: Vector2 } }>({})

    // useEffect(() => {
    //     // Reset edge mid info when graph or decorations change
    //     setEdgeMidInfo({})
    // }, [graph, decorations])

    const styleDeco:
        | Decoration<{
              color?: string
              size?: number
          }>
        | undefined = decorations.style

    let overlays: ViewerOverlay[] = []

    return [
        <>
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
                                "class": "edge-hitbox interactive cursor-pointer",
                                "fill": "none",
                                "stroke": "transparent",
                                "stroke-width": 15,
                                "stroke-linecap": "round",
                                ...(edgeProps?.(e.id) ?? {}),
                            }}
                        />

                        <TangentCurve
                            from={fromPosOffset}
                            fromDir={fromDir}
                            to={toPosOffset}
                            toDir={toDir}
                            pathProps={{
                                "fill": "none",
                                "stroke": styleDeco?.get(e.id)?.color ?? "#333",
                                "stroke-width": 2 * (styleDeco?.get(e.id)?.size ?? 1),
                                "marker-mid": "url(#arrowhead)",
                            }}
                        />

                        <g
                            transform={[
                                `translate(${midPoint.x}, ${midPoint.y})`,
                                `rotate(${(Math.atan2(midDir.y, midDir.x) * 180) / Math.PI})`,
                                `translate(${-arrowSize / 2}, ${-arrowSize / 2})`,
                            ].join(" ")}
                        >
                            <path
                                d={`M0,0 L${arrowSize * 0.75},${arrowSize / 2} L0,${arrowSize}`}
                                fill="none"
                                stroke={styleDeco?.get(e.id)?.color ?? "#333"}
                                stroke-width={2 * (styleDeco?.get(e.id)?.size ?? 1)}
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </g>
                    </>
                )
            })}

            {positionDeco.entries().map(([v, pos]) => {
                return (
                    <g transform={`translate(${pos.x}, ${pos.y})`} {...(vertexProps?.(v) ?? {})}>
                        <circle
                            class="interactive cursor-pointer"
                            fill={styleDeco?.get(v)?.color ?? "#333"}
                            // r={nodeCurveDirections[v].size}
                            r={nodeCurveDirections[v].size * (styleDeco?.get(v)?.size ?? 1)}
                        />
                    </g>
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
