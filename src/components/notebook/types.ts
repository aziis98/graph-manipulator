import type { Decoration } from "@/lib/graphs"
import type { Viewers } from "../graph-viewers"

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

export type NotebookAction =
    | { type: "add_empty_cell" }
    | { type: "add_cell"; cell: Cell }
    | { type: "delete_cell"; cellId: string }
    | { type: "update_cell_id"; cellId: string; newCellId: string }
    | { type: "update_cell_size"; cellId: string; newSize: { width: number; height: number } }
    | { type: "update_cell_source"; cellId: string; newSource: string }
    | { type: "update_cell_decoration_value"; cellId: string; decorationType: string; id: string; value: any }
    | { type: "update_cell_viewer"; cellId: string; newViewer: keyof typeof Viewers }
    | { type: "evaluate_cell"; cellId: string }
