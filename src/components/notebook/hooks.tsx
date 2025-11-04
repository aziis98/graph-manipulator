import { DecoratedGraph, type Decoration } from "@/lib/graphs"
import { DEFAULT_CONTEXT, evaluateBlock } from "@/lib/notebook"
import { mergeDecorations, objectWith, objectWithout } from "@/lib/util"
import { useEffect, useReducer, type Dispatch, type Reducer } from "preact/hooks"
import type { Cell, EvaluatedCell, Notebook, NotebookAction } from "./types"

function evaluateCell(
    id: string,
    cells: Record<string, Cell>,
    evaluatedCells: Record<string, EvaluatedCell | null>
): [EvaluatedCell, Record<string, Decoration<any>>] {
    const cell = cells[id]
    const oldEvaluatedCell = evaluatedCells[id] ?? {
        id,
        viewer: cell.defaultViewer ?? "Basic",
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

const notebookReducer: Reducer<Notebook, NotebookAction> = (state, action) => {
    switch (action.type) {
        case "add_empty_cell": {
            // Generate a unique cell ID
            let newCellId = "cell-1"
            let counter = 1
            while (state.cells[newCellId]) {
                counter++
                newCellId = `cell-${counter}`
            }

            const newCell: Cell = {
                id: newCellId,
                source: "",
                lastUpdated: 0,
                size: { width: 512, height: 512 },
            }

            return {
                ...state,
                cells: objectWith(state.cells, newCell.id, newCell),
                evaluatedCells: objectWith(state.evaluatedCells, newCell.id, null),
            }
        }
        case "add_cell": {
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
        case "delete_cell": {
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
        case "update_cell_id": {
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
        case "update_cell_size": {
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
        case "update_cell_source": {
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
        case "evaluate_cell": {
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
        case "update_cell_decoration_value": {
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
        case "update_cell_viewer": {
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
    const [notebook, dispatchNotebook] = useReducer(notebookReducer, {
        cells: Object.fromEntries(cells.map(c => [c.id, c])),
        evaluatedCells: {},
        decorationsRegistry: {},
    })

    useEffect(() => {
        // Auto-evaluate all cells on first load
        Object.values(notebook.cells).forEach(cell => {
            dispatchNotebook({ type: "evaluate_cell", cellId: cell.id })
        })
    }, [])

    return [notebook, dispatchNotebook]
}
