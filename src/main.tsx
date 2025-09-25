import '@fontsource-variable/source-sans-3'
import './style.css'

import { render } from 'preact'
import { Icon } from '@iconify/react'

import { StatusBar, StatusBarProvider } from './components/StatusBar'
import { NotebookCells, useNotebook } from './components/Notebook'
import { loadGraphExamples } from './lib/graph-examples-loader'

const graphExamples = await loadGraphExamples()

const dedent = (lines: string) => lines.trim().replace(/^[ \t]+/gm, '')

const App = () => {
    console.log('Loaded examples:', Object.keys(graphExamples))

    const [notebook, dispatchNotebook] = useNotebook([
        // {
        //     id: 'cell-1',
        //     lastUpdated: Date.now(),
        //     source: graphExamples['example_flowgraph'],

        //     size: { width: 512, height: 512 },
        //     defaultViewer: 'FlowGraph',
        // },
        // {
        //     id: 'cell-2',
        //     lastUpdated: Date.now(),
        //     source: dedent(`
        //         // Show same graph but with Basic viewer
        //         return cell('cell-1')
        //     `),

        //     size: { width: 512, height: 512 },
        //     defaultViewer: 'Basic',
        // },
        {
            id: 'cell-1',
            lastUpdated: Date.now(),
            source: graphExamples['example_2'],

            size: { width: 512, height: 512 },
        },
        {
            id: 'cell-2',
            lastUpdated: Date.now(),
            source: graphExamples['example_dfs'],

            size: { width: 512, height: 512 },
            defaultViewer: 'FlowGraph',
        },
    ])

    return (
        <>
            <div class="sidebar">
                <div class="logo" title="Graph Manipulator">
                    <Icon icon="material-symbols:graph-3" />
                </div>
                <div class="toolbar">
                    <button title="Add Cell" onClick={() => dispatchNotebook({ type: 'add_empty_cell' })}>
                        <Icon icon="tabler:code-variable-plus" />
                    </button>
                </div>
                {/* <div class="toolbar">
                    <button title="Add Cell">
                        <Icon icon="material-symbols:variable-add-rounded" />
                    </button>
                    <button title="Settings">
                        <Icon icon="material-symbols:settings-outline-rounded" />
                    </button>
                </div> */}
            </div>
            <main>
                <NotebookCells notebook={notebook} dispatch={dispatchNotebook} />
            </main>
            <footer>
                <StatusBar />
            </footer>
        </>
    )
}

render(
    <StatusBarProvider>
        <App />
    </StatusBarProvider>,
    document.body
)
