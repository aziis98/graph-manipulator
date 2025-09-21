import z from 'zod'
import { SimplePortGraph, type DecoratedGraph, type Decoration, type PortGraph } from './port-graph'

export const DEFAULT_PORT = '*'

export class GraphBuilder {
    #graph: SimplePortGraph<string>

    constructor() {
        this.#graph = new SimplePortGraph<string>()
    }

    node(v: string): string {
        return this.#graph.addNode(v)
    }

    edge(from: string | [string, string], to: string | [string, string], directed: boolean): string {
        if (typeof from === 'string') {
            from = [from, DEFAULT_PORT]
        }
        if (typeof to === 'string') {
            to = [to, DEFAULT_PORT]
        }

        return this.#graph.addEdge({ vertex: from[0], port: from[1] }, { vertex: to[0], port: to[1] }, directed).id
    }

    arrow(from: string | [string, string], to: string | [string, string]): string {
        return this.edge(from, to, true)
    }

    path(...nodes: [string, string][]): string[] {
        const edges: string[] = []
        for (let i = 0; i < nodes.length - 1; i++) {
            edges.push(this.arrow(nodes[i], nodes[i + 1]))
        }
        return edges
    }

    undirected(from: string | [string, string], to: string | [string, string]): string {
        return this.edge(from, to, false)
    }

    build(): SimplePortGraph<string> {
        return this.#graph
    }
}

export function graph(): GraphBuilder {
    return new GraphBuilder()
}

export function decoration<T>(initial?: Map<string, T> | Iterable<readonly [string, T]>): Decoration<T> {
    const data = initial ? new Map(initial) : new Map<string, T>()

    return {
        type: 'decoration',

        has: (v: string) => data.has(v),
        get: (v: string) => data.get(v),
        set: (v: string, value: T) => data.set(v, value),

        keys: () => Array.from(data.keys()),
        values: () => Array.from(data.values()),
        entries: () => Array.from(data.entries()),

        withEntry: (v: string, value: T) => {
            const newData = new Map(data)
            newData.set(v, value)
            return decoration(newData)
        },

        mapValues: <U>(fn: (value: T, key: string) => U) => {
            const newData = new Map<string, U>()
            for (const [k, v] of data.entries()) {
                newData.set(k, fn(v, k))
            }
            return decoration(newData)
        },

        compatibleWith: (g: PortGraph<string>) => {
            for (const v of data.keys()) {
                if (!g.hasNode(v)) {
                    return false
                }
            }

            return true
        },
    }
}

export const latexDecoration = z.object({
    format: z.literal('latex'),
    value: z.string(),
})

export type LaTeXDecoration = z.infer<typeof latexDecoration>

export function latex(s: string): LaTeXDecoration {
    return { format: 'latex', value: s }
}

export function decoratedGraph<D extends Record<string, any>>(
    g: GraphBuilder | PortGraph<string>,
    decorations: { [K in keyof D]: Decoration<D[K]> }
): DecoratedGraph<string, D> {
    return {
        graph: g instanceof GraphBuilder ? g.build() : g,
        decorations,
    }
}

// Example usage:

export function example_1() {
    const g = graph()

    g.node('a')
    g.node('b')
    g.node('c')
    g.node('d')

    const e1 = g.arrow(['a', '0'], ['b', '1'])
    const e2 = g.arrow(['b', '2'], ['c', '3'])
    g.arrow(['c', '4'], ['a', '5'])

    g.undirected('a', ['d', '6'])

    const position = decoration<{ x: number; y: number }>()
    position.set('a', { x: 150, y: 100 })
    position.set('b', { x: 300, y: 100 })
    position.set('c', { x: 225, y: 200 })
    position.set('d', { x: 75, y: 200 })

    const label = decoration<string>()
    label.set(e1, 'test')

    const anotherDeco = decoration<LaTeXDecoration>()
    anotherDeco.set(e1, latex('x'))
    anotherDeco.set(e2, latex('x^2'))

    return decoratedGraph(g, {
        position,
        label,
        anotherDeco,
    })
}

const vec2 = (x: number, y: number) => ({ x, y })
const degrees = (angleInDegrees: number) => angleInDegrees * (Math.PI / 180)
const radians = (angleInRadians: number) => angleInRadians * (180 / Math.PI)

export function example_flowgraph() {
    const g = graph()

    g.node('a')
    g.node('b')
    g.node('c')
    g.node('h1')
    g.node('h2')

    g.arrow(['a', 'out'], ['b', 'in'])
    g.arrow(['a', 'out'], ['c', 'in'])
    g.arrow(['c', 'out'], ['b', 'in'])

    g.path(['b', 'out'], ['h1', 'in'], ['a', 'in'])
    g.path(['c', 'out'], ['h2', 'in'], ['a', 'in'])

    const position = decoration<{ x: number; y: number }>()
    position.set('a', { x: 50, y: 0 })
    position.set('b', { x: 0, y: -200 })
    position.set('c', { x: 100, y: -100 })
    position.set('h1', { x: -50, y: -100 })
    position.set('h2', { x: 150, y: -50 })

    const direction = decoration<number>()
    direction.set('a', degrees(-90))
    direction.set('b', degrees(-90 - 10))
    direction.set('c', degrees(-90 + 10))

    return decoratedGraph(g, {
        position,
        direction,
    })
}

// export function example_2() {
//     // @ts-ignore
//     const g1 = graph(() => {
//         node('a')
//         node('b')
//         node('c')
//         node('d')

//         arrow(['a', '0'], ['b', '1'])
//         arrow(['b', '2'], ['c', '3'])
//         arrow(['c', '4'], ['a', '5'])

//         undirected('a', ['d', '6'])
//     })

//     const positions = decoration([
//         ['a', { x: 150, y: 100 }],
//         ['b', { x: 300, y: 100 }],
//         ['c', { x: 225, y: 200 }],
//         ['d', { x: 75, y: 200 }],
//     ])

//     return { graph: g1, positions }
// }
