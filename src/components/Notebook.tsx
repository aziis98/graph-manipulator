import { DEFAULT_CONTEXT, evaluateBlock, FormattedContent } from '@/lib/notebook'
import { intersperse, objectWith, objectWithout } from '@/lib/util'
import { Icon } from '@iconify/react'
import clsx from 'clsx'
import { useEffect, useReducer, useRef, useState, type Dispatch, type Reducer } from 'preact/hooks'
import { Editable } from './Editable'
import { loadGraphExamples } from '@/lib/graph-examples-loader'
import { Katex } from './KaTeX'
import { DecoratedGraphViewer } from './DecoratedGraph'
import { DecoratedGraph, Decoration } from '@/lib/graphs'
import { Viewers } from './graph-viewers'
import { svgDownloadElement } from '@/lib/svg-export'

const graphExamples = await loadGraphExamples()

/**
 * Merge two sets of decorations, giving precedence to old decorations but adding any new entries from the new decorations.
 */
function mergeDecorations(
    oldDecos: Record<string, Decoration<any>>,
    newDecos: Record<string, Decoration<any>>
): Record<string, Decoration<any>> {
    // const merged: Record<string, Decoration<any>> = { ...oldDecos }

    // for (const [decoType, newDeco] of Object.entries(newDecos)) {
    //     if (merged[decoType]) {
    //         for (const [id, value] of newDeco.entries()) {
    //             if (!merged[decoType].has(id)) {
    //                 merged[decoType].set(id, value)
    //             }
    //         }
    //     } else {
    //         merged[decoType] = newDeco
    //     }
    // }

    // return merged
    return { ...oldDecos, ...newDecos }
}

export type Cell = {
    id: string
    source: string
    lastUpdated: number

    size: { width: number; height: number }

    defaultViewer?: keyof typeof Viewers
}

export type EvaluatedCell = {
    id: string

    /** Timestamp of when the cell was last evaluated. */
    lastEvaluated: number

    /** Result of evaluating the cell. */
    result: any

    /** Computed list of cell IDs that this cell depends on. */
    dependencies: string[]

    // Local cell state

    /** Viewer type to use for displaying graphs from this cell. */
    viewer: keyof typeof Viewers
}

export type Notebook = {
    cells: Record<string, Cell>
    evaluatedCells: Record<string, EvaluatedCell | null>

    /**
     * A registry of all decorations from all evaluated cells, keyed by decoration type.
     */
    decorationsRegistry: Record<string, Record<string, Decoration<any>>>
}

function evaluateCell(
    id: string,
    cells: Record<string, Cell>,
    evaluatedCells: Record<string, EvaluatedCell | null>
): [EvaluatedCell, Record<string, Decoration<any>>] {
    const cell = cells[id]
    const oldEvaluatedCell = evaluatedCells[id] ?? {
        id,
        viewer: cell.defaultViewer ?? 'Basic',
    }

    if (!cell) {
        throw new Error(`Cell with id ${id} does not exist. Cannot evaluate.`)
    }

    const dependencyIds = new Set<string>()

    const evalResult = evaluateBlock(cell.source, {
        ...DEFAULT_CONTEXT,
        cell: (id: string) => {
            const depCell = cells[id]
            if (!depCell) {
                throw new Error(`Cell with id ${id} does not exist.`)
            }

            dependencyIds.add(id)

            const evaluatedDepCell = evaluatedCells[id]
            if (!evaluatedDepCell || evaluatedDepCell.lastEvaluated < depCell.lastUpdated) {
                throw new Error(`Cell with id ${id} has not been evaluated yet.`)
            }
            return evaluatedDepCell.result
        },
    })

    if (!evalResult.success) {
        console.error(`Error evaluating cell ${id}: ${evalResult.error}`)
        return [
            {
                ...oldEvaluatedCell,
                lastEvaluated: Date.now(),
                result: { error: evalResult.error },
                dependencies: Array.from(dependencyIds),
            },
            {},
        ]
    }

    return [
        {
            ...oldEvaluatedCell,
            lastEvaluated: Date.now(),
            result: evalResult.result,
            dependencies: Array.from(dependencyIds),
        },
        evalResult.result instanceof DecoratedGraph ? evalResult.result.decorations : {},
    ]
}

type NotebookAction =
    | { type: 'add_empty_cell' }
    | { type: 'add_cell'; cell: Cell }
    | { type: 'delete_cell'; cellId: string }
    | { type: 'update_cell_id'; cellId: string; newCellId: string }
    | { type: 'update_cell_size'; cellId: string; newSize: { width: number; height: number } }
    | { type: 'update_cell_source'; cellId: string; newSource: string }
    | { type: 'update_cell_decoration_value'; cellId: string; decorationType: string; id: string; value: any }
    | { type: 'update_cell_viewer'; cellId: string; newViewer: keyof typeof Viewers }
    | { type: 'evaluate_cell'; cellId: string }

const NotebookReducer: Reducer<Notebook, NotebookAction> = (state, action) => {
    switch (action.type) {
        case 'add_empty_cell': {
            // Generate a unique cell ID
            let newCellId = 'cell-1'
            let counter = 1
            while (state.cells[newCellId]) {
                counter++
                newCellId = `cell-${counter}`
            }

            const newCell: Cell = {
                id: newCellId,
                source: '',
                lastUpdated: 0,
                size: { width: 512, height: 512 },
            }

            return {
                ...state,
                cells: objectWith(state.cells, newCell.id, newCell),
                evaluatedCells: objectWith(state.evaluatedCells, newCell.id, null),
            }
        }
        case 'add_cell': {
            if (state.cells[action.cell.id]) {
                console.warn(`Cell with id ${action.cell.id} already exists. Skipping add.`)
                return state
            }

            return {
                ...state,
                cells: objectWith(state.cells, action.cell.id, action.cell),
                evaluatedCells: objectWith(state.evaluatedCells, action.cell.id, null),
            }
        }
        case 'delete_cell': {
            if (!state.cells[action.cellId]) {
                console.warn(`Cell with id ${action.cellId} does not exist. Cannot delete.`)
                return state
            }

            return {
                ...state,
                cells: objectWithout(state.cells, action.cellId),
                evaluatedCells: objectWithout(state.evaluatedCells, action.cellId),
            }
        }
        case 'update_cell_id': {
            if (!state.cells[action.cellId]) {
                console.warn(`Cell with id ${action.cellId} does not exist. Cannot update ID.`)
                return state
            }
            if (state.cells[action.newCellId]) {
                console.warn(`Cell with new id ${action.newCellId} already exists. Cannot update ID.`)
                return state
            }

            const cellToUpdate = state.cells[action.cellId]
            const evaluatedCellToUpdate = state.evaluatedCells[action.cellId]

            const newCells = objectWithout(state.cells, action.cellId)
            const newEvaluatedCells = objectWithout(state.evaluatedCells, action.cellId)

            return {
                ...state,
                cells: objectWith(newCells, action.newCellId, { ...cellToUpdate, id: action.newCellId }),
                evaluatedCells: objectWith(newEvaluatedCells, action.newCellId, evaluatedCellToUpdate),
            }
        }
        case 'update_cell_size': {
            if (!state.cells[action.cellId]) {
                console.warn(`Cell with id ${action.cellId} does not exist. Cannot update size.`)
                return state
            }

            return {
                ...state,
                cells: objectWith(state.cells, action.cellId, {
                    ...state.cells[action.cellId],
                    size: action.newSize,
                }),
            }
        }
        case 'update_cell_source': {
            if (!state.cells[action.cellId]) {
                console.warn(`Cell with id ${action.cellId} does not exist. Cannot update.`)
                return state
            }

            return {
                ...state,
                cells: objectWith(state.cells, action.cellId, {
                    ...state.cells[action.cellId],
                    source: action.newSource,
                    lastUpdated: Date.now(),
                }),
            }
        }
        case 'evaluate_cell': {
            // Re-evaluate all cells to ensure dependencies are up to date
            let newEvaluatedCells = { ...state.evaluatedCells }
            let newDecorationsRegistry = { ...state.decorationsRegistry }

            for (const cellId of Object.keys(state.cells)) {
                const [newEvaluatedCell, decorations] = evaluateCell(cellId, state.cells, newEvaluatedCells)
                newEvaluatedCells[cellId] = newEvaluatedCell
                newDecorationsRegistry[cellId] = mergeDecorations(newDecorationsRegistry[cellId], decorations)
            }

            return {
                ...state,
                evaluatedCells: newEvaluatedCells,
                decorationsRegistry: newDecorationsRegistry,
            }
        }
        case 'update_cell_decoration_value': {
            const evaluatedCell = state.evaluatedCells[action.cellId]
            if (!evaluatedCell) {
                console.warn(`Cell with id ${action.cellId} is not evaluated. Cannot update decoration.`)
                return state
            }

            const currentDecoration = state.decorationsRegistry[action.cellId]?.[action.decorationType]
            if (!currentDecoration) {
                console.warn(
                    `Decoration of type ${action.decorationType} does not exist on cell ${action.cellId}. Cannot update decoration.`
                )
                return state
            }

            return {
                ...state,
                evaluatedCells: objectWith(state.evaluatedCells, action.cellId, {
                    ...evaluatedCell,
                    // decorations: objectWith(
                    //     evaluatedCell.decorations,
                    //     action.decorationType,
                    //     currentDecoration.withEntry(action.id, action.value)
                    // ),
                }),
                decorationsRegistry: objectWith(state.decorationsRegistry, action.cellId, {
                    ...state.decorationsRegistry[action.cellId],
                    [action.decorationType]: currentDecoration.withEntry(action.id, action.value),
                }),
            }
        }
        case 'update_cell_viewer': {
            const evaluatedCell = state.evaluatedCells[action.cellId]
            if (!evaluatedCell) {
                console.warn(`Cell with id ${action.cellId} is not evaluated. Cannot update viewer.`)
                return state
            }

            return {
                ...state,
                evaluatedCells: objectWith(state.evaluatedCells, action.cellId, {
                    ...evaluatedCell,
                    viewer: action.newViewer,
                }),
            }
        }
        default:
            return state
    }
}

export const useNotebook = (cells: Cell[] = []): [Notebook, Dispatch<NotebookAction>] => {
    const [notebook, dispatchNotebook] = useReducer(NotebookReducer, {
        cells: Object.fromEntries(cells.map(c => [c.id, c])),
        evaluatedCells: {},
        decorationsRegistry: {},
    })

    useEffect(() => {
        // Auto-evaluate all cells on first load
        Object.values(notebook.cells).forEach(cell => {
            dispatchNotebook({ type: 'evaluate_cell', cellId: cell.id })
        })
    }, [])

    return [notebook, dispatchNotebook]
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

        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)

        return () => {
            window.removeEventListener('pointermove', onPointerMove)
            window.removeEventListener('pointerup', onPointerUp)
        }
    }, [resizeDragging])

    const viewerSvgRef = useRef<SVGGElement>(null)

    return (
        <div class={clsx('cell', collapsed && 'collapsed')}>
            <div class="editor">
                <div class="grid-h">
                    <button class="large" title="Collapse/Expand Cell" onClick={() => setCollapsed(!collapsed)}>
                        <Icon icon="material-symbols:left-panel-close-rounded" />
                    </button>
                    <div class="cell-name">
                        {/* <code>cell-1</code> */}
                        <Editable value={cell.id} onChange={newValue => updateId(newValue.trim())}>
                            <code>{cell.id}</code>
                        </Editable>
                    </div>
                </div>
                <div class="title">Cell Source</div>
                <div class="snippets">
                    <select>
                        {Object.entries(graphExamples).map(([name, code]) => (
                            <option
                                value={name}
                                onClick={async () => {
                                    setSource(code)
                                }}
                            >
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
                        if (e.key === 'Tab') {
                            e.preventDefault()
                            const textarea = e.currentTarget
                            const start = textarea.selectionStart
                            const end = textarea.selectionEnd
                            const newValue = cell.source.substring(0, start) + '  ' + cell.source.substring(end)
                            setSource(newValue)
                            // Set cursor position after the inserted spaces
                            setTimeout(() => {
                                textarea.setSelectionRange(start + 2, start + 2)
                            }, 0)
                        }
                    }}
                    rows={cell.source.split('\n').length || 1}
                ></textarea>
                <div class="buttons right">
                    <button
                        title="Serialize current graph to code"
                        onClick={() => {
                            if (evaluatedCell?.result instanceof DecoratedGraph) {
                                const graphCode = evaluatedCell.result.serializeJS('g')

                                setSource(`${graphCode}\n\nreturn gDeco`)
                            } else {
                                alert('Current cell does not evaluate to a graph.')
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
                            if (
                                confirm(
                                    `Are you sure you want to delete cell "${cell.id}"? This action cannot be undone.`
                                )
                            ) {
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
                    To include an SVG diagram in a LaTeX document{' '}
                    <a href="https://tex.stackexchange.com/questions/2099/how-to-include-svg-diagrams-in-latex">
                        use the <code>svg</code> package as explained here
                    </a>
                    .
                </p>
                <p>
                    Note that latex decoration on vertices and edges are rendered here on the web using{' '}
                    <a href="https://katex.org/">KaTeX</a> and are not yet supported in the svg export (workaround
                    coming soon).
                </p>
                <div class="buttons">
                    <button
                        title="Download SVG"
                        onClick={() => {
                            if (!viewerSvgRef.current) {
                                console.warn('No SVG content to export.')
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
                                                    {name === 'angle' || name === 'direction' ? (
                                                        <>
                                                            <code>{(v as number).toFixed(2)}rad</code>
                                                            <span class="spacer">/</span>
                                                            <code>{((v as number) * (180 / Math.PI)).toFixed(1)}°</code>
                                                        </>
                                                    ) : v instanceof FormattedContent && v.format === 'latex' ? (
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
            <div
                ref={viewerRef}
                class={clsx('viewer', resizeDragging && 'resizing')}
                onDblClick={() => setCollapsed(!collapsed)}
                style={{
                    width: internalSize.width + 'px',
                    height: internalSize.height + 'px',
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

                {evaluatedCell &&
                    (evaluatedCell.result instanceof DecoratedGraph ? (
                        <DecoratedGraphViewer
                            graph={evaluatedCell.result.graph}
                            decorations={decorations}
                            setDecoration={(type, id, value) => {
                                updateDecorationValue(type, id, value)
                            }}
                            viewer={Viewers[evaluatedCell.viewer]}
                            onViewerRef={ref => (viewerSvgRef.current = ref)}
                        />
                    ) : (
                        <pre>{JSON.stringify(evaluatedCell.result, null, 2)}</pre>
                    ))}
            </div>
        </div>
    )
}

const NotebookSeparator = ({}) => (
    <div class="separator">
        <Icon icon="material-symbols:arrow-drop-down-rounded" style={{ transform: 'rotate(-90deg)' }} />
    </div>
)

export const NotebookCells = ({ notebook, dispatch }: { notebook: Notebook; dispatch: Dispatch<NotebookAction> }) => {
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
                                type: 'update_cell_id',
                                cellId: cell.id,
                                newCellId: newId,
                            })
                        }
                        setSize={newSize => dispatch({ type: 'update_cell_size', cellId: cell.id, newSize })}
                        setSource={newSource => dispatch({ type: 'update_cell_source', cellId: cell.id, newSource })}
                        evaluate={() => dispatch({ type: 'evaluate_cell', cellId: cell.id })}
                        updateDecorationValue={(type, id, value) =>
                            dispatch({
                                type: 'update_cell_decoration_value',
                                cellId: cell.id,
                                decorationType: type,
                                id,
                                value,
                            })
                        }
                        setViewer={newViewer =>
                            dispatch({
                                type: 'update_cell_viewer',
                                cellId: cell.id,
                                newViewer,
                            })
                        }
                        deleteCell={() => dispatch({ type: 'delete_cell', cellId: cell.id })}
                    />
                )),
                <NotebookSeparator />
            )}
        </div>
    )
}
