import { DecoratedGraphViewer } from "@/components/DecoratedGraph"
import { Editable } from "@/components/Editable"
import { Viewers } from "@/components/graph-viewers"
import { Katex } from "@/components/KaTeX"
import { LoadingIcon } from "@/components/LoadingIcon"
import { loadGraphExamples } from "@/lib/graph-examples-loader"
import { DecoratedGraph, Decoration } from "@/lib/graphs"
import { FormattedContent } from "@/lib/notebook"
import { svgDownloadElement } from "@/lib/svg-export"
import { intersperse } from "@/lib/util"

import { Icon } from "@iconify/react"
import clsx from "clsx"
import type { RefObject } from "preact"
import { useEffect, useRef, useState, type Dispatch } from "preact/hooks"

import type { Cell, EvaluatedCell, Notebook, NotebookAction } from "./types"

const graphExamples = await loadGraphExamples()

const NotebookCellSidebar = ({
    setCollapsed,
    collapsed,
    cell,
    evaluatedCell,
    decorations,
    updateId,
    setSource,
    evaluate,
    deleteCell,
    setViewer,

    viewerSvgRef,
}: {
    setCollapsed: (collapsed: boolean) => void
    collapsed: boolean

    cell: Cell
    evaluatedCell: EvaluatedCell | null
    decorations: Record<string, Decoration<any>>

    updateId: (newId: string) => void
    setSource: (newSource: string) => void

    evaluate: () => void

    deleteCell: () => void
    setViewer: (newViewer: keyof typeof Viewers) => void

    viewerSvgRef: RefObject<SVGGElement>
}) => (
    <div class="editor">
        <div class="grid-h">
            <button class="large" title="Collapse/Expand Cell" onClick={() => setCollapsed(!collapsed)}>
                <Icon icon="material-symbols:left-panel-close-rounded" />
            </button>
            <div class="cell-name">
                <Editable value={cell.id} onChange={newValue => updateId(newValue.trim())}>
                    <code>{cell.id}</code>
                </Editable>
            </div>
        </div>
        <div class="title">Cell Source</div>
        <div class="snippets">
            <select>
                {Object.entries(graphExamples).map(([name, code]) => (
                    <option value={name} onClick={async () => setSource(code)}>
                        {name}
                    </option>
                ))}
            </select>
            <button title="Save Snippet">
                <Icon icon="material-symbols:save-outline-rounded" />
            </button>
        </div>
        <textarea
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck={false}
            placeholder="Enter graph data here..."
            value={cell.source}
            onInput={e => setSource(e.currentTarget.value)}
            onKeyDown={e => {
                if (e.key === "Tab") {
                    e.preventDefault()
                    const textarea = e.currentTarget
                    const start = textarea.selectionStart
                    const end = textarea.selectionEnd
                    const newValue = cell.source.substring(0, start) + "  " + cell.source.substring(end)
                    setSource(newValue)
                    // Set cursor position after the inserted spaces
                    setTimeout(() => {
                        textarea.setSelectionRange(start + 2, start + 2)
                    }, 0)
                }
            }}
            rows={cell.source.split("\n").length || 1}
        ></textarea>
        <div class="buttons right">
            <button
                title="Serialize current graph to code"
                onClick={() => {
                    if (evaluatedCell?.result instanceof DecoratedGraph) {
                        const graphCode = evaluatedCell.result.serializeJS("g")

                        setSource(`${graphCode}\n\nreturn gDeco`)
                    } else {
                        alert("Current cell does not evaluate to a graph.")
                    }
                }}
            >
                <Icon icon="material-symbols:deployed-code-update-rounded" />
                <span>Diagram to Code</span>
            </button>
            <button title="Run Cell" onClick={() => evaluate()}>
                <Icon icon="material-symbols:play-arrow-rounded" />
                <span>Run</span>
            </button>
        </div>

        <div class="title">Cell Management</div>
        <div class="buttons">
            <button
                title="Delete Cell"
                onClick={() => {
                    if (confirm(`Are you sure you want to delete cell "${cell.id}"? This action cannot be undone.`)) {
                        deleteCell()
                    }
                }}
            >
                <Icon icon="material-symbols:delete-outline-rounded" />
                <span>Delete Cell</span>
            </button>
        </div>

        <div class="title">Export Diagram</div>
        <p>
            To include an SVG diagram in a LaTeX document{" "}
            <a href="https://tex.stackexchange.com/questions/2099/how-to-include-svg-diagrams-in-latex">
                use the <code>svg</code> package as explained here
            </a>
            .
        </p>
        <p>
            Note that latex decoration on vertices and edges are rendered here on the web using{" "}
            <a href="https://katex.org/">KaTeX</a> and are not yet supported in the svg export (workaround coming soon).
        </p>
        <div class="buttons">
            <button
                title="Download SVG"
                onClick={() => {
                    if (!viewerSvgRef.current) {
                        console.warn("No SVG content to export.")
                        return
                    }

                    const svgElement = viewerSvgRef.current
                    // const svgHash = hashcodeToBase36(hashString(svgElement.outerHTML))

                    svgDownloadElement(svgElement, `${cell.id}.svg`)
                }}
            >
                <Icon icon="tabler:file-type-svg" />
                <span>Export SVG</span>
            </button>
            <button title="Download LaTeX (Coming soon)" disabled>
                <Icon icon="tabler:tex" />
                <span>Export LaTeX</span>
            </button>
        </div>

        {evaluatedCell && (
            <>
                <div class="title">Viewer</div>
                <select>
                    {Object.keys(Viewers).map(v => (
                        <option
                            value={v}
                            selected={v === evaluatedCell.viewer}
                            onClick={() => setViewer(v as keyof typeof Viewers)}
                        >
                            {v}
                        </option>
                    ))}
                </select>
                <div class="title">
                    <Icon icon="material-symbols:decorations" />
                    <span>Decorations</span>
                </div>
                {Object.entries(decorations).map(([name, decoration]) => (
                    <div class="decoration">
                        <div class="decoration-name">
                            <code>{name}</code>
                        </div>
                        <div class="decoration-entries">
                            {decoration.entries().map(([k, v]) => {
                                return (
                                    <div class="decoration-entry">
                                        <div class="key">
                                            <code>{k}</code>
                                        </div>
                                        <div class="value">
                                            {name === "angle" || name === "direction" ? (
                                                <>
                                                    <code>{(v as number).toFixed(2)}rad</code>
                                                    <span class="spacer">/</span>
                                                    <code>{((v as number) * (180 / Math.PI)).toFixed(1)}°</code>
                                                </>
                                            ) : v instanceof FormattedContent && v.format === "latex" ? (
                                                <Katex value={v.value} />
                                            ) : (
                                                JSON.stringify(v)
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </>
        )}
    </div>
)

const CellViewer = ({
    evaluatedCell,
    decorations,
    updateDecorationValue,
    viewerSvgRef,
}: {
    evaluatedCell: EvaluatedCell | null
    decorations: Record<string, Decoration<any>>
    updateDecorationValue: (type: string, id: string, value: any) => void
    viewerSvgRef: RefObject<SVGGElement>
}) => {
    if (!evaluatedCell) {
        return <LoadingIcon />
    }

    return evaluatedCell.result instanceof DecoratedGraph ? (
        <DecoratedGraphViewer
            graph={evaluatedCell.result.graph}
            decorations={decorations}
            setDecoration={(type, id, value) => updateDecorationValue(type, id, value)}
            viewer={Viewers[evaluatedCell.viewer]}
            onViewerRef={ref => (viewerSvgRef.current = ref)}
        />
    ) : (
        <pre>{JSON.stringify(evaluatedCell.result, null, 2)}</pre>
    )
}

const NotebookCell = ({
    cell,
    evaluatedCell,
    decorations,

    updateId,
    setSource,
    setSize,

    evaluate,

    updateDecorationValue,
    setViewer,

    deleteCell,
}: {
    cell: Cell
    evaluatedCell: EvaluatedCell | null
    decorations: Record<string, Decoration<any>>

    updateId: (newId: string) => void
    setSize: (newSize: { width: number; height: number }) => void
    setSource: (newSource: string) => void

    evaluate: () => void

    updateDecorationValue: (type: string, id: string, value: any) => void
    setViewer: (newViewer: keyof typeof Viewers) => void

    deleteCell: () => void
}) => {
    const [collapsed, setCollapsed] = useState(cell.lastUpdated === 0 ? false : true)

    const viewerRef = useRef<HTMLDivElement>(null)

    const [internalSize, setInternalSize] = useState<{ width: number; height: number }>({
        width: cell.size.width,
        height: cell.size.height,
    })

    const internalSizeRef = useRef(internalSize)
    internalSizeRef.current = internalSize

    useEffect(() => {
        setInternalSize({ width: cell.size.width, height: cell.size.height })
    }, [cell.size])

    const [resizeDragging, setResizeDragging] = useState<{
        startX: number
        startY: number
        startWidth: number
        startHeight: number
    } | null>(null)

    useEffect(() => {
        const onPointerMove = (e: PointerEvent) => {
            if (resizeDragging && viewerRef.current) {
                const deltaX = e.clientX - resizeDragging.startX
                const deltaY = e.clientY - resizeDragging.startY

                const newWidth = Math.max(320, resizeDragging.startWidth + deltaX)
                const newHeight = Math.max(240, resizeDragging.startHeight + deltaY)

                setInternalSize({ width: newWidth, height: newHeight })
            }
        }

        const onPointerUp = () => {
            setResizeDragging(null)
            setSize(internalSizeRef.current)
        }

        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", onPointerUp)

        return () => {
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", onPointerUp)
        }
    }, [resizeDragging])

    const viewerSvgRef = useRef<SVGGElement>(null)

    return (
        <div class={clsx("cell", collapsed && "collapsed")}>
            {/* Sidebar */}
            <NotebookCellSidebar
                setCollapsed={setCollapsed}
                collapsed={collapsed}
                cell={cell}
                evaluate={evaluate}
                evaluatedCell={evaluatedCell}
                decorations={decorations}
                updateId={updateId}
                setSource={setSource}
                deleteCell={deleteCell}
                setViewer={setViewer}
                viewerSvgRef={viewerSvgRef}
            />

            {/* Viewer */}
            <div
                ref={viewerRef}
                class={clsx("viewer", resizeDragging && "resizing")}
                onDblClick={() => setCollapsed(!collapsed)}
                style={{
                    width: internalSize.width + "px",
                    height: internalSize.height + "px",
                }}
            >
                <div class="hover-tools">
                    <button class="flat large" title="Edit Cell" onClick={() => setCollapsed(!collapsed)}>
                        <Icon icon="material-symbols:code-rounded" />
                    </button>
                    <div class="cell-name">
                        <code>{cell.id}</code>
                    </div>
                </div>
                <div class="resize-handle">
                    <button
                        class="flat large"
                        title="Resize Viewer"
                        onPointerDown={e => {
                            if (viewerRef.current) {
                                setResizeDragging({
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    startWidth: viewerRef.current.offsetWidth,
                                    startHeight: viewerRef.current.offsetHeight,
                                })
                            }
                        }}
                    >
                        <Icon icon="material-symbols:arrow-range-rounded" />
                    </button>
                </div>

                <CellViewer
                    evaluatedCell={evaluatedCell}
                    decorations={decorations}
                    updateDecorationValue={updateDecorationValue}
                    viewerSvgRef={viewerSvgRef}
                />
            </div>
        </div>
    )
}

const NotebookSeparator = ({}) => (
    <div class="separator">
        <Icon icon="material-symbols:arrow-drop-down-rounded" style={{ transform: "rotate(-90deg)" }} />
    </div>
)

export const NotebookContent = ({ notebook, dispatch }: { notebook: Notebook; dispatch: Dispatch<NotebookAction> }) => {
    return (
        <div class="cells">
            {intersperse(
                Object.values(notebook.cells).map(cell => (
                    <NotebookCell
                        cell={cell}
                        evaluatedCell={notebook.evaluatedCells[cell.id] ?? null}
                        decorations={notebook.decorationsRegistry[cell.id] ?? {}}
                        updateId={newId =>
                            dispatch({
                                type: "update_cell_id",
                                cellId: cell.id,
                                newCellId: newId,
                            })
                        }
                        setSize={newSize => dispatch({ type: "update_cell_size", cellId: cell.id, newSize })}
                        setSource={newSource => dispatch({ type: "update_cell_source", cellId: cell.id, newSource })}
                        evaluate={() => dispatch({ type: "evaluate_cell", cellId: cell.id })}
                        updateDecorationValue={(type, id, value) =>
                            dispatch({
                                type: "update_cell_decoration_value",
                                cellId: cell.id,
                                decorationType: type,
                                id,
                                value,
                            })
                        }
                        setViewer={newViewer =>
                            dispatch({
                                type: "update_cell_viewer",
                                cellId: cell.id,
                                newViewer,
                            })
                        }
                        deleteCell={() => dispatch({ type: "delete_cell", cellId: cell.id })}
                    />
                )),
                <NotebookSeparator />
            )}
        </div>
    )
}
