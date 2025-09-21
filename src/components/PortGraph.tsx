import { type JSX } from 'preact'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { type Decoration, type PortGraph } from '../lib/port-graph'
import { useStatusBar } from './StatusBar'
import { Katex } from './KaTeX'
import type { Viewer } from './graph-viewers'
import { Basic } from './graph-viewers/Basic'
import { memo } from 'preact/compat'
import { roundTo } from '@/lib/util'

type Props<D extends { position: Decoration<{ x: number; y: number }> }> = {
    graph: PortGraph<string>
    decorations: D
    setDecoration: (decType: keyof D, id: string, value: any) => void

    viewer?: Viewer
}

/**
 * A component to visualize a PortGraph with decorations.
 * Supports dragging vertices to set their positions.
 * Integrates with the StatusBar to show information about vertices and edges on hover.
 *
 * Props:
 * - graph: The PortGraph to visualize.
 * - decorations: Decorations for the graph, must include a 'position' decoration.
 * - setDecoration: Function to update a decoration for a specific vertex or edge.
 * - viewer: Optional custom viewer component. Defaults to Basic viewer if not provided.
 */
export const PortGraphViewer = memo(
    <D extends { position: Decoration<{ x: number; y: number }> }>({
        graph,
        decorations,
        setDecoration,
        viewer,
    }: Props<D>) => {
        const svgRef = useRef<SVGSVGElement>(null)
        const [size, setSize] = useState<{ width: number; height: number } | null>(null)

        const minX = Math.min(...decorations.position.values().map(p => p.x))
        const maxX = Math.max(...decorations.position.values().map(p => p.x))
        const minY = Math.min(...decorations.position.values().map(p => p.y))
        const maxY = Math.max(...decorations.position.values().map(p => p.y))

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
        // const [mouseContentPos, setMouseContentPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

        const [draggingVertex, setDraggingVertex] = useState<string | null>(null)

        // Status Bar Integration
        const { clearMessage, onHover: statusBarOnHoverHandler } = useStatusBar()

        useEffect(() => {
            const onPointerUp = () => {
                setDraggingVertex(null)

                clearMessage('vertex_label')
                clearMessage('edge_label')
            }
            document.body.addEventListener('pointerup', onPointerUp)

            return () => {
                document.body.removeEventListener('pointerup', onPointerUp)
            }
        }, [])

        useEffect(() => {
            console.log('Dragging vertex:', draggingVertex)
        }, [draggingVertex])

        const graphOnHoverHandler = (key: string, value: string) => {
            const handler = statusBarOnHoverHandler(key, value)

            return {
                onPointerEnter: () => {
                    if (draggingVertex === null) {
                        handler.onPointerEnter()
                    }
                },
                onPointerLeave: () => {
                    if (draggingVertex === null) {
                        handler.onPointerLeave()
                    }
                },
            }
        }

        const vertexProps = useCallback(
            (v: string) => {
                console.log('Getting props for vertex', v)

                return {
                    onPointerDown: () => setDraggingVertex(v),
                    ...graphOnHoverHandler(
                        `vertex_label`,
                        decorations.position.has(v)
                            ? `Vertex: ${v}`
                            : `Vertex: ${v} (Unpositioned, drag to add position decoration)`
                    ),
                    onWheel: (e: WheelEvent) => {
                        if ('direction' in decorations) {
                            const directionDeco = decorations.direction as Decoration<number>
                            if (directionDeco.has(v)) {
                                e.preventDefault()
                                const currentDirDegrees = (directionDeco.get(v)! / Math.PI) * 180
                                const delta = e.deltaY < 0 ? -5 : 5

                                // @ts-ignore
                                setDecoration('direction', v, (roundTo(currentDirDegrees + delta, 5) / 180) * Math.PI)
                            }
                        }
                        if ('angle' in decorations) {
                            const angleDeco = decorations.angle as Decoration<number>
                            if (angleDeco.has(v)) {
                                e.preventDefault()
                                const currentAngleDegrees = (angleDeco.get(v)! / Math.PI) * 180
                                const delta = e.deltaY < 0 ? -5 : 5

                                // @ts-ignore
                                setDecoration('angle', v, (roundTo(currentAngleDegrees + delta, 5) / 180) * Math.PI)
                            }
                        }
                    },
                }
            },
            [decorations, statusBarOnHoverHandler, draggingVertex]
        )

        const edgeProps = useCallback(
            (e: string) => {
                const edge = graph.getEdgeById(e)!
                const edgeDecs = Object.entries(decorations).flatMap(([decType, decData]) => {
                    const edgeDec = (decData as Decoration<any>).get(e)
                    if (edgeDec) {
                        return [`${decType}: ${JSON.stringify(edgeDec)}`]
                    }
                    return []
                })

                return {
                    ...graphOnHoverHandler(
                        `edge_label`,
                        `Edge: ${edge.from.vertex}:${edge.from.port} ${
                            edge.directed ? '→' : '—'
                        } ${edge.to.vertex}:${edge.to.port}${edgeDecs.length > 0 ? ' ' + edgeDecs.join(' ') : ''}`
                    ),
                }
            },
            [decorations, graph, statusBarOnHoverHandler]
        )

        // Render the selected viewer
        // Default to Basic viewer if none provided

        const [viewerContent, viewerOverlays] = (viewer ?? Basic)({
            graph,
            decorations,
            vertexProps,
            edgeProps,
        })

        return (
            <>
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
                                    // setMouseContentPos({ x: contentPoint.x, y: contentPoint.y })

                                    if (draggingVertex) {
                                        console.log('Updating position of', draggingVertex)
                                        setDecoration('position', draggingVertex, {
                                            x: roundTo(contentPoint.x, 5),
                                            y: roundTo(contentPoint.y, 5),
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

                            {viewerContent}

                            {/* Mouse Red Circle */}
                            {/* <circle class="mouse" cx={mouseContentPos.x} cy={mouseContentPos.y} r="5" fill="#f004" /> */}
                        </g>
                    )}
                </svg>
                {size && (
                    <div
                        class="overlays"
                        style={{
                            width: size?.width,
                            height: size?.height,
                            transform: `translate(${size.width / 2 - graphMidX}px, ${size.height / 2 - graphMidY}px)`,
                        }}
                    >
                        {viewerOverlays.map(overlay => (
                            <div
                                class="overlay"
                                style={{
                                    left: overlay.position.x,
                                    top: overlay.position.y,
                                }}
                            >
                                {overlay.content.format === 'latex' ? (
                                    <Katex value={overlay.content.value} />
                                ) : (
                                    overlay.content.value
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </>
        )
    }
)
