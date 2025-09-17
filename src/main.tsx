import '@fontsource-variable/source-sans-3'
import './style.css'

import { render } from 'preact'
import { Icon } from '@iconify/react'
import clsx from 'clsx'
import { useState } from 'preact/hooks'
import { PortGraphViewer } from './components/PortGraph'
import { SimplePortGraph } from './lib/port-graph'

const NotebookSeparator = ({}) => (
    <div class="separator">
        <Icon icon="material-symbols:arrow-drop-down-rounded" />
    </div>
)

const NotebookCell = ({}) => {
    const [collapsed, setCollapsed] = useState(true)

    const [exampleGraph, _setExampleGraph] = useState(
        new SimplePortGraph(
            ['1', '2', '3', '4'],
            [
                { directed: true, from: { vertex: '1', port: 'a' }, to: { vertex: '2', port: 'b' } },
                { directed: false, from: { vertex: '2', port: 'c' }, to: { vertex: '3', port: 'd' } },
                { directed: true, from: { vertex: '3', port: 'e' }, to: { vertex: '1', port: 'f' } },
                { directed: true, from: { vertex: '4', port: 'g' }, to: { vertex: '1', port: 'h' } },
            ]
        )
    )

    const [exampleDecorations, setExampleDecorations] = useState({
        positions: new Map([
            ['1', { x: 150, y: 100 }],
            ['2', { x: 300, y: 100 }],
            ['3', { x: 225, y: 200 }],
            ['4', { x: 75, y: 200 }],
        ]),
    })

    const setDecoration = (type: 'positions', vertex: string, value: { x: number; y: number }) => {
        if (type === 'positions') {
            setExampleDecorations(old => ({
                ...old,
                positions: new Map(old.positions).set(vertex, value),
            }))
        }
    }

    return (
        <div class={clsx('cell', collapsed && 'collapsed')}>
            <div class="editor">
                <div class="snippets">
                    <select>
                        <option>Graph Snippet 1</option>
                        <option>Graph Snippet 2</option>
                        <option>Graph Snippet 3</option>
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
                ></textarea>
                <div class="buttons">
                    <button title="Run Cell">
                        <Icon icon="material-symbols:close-rounded" />
                        <span>Close</span>
                    </button>
                    <button title="Run Cell">
                        <Icon icon="material-symbols:check-rounded" />
                        <span>Done</span>
                    </button>
                </div>
            </div>
            <div class="viewer" onDblClick={() => setCollapsed(!collapsed)}>
                <div class="hover-tools">
                    <button class="flat large" title="Edit Cell" onClick={() => setCollapsed(!collapsed)}>
                        <Icon icon="material-symbols:code-rounded" />
                    </button>
                </div>

                <PortGraphViewer graph={exampleGraph} decorations={exampleDecorations} setDecoration={setDecoration} />
            </div>
        </div>
    )
}

const App = () => (
    <>
        <header>
            <div class="logo">Graph Transformer</div>
            <div class="toolbar">
                <button title="Settings">
                    <Icon icon="material-symbols:settings-outline-rounded" />
                </button>
                <button title="Help">
                    <Icon icon="material-symbols:help-outline-rounded" />
                </button>
            </div>
        </header>
        <main>
            <div class="cells">
                {Array.from({ length: 10 }).map((_, i) => (
                    <>
                        {i > 0 ? <NotebookSeparator /> : null}
                        <NotebookCell key={i} />
                    </>
                ))}
            </div>
        </main>
        <footer>
            <div class="status-bar">
                <div class="status">Ready</div>
                <div class="info">No file opened</div>
            </div>
        </footer>
    </>
)

render(<App />, document.body)
