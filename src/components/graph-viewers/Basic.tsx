import type { Decoration } from '@/lib/port-graph'
import type { Viewer, ViewerOverlay } from '.'
import { Vec2 } from '@/lib/vec2'
import { latexDecoration } from '@/lib/graph-dsl'
import { groupByKeyset } from '@/lib/util'

export const Basic: Viewer = ({ graph, decorations, vertexProps, edgeProps }) => {
    const positionDeco = decorations.position
    const minX = Math.min(...positionDeco.values().map(p => p.x))
    const minY = Math.min(...positionDeco.values().map(p => p.y))

    let idx = 0
    const allPositions: Record<string, { fixed: boolean; x: number; y: number }> = Object.fromEntries(
        positionDeco.entries().map(([v, pos]) => [v, { fixed: false, x: pos.x, y: pos.y }])
    )

    // Assign default positions to unpositioned vertices
    for (const v of graph.nodes()) {
        if (!allPositions[v]) {
            allPositions[v] = {
                fixed: true,
                x: minX - 75 + idx * 35,
                y: minY - 75,
            }
            idx++
        }
    }

    // Map edge IDs to all the decorations for that edge
    const edgeIdToDecorationsDict = new Map<string, { type: string; data: any }[]>()

    for (const e of graph.edges()) {
        const id = e.id
        if (!edgeIdToDecorationsDict.has(id)) {
            edgeIdToDecorationsDict.set(id, [])
        }

        Object.entries(decorations).forEach(([decType, decData]) => {
            const edgeDecs = (decData as Decoration<any>).get(id)
            if (edgeDecs) {
                edgeIdToDecorationsDict.get(id)!.push({ type: decType, data: edgeDecs })
            }
        })
    }

    let overlays: ViewerOverlay[] = []

    return [
        <>
            {graph
                .nodes()
                .sort((a, b) => a.localeCompare(b))
                .map(v => {
                    const { fixed, ...pos } = allPositions[v]

                    return (
                        <g transform={`translate(${pos.x}, ${pos.y})`} {...(vertexProps?.(v) ?? {})}>
                            <circle
                                class="interactive cursor-pointer"
                                r="20"
                                fill={fixed ? '#f0f0f0' : '#e0e0e0'}
                                stroke={fixed ? '#bbb' : '#999'}
                            />
                            <text
                                fill={fixed ? '#bbb' : '#333'}
                                text-anchor="middle"
                                dominant-baseline="middle"
                                font-family="JetBrains Mono, monospace"
                                font-size="16"
                            >
                                {v}
                            </text>
                        </g>
                    )
                })}

            {groupByKeyset(graph.edges(), edge => new Set([edge.from.vertex, edge.to.vertex])).map(
                sameVertexPairEdges =>
                    sameVertexPairEdges.map((e, i) => {
                        const fromPos = positionDeco.get(e.from.vertex)!
                        const toPos = positionDeco.get(e.to.vertex)!

                        const dir = Vec2.normalize(Vec2.sub(toPos, fromPos))
                        const offset = Vec2.scale(dir, 35)

                        const fromPosOffset = Vec2.add(fromPos, offset)
                        const toPosOffset = Vec2.sub(toPos, offset)

                        const midPointPre = Vec2.lerp(
                            fromPosOffset,
                            toPosOffset,
                            0.5 - 5 / Vec2.distance(fromPosOffset, toPosOffset)
                        )
                        const midPointPost = Vec2.lerp(
                            fromPosOffset,
                            toPosOffset,
                            0.5 + 5 / Vec2.distance(fromPosOffset, toPosOffset)
                        )

                        const samePairOffset = Vec2.scale(Vec2.perpendicular(dir), -15 * i)

                        return (
                            <g transform={`translate(${samePairOffset.x}, ${samePairOffset.y})`}>
                                <line
                                    class="edge-hitbox interactive cursor-pointer"
                                    x1={fromPosOffset.x}
                                    y1={fromPosOffset.y}
                                    x2={toPosOffset.x}
                                    y2={toPosOffset.y}
                                    stroke="transparent"
                                    stroke-width="15"
                                    stroke-linecap="round"
                                    {...(edgeProps?.(e.id) ?? {})}
                                />

                                <line
                                    x1={fromPosOffset.x}
                                    y1={fromPosOffset.y}
                                    x2={toPosOffset.x}
                                    y2={toPosOffset.y}
                                    stroke="#000"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                />

                                {e.directed && (
                                    <line
                                        x1={midPointPre.x}
                                        y1={midPointPre.y}
                                        x2={midPointPost.x}
                                        y2={midPointPost.y}
                                        stroke="#000"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        marker-end="url(#arrowhead)"
                                    />
                                )}

                                {/* Draw Start Port Label */}
                                <text
                                    {...Vec2.lerp(fromPosOffset, fromPos, 0.25)}
                                    text-anchor="middle"
                                    dominant-baseline="middle"
                                    font-family="Source Code Pro, monospace"
                                    font-size="12"
                                    fill="#000"
                                >
                                    {e.from.port}
                                </text>

                                {/* Draw End Port Label */}
                                <text
                                    {...Vec2.lerp(toPosOffset, toPos, 0.25)}
                                    text-anchor="middle"
                                    dominant-baseline="middle"
                                    font-family="Source Code Pro, monospace"
                                    font-size="12"
                                    fill="#000"
                                >
                                    {e.to.port}
                                </text>

                                {/* Edge Decorations */}
                                {edgeIdToDecorationsDict.get(e.id)?.map((dec, j) => {
                                    const label = `${dec.type}: ${JSON.stringify(dec.data)}`
                                    const labelPos = Vec2.add(Vec2.lerp(fromPosOffset, toPosOffset, 0.5), {
                                        x: 0,
                                        y: -15 + j * 19,
                                    })

                                    const asLatexDeco = latexDecoration.safeParse(dec.data)
                                    if (asLatexDeco.success) {
                                        overlays.push({
                                            position: labelPos,
                                            content: { format: 'latex', value: asLatexDeco.data.value },
                                        })

                                        return null
                                    }

                                    return (
                                        <>
                                            <rect
                                                x={labelPos.x - label.length * 3.5 - 5}
                                                y={labelPos.y - 10}
                                                width={label.length * 7 + 2 * 5}
                                                height={20}
                                                fill="#fff"
                                                stroke="#ccc"
                                                stroke-width="1"
                                                rx="4"
                                                ry="4"
                                                class="pointer-events-none"
                                            />
                                            <text
                                                {...labelPos}
                                                text-anchor="middle"
                                                dominant-baseline="middle"
                                                font-family="Source Code Pro, monospace"
                                                font-size="12"
                                                fill="#333"
                                                paint-order="stroke"
                                            >
                                                {label}
                                            </text>
                                        </>
                                    )
                                })}
                            </g>
                        )
                    })
            )}

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
