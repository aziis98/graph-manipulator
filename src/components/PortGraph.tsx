import { useEffect, useRef, useState } from 'preact/hooks'
import { type Decoration, type PortGraph } from '../lib/port-graph'
import { Vec2 } from '../lib/vec2'

export const Viewers = {
    Basic: ({
        graph,
        decorations: { positions },
        vertexProps,
    }: {
        graph: PortGraph<string>
        decorations: {
            positions: Decoration<{ x: number; y: number }>
        }
        vertexProps: (v: string) => Record<string, any>
    }) => {
        return (
            <>
                {graph.nodes().map(v => {
                    const pos = positions.get(v)!

                    return (
                        <g key={v} transform={`translate(${pos.x}, ${pos.y})`} {...vertexProps(v)}>
                            <circle class="interactive" r="20" fill="#e8e8e8" />
                            <text
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

                {graph.edges().map((e, i) => {
                    const fromPos = positions.get(e.from.vertex)!
                    const toPos = positions.get(e.to.vertex)!

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

                    return (
                        <>
                            <line
                                key={i}
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
                                    key={i + 0.5}
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
            </>
        )
    },
}

export const PortGraphViewer = ({
    graph,
    decorations,
    setDecoration,
}: {
    graph: PortGraph<string>
    decorations: {
        positions: Decoration<{ x: number; y: number }>
    }
    setDecoration: (type: 'positions', vertex: string, value: { x: number; y: number }) => void
}) => {
    const svgRef = useRef<SVGSVGElement>(null)
    const [size, setSize] = useState<{ width: number; height: number } | null>(null)

    const minX = Math.min(...decorations.positions.values().map(p => p.x))
    const maxX = Math.max(...decorations.positions.values().map(p => p.x))
    const minY = Math.min(...decorations.positions.values().map(p => p.y))
    const maxY = Math.max(...decorations.positions.values().map(p => p.y))

    const graphMidX = (minX + maxX) / 2
    const graphMidY = (minY + maxY) / 2

    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect
                setSize({ width, height })
            }
        })

        if (svgRef.current) {
            observer.observe(svgRef.current)
        }

        return () => {
            observer.disconnect()
        }
    }, [])

    const contentRef = useRef<SVGGElement>(null)
    const [mouseContentPos, setMouseContentPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

    const [draggingVertex, setDraggingVertex] = useState<string | null>(null)

    useEffect(() => {
        const onPointerUp = () => {
            setDraggingVertex(null)
        }
        document.body.addEventListener('pointerup', onPointerUp)

        return () => {
            document.body.removeEventListener('pointerup', onPointerUp)
        }
    }, [])

    useEffect(() => {
        console.log('Dragging vertex:', draggingVertex)
    }, [draggingVertex])

    return (
        <svg ref={svgRef}>
            {size && (
                <g
                    ref={contentRef}
                    onPointerMove={e => {
                        if (!svgRef.current || !contentRef.current) return

                        const svgRect = svgRef.current.getBoundingClientRect()
                        const mouseX = e.clientX - svgRect.left
                        const mouseY = e.clientY - svgRect.top

                        const ctm = contentRef.current.getCTM()
                        if (ctm) {
                            const inverse = ctm.inverse()
                            const svgPoint = svgRef.current.createSVGPoint()
                            svgPoint.x = mouseX
                            svgPoint.y = mouseY
                            const contentPoint = svgPoint.matrixTransform(inverse)
                            setMouseContentPos({ x: contentPoint.x, y: contentPoint.y })

                            if (draggingVertex) {
                                setDecoration('positions', draggingVertex, {
                                    x: Math.round(contentPoint.x),
                                    y: Math.round(contentPoint.y),
                                })
                            }
                        }
                    }}
                    transform={`translate(${size.width / 2 - graphMidX}, ${size.height / 2 - graphMidY})`}
                >
                    <rect
                        class="interactive"
                        x={graphMidX - size.width / 2}
                        y={graphMidY - size.height / 2}
                        width={size.width}
                        height={size.height}
                        fill="transparent"
                    />

                    <Viewers.Basic
                        graph={graph}
                        decorations={decorations}
                        vertexProps={v => ({
                            onPointerDown: () => setDraggingVertex(v),
                        })}
                    />

                    {/* Mouse Red Circle */}
                    <circle cx={mouseContentPos.x} cy={mouseContentPos.y} r="5" fill="#f00" />
                </g>
            )}
        </svg>
    )
}
