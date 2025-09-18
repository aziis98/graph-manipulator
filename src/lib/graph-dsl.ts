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

export function example_1(): DecoratedGraph<string, { positions: { x: number; y: number } }> {
    const g = graph()

    g.node('a')
    g.node('b')
    g.node('c')
    g.node('d')

    g.arrow(['a', '0'], ['b', '1'])
    g.arrow(['b', '2'], ['c', '3'])
    g.arrow(['c', '4'], ['a', '5'])

    g.undirected('a', ['d', '6'])

    const positions = decoration<{ x: number; y: number }>()
    positions.set('a', { x: 150, y: 100 })
    positions.set('b', { x: 300, y: 100 })
    positions.set('c', { x: 225, y: 200 })
    positions.set('d', { x: 75, y: 200 })

    return decoratedGraph(g, {
        positions,
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
