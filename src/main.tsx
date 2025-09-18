import '@fontsource-variable/source-sans-3'
import './style.css'

import { render } from 'preact'
import { Icon } from '@iconify/react'
import clsx from 'clsx'
import { useId, useState } from 'preact/hooks'
import { PortGraphViewer } from './components/PortGraph'
import { SimplePortGraph, type DecoratedGraph, type PortGraph } from './lib/port-graph'
import { decoration } from './lib/graph-dsl'

import * as GraphDSL from './lib/graph-dsl'

import prettier from 'prettier/standalone'
import prettierPluginBabel from 'prettier/plugins/babel'
import prettierPluginEstree from 'prettier/plugins/estree'
import prettierPluginHtml from 'prettier/plugins/html'
import { Editable } from './components/Editable'

async function exampleToString(fn: () => DecoratedGraph<string, any>): Promise<string> {
    const original = fn.toString()
    console.log('Original:', original)

    const formatted = await prettier.format(original, {
        parser: 'babel',
        plugins: [prettierPluginBabel, prettierPluginEstree, prettierPluginHtml],

        // very compact output
        printWidth: 50,
        tabWidth: 2,
        useTabs: false,
        semi: false,
        singleQuote: true,
        trailingComma: 'none',
        bracketSpacing: true,
        arrowParens: 'avoid',
        objectWrap: 'collapse',
    })

    console.log('Formatted:', formatted)

    return formatted
        .trim()
        .replace(/^function \w+\(\) {/, '')
        .replace(/}$/, '')
        .replace(/^  /gm, '')
        .trim()
    // remove trailing semicolon
}

function evaluateGraphDSL(source: string): DecoratedGraph<string, { positions: { x: number; y: number } }> | null {
    try {
        // eslint-disable-next-line no-eval
        const func = new Function('GraphDSL', `const { decoration, graph, decoratedGraph } = GraphDSL;\n\n${source}`)
        const result = func(GraphDSL) as DecoratedGraph<string, { positions: { x: number; y: number } }>
        return result
    } catch (e) {
        console.error('Error evaluating graph DSL:', e)
        return null
    }
}

const NotebookSeparator = ({}) => (
    <div class="separator">
        <Icon icon="material-symbols:arrow-drop-down-rounded" />
    </div>
)

const NotebookCell = ({}) => {
    const uuid = useId()
    const [cellId, setCellId] = useState(() => `cell-${uuid}`)

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

    const [cellSource, setCellSource] = useState('')

    const [graph, setGraph] = useState<PortGraph<string>>(new SimplePortGraph())

    const [decorations, setDecorations] = useState({
        positions: decoration([
            ['1', { x: 150, y: 100 }],
            ['2', { x: 300, y: 100 }],
            ['3', { x: 225, y: 200 }],
            ['4', { x: 75, y: 200 }],
        ]),
    })

    const evaluateCell = () => {
        const result = evaluateGraphDSL(cellSource)
        if (result) {
            setGraph(result.graph)
            setDecorations(result.decorations)
        } else {
            alert('Error evaluating graph DSL. Check console for details.')
        }
    }

    // const setDecoration = (type: 'positions', vertex: string, value: { x: number; y: number }) => {
    //     if (type === 'positions') {
    //         setExampleDecorations(old => ({
    //             ...old,
    //             positions: old.positions.withEntry(vertex, value),
    //         }))
    //     }
    // }

    return (
        <div class={clsx('cell', collapsed && 'collapsed')}>
            <div class="editor">
                <div class="cell-name">
                    {/* <code>cell-1</code> */}
                    <Editable value={cellId} onChange={newValue => setCellId(newValue.trim())}>
                        <code>{cellId}</code>
                    </Editable>
                </div>
                <div class="snippets">
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
                </div>
                <textarea
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck={false}
                    placeholder="Enter graph data here..."
                    value={cellSource}
                    onInput={e => setCellSource(e.currentTarget.value)}
                ></textarea>
                <div class="buttons">
                    <button title="Run Cell" onClick={evaluateCell}>
                        <Icon icon="material-symbols:play-arrow-rounded" />
                        <span>Run</span>
                    </button>
                </div>
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
                            {decoration.entries().map(([k, v]) => (
                                <div class="decoration-entry">
                                    <div class="key">
                                        <code>{k}</code>
                                    </div>
                                    <div class="value">{JSON.stringify(v)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div class="viewer" onDblClick={() => setCollapsed(!collapsed)}>
                <div class="hover-tools">
                    <button class="flat large" title="Edit Cell" onClick={() => setCollapsed(!collapsed)}>
                        <Icon icon="material-symbols:code-rounded" />
                    </button>
                    <div class="cell-name">
                        <code>{cellId}</code>
                    </div>
                </div>

                <PortGraphViewer
                    graph={graph}
                    decorations={decorations}
                    setDecoration={(type, vertex, value) => {
                        if (type === 'positions') {
                            setDecorations(old => ({
                                ...old,
                                positions: old.positions.withEntry(vertex, value),
                            }))
                        }
                    }}
                />
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
