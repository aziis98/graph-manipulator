import { FormattedContent, type Cell, type EvaluatedCell, type Notebook } from '@/lib/dag-eval'
import { intersperse, objectWith, objectWithout } from '@/lib/util'
import { Icon } from '@iconify/react'
import clsx from 'clsx'
import { useReducer, useState, type Dispatch, type Reducer } from 'preact/hooks'
import { Editable } from './Editable'
import { loadGraphExamples } from '@/lib/graph-examples-loader'
import { Katex } from './KaTeX'
import { PortGraphViewer } from './PortGraph'
import { PortGraph } from '@/lib/graphs'
import { Viewers } from './graph-viewers'
import { Basic } from './graph-viewers/Basic'

const graphExamples = await loadGraphExamples()

type NotebookAction =
    | { type: 'add_cell'; cell: Cell }
    | { type: 'update_cell'; cellId: string; newSource: string }
    | { type: 'delete_cell'; cellId: string }
    | { type: 'update_cell_id'; cellId: string; newCellId: string }
    | { type: 'evaluate_cell'; cellId: string }
    | { type: 'update_decoration_value'; cellId: string; decorationType: string; id: string; value: any }

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
        case 'update_cell': {
            if (!state.cells[action.cellId]) {
                console.warn(`Cell with id ${action.cellId} does not exist. Cannot update.`)
                return state
            }

            const updatedCell = {
                ...state.cells[action.cellId],
                source: action.newSource,
                lastUpdated: Date.now(),
            }

            return {
                ...state,
                cells: objectWith(state.cells, action.cellId, updatedCell),
                evaluatedCells: objectWith(state.evaluatedCells, action.cellId, null),
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
        case 'evaluate_cell': {
            if (!state.cells[action.cellId]) {
                console.warn(`Cell with id ${action.cellId} does not exist. Cannot evaluate.`)
                return state
            }

            // For now, just mark as evaluated with a timestamp. Actual evaluation logic can be added later.
            const evaluatedCell: EvaluatedCell = {
                id: action.cellId,
                lastEvaluated: Date.now(),
                result: null,
                decorations: {},
                dependencies: [],
            }

            return {
                ...state,
                evaluatedCells: objectWith(state.evaluatedCells, action.cellId, evaluatedCell),
            }
        }
        case 'update_decoration_value': {
            const evaluatedCell = state.evaluatedCells[action.cellId]
            if (!evaluatedCell) {
                console.warn(`Cell with id ${action.cellId} is not evaluated. Cannot update decoration.`)
                return state
            }

            const currentDecoration = evaluatedCell.decorations[action.decorationType]
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
                    decorations: objectWith(
                        evaluatedCell.decorations,
                        action.decorationType,
                        currentDecoration.withEntry(action.id, action.value)
                    ),
                }),
            }
        }
        default:
            return state
    }
}

export const useNotebook = (cells: Cell[] = []): [Notebook, Dispatch<NotebookAction>] => {
    return useReducer(NotebookReducer, {
        cells: Object.fromEntries(cells.map(c => [c.id, c])),
        evaluatedCells: {},
    })
}

const NotebookCell = ({
    cell,
    evaluatedCell,

    updateId,
    setSource,

    evaluate,
    updateDecorationValue,
}: {
    cell: Cell
    evaluatedCell: EvaluatedCell | null

    updateId: (newId: string) => void
    setSource: (newSource: string) => void
    evaluate: () => void

    updateDecorationValue: (type: string, id: string, value: any) => void
}) => {
    const [collapsed, setCollapsed] = useState(true)

    // const [exampleGraph, _setExampleGraph] = useState(
    //     new SimplePortGraph(
    //         ['1', '2', '3', '4'],
    //         [
    //             { directed: true, from: { vertex: '1', port: 'a' }, to: { vertex: '2', port: 'b' } },
    //             { directed: false, from: { vertex: '2', port: 'c' }, to: { vertex: '3', port: 'd' } },
    //             { directed: true, from: { vertex: '3', port: 'e' }, to: { vertex: '1', port: 'f' } },
    //             { directed: true, from: { vertex: '4', port: 'g' }, to: { vertex: '1', port: 'h' } },
    //         ]
    //     )
    // )

    // useEffect(() => {
    //     const fn = (GraphDSL as any)['example_trefoil'] as () => DecoratedGraph<string, any>
    //     exampleToString(fn).then(source => {
    //         console.log('Setting initial cell source:', source)
    //         setCellSource(source)
    //         evaluateCell(source)
    //     })
    //     // setTimeout(() => evaluateCell(), 100)
    // }, [])

    const [viewer, setViewer] = useState('KnotLink')

    // const evaluateCell = (source: string | null = null) => {
    //     const result = evaluateGraphDSL(source ?? cellSource)
    //     if (result) {
    //         setGraph(result.graph)
    //         setDecorations(result.decorations)
    //     } else {
    //         alert('Error evaluating graph DSL. Check console for details.')
    //     }
    // }

    return (
        <div class={clsx('cell', collapsed && 'collapsed')}>
            <div class="editor">
                <div class="cell-name">
                    {/* <code>cell-1</code> */}
                    <Editable value={cell.id} onChange={newValue => updateId(newValue.trim())}>
                        <code>{cell.id}</code>
                    </Editable>
                </div>
                {/* <div class="title">Viewer</div>
                <select>
                    {Object.keys(Viewers).map(v => (
                        <option value={v} selected={v === viewer} onClick={() => setViewer(v)}>
                            {v}
                        </option>
                    ))}
                </select> */}
                {/* <div class="snippets">
                    <select>
                        {Object.keys(GraphDSL)
                            .filter(k => k.startsWith('example_'))
                            .map(k => (
                                <option
                                    value={k}
                                    onClick={async () => {
                                        const fn = (GraphDSL as any)[k] as () => DecoratedGraph<string, any>
                                        setCellSource(await exampleToString(fn))
                                    }}
                                >
                                    {k}
                                </option>
                            ))}
                    </select>
                    <button title="Save Snippet">
                        <Icon icon="material-symbols:save-outline-rounded" />
                    </button>
                </div> */}
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
                        <div class="title">
                            <Icon icon="material-symbols:decorations" />
                            <span>Decorations</span>
                        </div>
                        {Object.entries(evaluatedCell.decorations).map(([name, decoration]) => (
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
                                                    {name === 'angle' ? (
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
            <div class="viewer" onDblClick={() => setCollapsed(!collapsed)}>
                <div class="hover-tools">
                    <button class="flat large" title="Edit Cell" onClick={() => setCollapsed(!collapsed)}>
                        <Icon icon="material-symbols:code-rounded" />
                    </button>
                    <div class="cell-name">
                        <code>{cell.id}</code>
                    </div>
                </div>

                {evaluatedCell &&
                    (evaluatedCell.result instanceof PortGraph ? (
                        <PortGraphViewer
                            graph={evaluatedCell.result}
                            decorations={evaluatedCell.decorations}
                            setDecoration={(type, id, value) => {
                                // setDecorations(old => ({
                                //     ...old,
                                //     [type]: (old[type] as Decoration<any>).withEntry(id, value),
                                // }))

                                updateDecorationValue(type, id, value)
                            }}
                            // viewer={Basic}
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
        <Icon icon="material-symbols:arrow-drop-down-rounded" />
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
                        updateId={newId =>
                            dispatch({
                                type: 'update_cell_id',
                                cellId: cell.id,
                                newCellId: newId,
                            })
                        }
                        setSource={newSource =>
                            dispatch({
                                type: 'update_cell',
                                cellId: cell.id,
                                newSource,
                            })
                        }
                        evaluate={() =>
                            dispatch({
                                type: 'evaluate_cell',
                                cellId: cell.id,
                            })
                        }
                        updateDecorationValue={(type, id, value) =>
                            dispatch({
                                type: 'update_decoration_value',
                                cellId: cell.id,
                                decorationType: type,
                                id,
                                value,
                            })
                        }
                    />
                )),
                <NotebookSeparator />
            )}
        </div>
    )
}
