// export type Cell = {
//     id: string
//     source: string

//     defaultViewer?: string

//     // UI state
//     sourceUpdatedAt?: number
//     size?: { width: number; height: number }

//     evaluated?: {
//         resultUpdatedAt: number
//         result: any
//         dependencies: string[]
//         viewer: string

//         decorationsOverwrites: Record<string, Record<string, any>>
//     }
// }

// export type Notebook = {
//     cells: Record<string, Cell>
// }

// type NotebookAction =
//     | { type: "add_empty_cell" }
//     | { type: "add_cell"; cell: Cell }
//     | { type: "delete_cell"; cellId: string }
//     | { type: "update_cell_id"; cellId: string; newCellId: string }
//     | { type: "update_cell_size"; cellId: string; newSize: { width: number; height: number } }
//     | { type: "update_cell_source"; cellId: string; newSource: string }
//     | { type: "update_cell_decoration_value"; cellId: string; decorationType: string; id: string; value: any }
//     | { type: "update_cell_viewer"; cellId: string; newViewer: string }
//     | { type: "evaluate_cell"; cellId: string }

// export const NotebookV2 = ({ notebook, dispatch }: { notebook: Notebook; dispatch: Dispatch<NotebookAction> }) => {
//     return (
//         <div class="notebook">
//             {notebook.cells.map((cell, index) => (
//                 <div class="notebook-cell" key={cell.id}>
//                     ...
//                 </div>
//             ))}
//         </div>
//     )
// }
