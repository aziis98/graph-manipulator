import { DEFAULT_CONTEXT, evaluateBlock, FormattedContent } from '@/lib/notebook'
import { intersperse, objectWith, objectWithout } from '@/lib/util'
import { Icon } from '@iconify/react'
import clsx from 'clsx'
import { useEffect, useReducer, useRef, useState, type Dispatch, type Reducer } from 'preact/hooks'
import { Editable } from './Editable'
import { loadGraphExamples } from '@/lib/graph-examples-loader'
import { Katex } from './KaTeX'
import { PortGraphViewer } from './PortGraph'
import { DecoratedGraph, Decoration } from '@/lib/graphs'
import { Viewers } from './graph-viewers'

const graphExamples = await loadGraphExamples()

/**
 * Merge two sets of decorations, giving precedence to old decorations but adding any new entries from the new decorations.
 */
function mergeDecorations(
    oldDecos: Record<string, Decoration<any>>,
    newDecos: Record<string, Decoration<any>>
): Record<string, Decoration<any>> {
    const merged: Record<string, Decoration<any>> = { ...oldDecos }

    for (const [decoType, newDeco] of Object.entries(newDecos)) {
        if (merged[decoType]) {
            for (const [id, value] of newDeco.entries()) {
                if (!merged[decoType].has(id)) {
                    merged[decoType].set(id, value)
                }
            }
        } else {
            merged[decoType] = newDeco
        }
    }

    return merged
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
     * Decorations from all cells, linked based on DAG connected components.
     */
    decorationsRegistry: Record<'ALL', Record<string, Decoration<any>>>
}

type NotebookAction =
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
            if (!state.cells[action.cellId]) {
                console.warn(`Cell with id ${action.cellId} does not exist. Cannot evaluate.`)
                return state
            }

            const cell = state.cells[action.cellId]
            const oldEvaluatedCell = state.evaluatedCells[action.cellId] ?? {
                id: action.cellId,
                lastEvaluated: 0,
                result: null,
                dependencies: [],
                decorations: {},
                viewer: cell.defaultViewer ?? 'Basic',
            }

            const dependencyIds = new Set<string>()

            const evalResult = evaluateBlock(cell.source, {
                ...DEFAULT_CONTEXT,
                cell: (id: string) => {
                    const depCell = state.cells[id]
                    if (!depCell) {
                        throw new Error(`Cell with id ${id} does not exist.`)
                    }

                    dependencyIds.add(id)

                    const evaluatedDepCell = state.evaluatedCells[id]
                    if (!evaluatedDepCell || evaluatedDepCell.lastEvaluated < depCell.lastUpdated) {
                        throw new Error(`Cell with id ${id} has not been evaluated yet.`)
                    }
                    return evaluatedDepCell.result
                },
            })

            if (!evalResult.success) {
                console.error(`Error evaluating cell ${action.cellId}: ${evalResult.error}`)
                return {
                    ...state,
                    evaluatedCells: objectWith(state.evaluatedCells, action.cellId, {
                        ...oldEvaluatedCell,
                        lastEvaluated: Date.now(),
                        result: { error: evalResult.error },
                        dependencies: Array.from(dependencyIds),
                    }),
                }
            }

            let decorations: Record<string, Decoration<any>> = evalResult.result instanceof DecoratedGraph
                ? evalResult.result.decorations
                : {}

            console.log(`Evaluated cell ${action.cellId}:`, evalResult.result)

            return {
                ...state,
                evaluatedCells: objectWith(state.evaluatedCells, action.cellId, {
                    ...oldEvaluatedCell,
                    lastEvaluated: Date.now(),
                    result: evalResult.result,
                    dependencies: Array.from(dependencyIds),
                }),
                decorationsRegistry: {
                    ALL: mergeDecorations(state.decorationsRegistry.ALL ?? {}, decorations),
                },
            }
        }
        case 'update_cell_decoration_value': {
            const evaluatedCell = state.evaluatedCells[action.cellId]
            if (!evaluatedCell) {
                console.warn(`Cell with id ${action.cellId} is not evaluated. Cannot update decoration.`)
                return state
            }

            const currentDecoration = state.decorationsRegistry.ALL?.[action.decorationType]
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
                decorationsRegistry: {
                    ALL: objectWith(
                        state.decorationsRegistry.ALL ?? {},
                        action.decorationType,
                        currentDecoration.withEntry(action.id, action.value)
                    ),
                },
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
        decorationsRegistry: { ALL: {} },
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
}) => {
    const [collapsed, setCollapsed] = useState(true)

    const viewerRef = useRef<HTMLDivElement>(null)

    const [internalSize, setInternalSize] = useState<{ width: number; height: number }>({
        width: cell.size.width,
        height: cell.size.height,
    })

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
            setSize(internalSize)
        }

        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)

        return () => {
            window.removeEventListener('pointermove', onPointerMove)
            window.removeEventListener('pointerup', onPointerUp)
        }
    }, [resizeDragging])

    return (
        <div class={clsx('cell', collapsed && 'collapsed')}>
            <div class="editor">
                <div class="cell-name">
                    {/* <code>cell-1</code> */}
                    <Editable value={cell.id} onChange={newValue => updateId(newValue.trim())}>
                        <code>{cell.id}</code>
                    </Editable>
                </div>
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
                ></textarea>
                <div class="buttons">
                    <button title="Run Cell" onClick={() => evaluate()}>
                        <Icon icon="material-symbols:play-arrow-rounded" />
                        <span>Run</span>
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
                        <PortGraphViewer
                            graph={evaluatedCell.result.graph}
                            decorations={decorations}
                            setDecoration={(type, id, value) => {
                                updateDecorationValue(type, id, value)
                            }}
                            viewer={Viewers[evaluatedCell.viewer]}
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
                        decorations={notebook.decorationsRegistry.ALL ?? {}}
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
                    />
                )),
                <NotebookSeparator />
            )}
        </div>
    )
}
