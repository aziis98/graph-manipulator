import '@fontsource-variable/source-sans-3'
import './style.css'

import { render } from 'preact'
import { Icon } from '@iconify/react'
import clsx from 'clsx'
import { useEffect, useId, useState } from 'preact/hooks'
import { PortGraphViewer } from './components/PortGraph'
import { SimplePortGraph, type DecoratedGraph, type Decoration, type PortGraph } from './lib/port-graph'
import { decoration } from './lib/graph-dsl'

import * as GraphDSL from './lib/graph-dsl'

import prettier from 'prettier/standalone'
import prettierPluginBabel from 'prettier/plugins/babel'
import prettierPluginEstree from 'prettier/plugins/estree'
import prettierPluginHtml from 'prettier/plugins/html'
import { Editable } from './components/Editable'
import { StatusBar, StatusBarProvider } from './components/StatusBar'
import { Katex } from './components/KaTeX'
import { Viewers } from './components/graph-viewers'
import { Vec2 } from './lib/vec2'

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

function evaluateGraphDSL(source: string): DecoratedGraph<string, { position: { x: number; y: number } }> | null {
    try {
        console.log('Evaluating graph DSL source:', source)
        const func = new Function(
            'GraphDSL',
            'Vec2',
            `
            const { decoration, latex, graph, decoratedGraph } = GraphDSL;
            
            // Helper functions
            const vec2 = (x, y) => ({ x, y });
            const degrees = (angleInDegrees) => angleInDegrees * (Math.PI / 180);
            const radians = (angleInRadians) => angleInRadians * (180 / Math.PI);
                       
            ${source}`
        )
        const result = func(GraphDSL, Vec2) as DecoratedGraph<string, { position: { x: number; y: number } }>
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

    useEffect(() => {
        const fn = (GraphDSL as any)['example_trefoil'] as () => DecoratedGraph<string, any>
        exampleToString(fn).then(source => {
            console.log('Setting initial cell source:', source)
            setCellSource(source)
            evaluateCell(source)
        })
        // setTimeout(() => evaluateCell(), 100)
    }, [])

    const [viewer, setViewer] = useState('KnotLink')

    const [graph, setGraph] = useState<PortGraph<string>>(new SimplePortGraph())

    const [decorations, setDecorations] = useState<
        Record<string, Decoration<any>> & {
            position: Decoration<{ x: number; y: number }>
        }
    >({
        position: decoration<{ x: number; y: number }>(),
    })

    const evaluateCell = (source: string | null = null) => {
        const result = evaluateGraphDSL(source ?? cellSource)
        if (result) {
            setGraph(result.graph)
            setDecorations(result.decorations)
        } else {
            alert('Error evaluating graph DSL. Check console for details.')
        }
    }

    return (
        <div class={clsx('cell', collapsed && 'collapsed')}>
            <div class="editor">
                <div class="cell-name">
                    {/* <code>cell-1</code> */}
                    <Editable value={cellId} onChange={newValue => setCellId(newValue.trim())}>
                        <code>{cellId}</code>
                    </Editable>
                </div>
                <div class="title">Viewer</div>
                <select>
                    {Object.keys(Viewers).map(v => (
                        <option value={v} selected={v === viewer} onClick={() => setViewer(v)}>
                            {v}
                        </option>
                    ))}
                </select>
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
                    <button title="Run Cell" onClick={() => evaluateCell()}>
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
                            {decoration.entries().map(([k, v]) => {
                                const asLatexDeco = GraphDSL.latexDecoration.safeParse(v)

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
                                            ) : asLatexDeco.success ? (
                                                <Katex value={asLatexDeco.data.value} />
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
                    setDecoration={(type, id, value) => {
                        // if (type === 'position') {
                        //     setDecorations(old => ({
                        //         ...old,
                        //         position: old.position.withEntry(id, value),
                        //     }))
                        // }

                        setDecorations(old => ({
                            ...old,
                            [type]: (old[type] as Decoration<any>).withEntry(id, value),
                        }))
                    }}
                    viewer={Viewers[viewer]}
                />
            </div>
        </div>
    )
}

const App = () => (
    <>
        <div class="sidebar">
            <div class="logo" title="Graph Transformer">
                <Icon icon="material-symbols:graph-3" />
            </div>
            <div class="toolbar">
                <button title="Add Cell">
                    <Icon icon="material-symbols:variable-add-rounded" />
                </button>
                <button title="Settings">
                    <Icon icon="material-symbols:settings-outline-rounded" />
                </button>
            </div>
            <div class="toolbar">
                <button title="Add Cell">
                    <Icon icon="material-symbols:variable-add-rounded" />
                </button>
                <button title="Settings">
                    <Icon icon="material-symbols:settings-outline-rounded" />
                </button>
            </div>
        </div>
        <main>
            <div class="cells">
                {Array.from({ length: 3 }).map((_, i) => (
                    <>
                        {i > 0 ? <NotebookSeparator /> : null}
                        <NotebookCell key={i} />
                    </>
                ))}
            </div>
        </main>
        <footer>
            <StatusBar />
        </footer>
    </>
)

render(
    <StatusBarProvider>
        <App />
    </StatusBarProvider>,
    document.body
)
