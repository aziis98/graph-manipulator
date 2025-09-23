import z from 'zod'
// import { SimplePortGraph, type DecoratedGraph, type Decoration, type PortGraph } from './port-graph'
import { Vec2 } from './vec2'

// export const DEFAULT_PORT = '*'

// export class GraphBuilder {
//     #graph: SimplePortGraph<string>

//     constructor() {
//         this.#graph = new SimplePortGraph<string>()
//     }

//     node(v: string): string {
//         return this.#graph.addNode(v)
//     }

//     edge(from: string | [string, string], to: string | [string, string], directed: boolean): string {
//         if (typeof from === 'string') {
//             from = [from, DEFAULT_PORT]
//         }
//         if (typeof to === 'string') {
//             to = [to, DEFAULT_PORT]
//         }

//         return this.#graph.addEdge({ vertex: from[0], port: from[1] }, { vertex: to[0], port: to[1] }, directed).id
//     }

//     arrow(from: string | [string, string], to: string | [string, string]): string {
//         return this.edge(from, to, true)
//     }

//     path(...nodesWithPorts: [string, string | [string, string]][]): string[] {
//         const nodes: { vertex: string; inputPort?: string; outputPort?: string }[] = nodesWithPorts.map((nwp, i) => {
//             const vertex = nwp[0]
//             const portSpec = nwp[1]
//             if (typeof portSpec === 'string') {
//                 if (i === 0) {
//                     return { vertex, outputPort: portSpec }
//                 } else if (i === nodesWithPorts.length - 1) {
//                     return { vertex, inputPort: portSpec }
//                 } else {
//                     throw new Error('Intermediate nodes in path must be [vertex, [inputPort, outputPort]]')
//                 }
//             } else {
//                 const [inputPort, outputPort] = portSpec
//                 return { vertex, inputPort, outputPort }
//             }
//         })

//         const edgeIds: string[] = []

//         for (let i = 0; i < nodes.length - 1; i++) {
//             const from = nodes[i]
//             const to = nodes[i + 1]

//             const fromPort = from.outputPort || DEFAULT_PORT
//             const toPort = to.inputPort || DEFAULT_PORT

//             const edgeId = this.arrow([from.vertex, fromPort], [to.vertex, toPort])
//             edgeIds.push(edgeId)
//         }

//         return edgeIds
//     }

//     undirected(from: string | [string, string], to: string | [string, string]): string {
//         return this.edge(from, to, false)
//     }

//     build(): SimplePortGraph<string> {
//         return this.#graph
//     }
// }

// export function graph(): GraphBuilder {
//     return new GraphBuilder()
// }

// export function decoration<T>(initial?: Map<string, T> | Iterable<readonly [string, T]>): Decoration<T> {
//     const data = initial ? new Map(initial) : new Map<string, T>()

//     return {
//         type: 'decoration',

//         has: (v: string) => data.has(v),
//         get: (v: string) => data.get(v),
//         set: (v: string, value: T) => data.set(v, value),

//         keys: () => Array.from(data.keys()),
//         values: () => Array.from(data.values()),
//         entries: () => Array.from(data.entries()),

//         withEntry: (v: string, value: T) => {
//             const newData = new Map(data)
//             newData.set(v, value)
//             return decoration(newData)
//         },

//         mapValues: <U>(fn: (value: T, key: string) => U) => {
//             const newData = new Map<string, U>()
//             for (const [k, v] of data.entries()) {
//                 newData.set(k, fn(v, k))
//             }
//             return decoration(newData)
//         },

//         compatibleWith: (g: PortGraph<string>) => {
//             for (const v of data.keys()) {
//                 if (!g.hasNode(v)) {
//                     return false
//                 }
//             }

//             return true
//         },
//     }
// }

// export const latexDecoration = z.object({
//     format: z.literal('latex'),
//     value: z.string(),
// })

// export type LaTeXDecoration = z.infer<typeof latexDecoration>

// export function latex(s: string): LaTeXDecoration {
//     return { format: 'latex', value: s }
// }

// class SimpleDecoratedGraph<P, D extends Record<string, any>> implements DecoratedGraph<P, D> {
//     graph: PortGraph<P>
//     decorations: { [K in keyof D]: Decoration<D[K]> }

//     constructor(graph: PortGraph<P>, decorations: { [K in keyof D]: Decoration<D[K]> }) {
//         this.graph = graph
//         this.decorations = decorations
//     }
// }

// export function decoratedGraph<D extends Record<string, any>>(
//     g: GraphBuilder | PortGraph<string>,
//     decorations: { [K in keyof D]: Decoration<D[K]> }
// ): DecoratedGraph<string, D> {
//     // return {
//     //     graph: g instanceof GraphBuilder ? g.build() : g,
//     //     decorations,
//     // }

//     return new SimpleDecoratedGraph(g instanceof GraphBuilder ? g.build() : g, decorations)
// }

// Example usage:

// export function example_1() {
//     const g = graph()

//     g.node('a')
//     g.node('b')
//     g.node('c')
//     g.node('d')

//     const e1 = g.arrow(['a', '0'], ['b', '1'])
//     const e2 = g.arrow(['b', '2'], ['c', '3'])
//     g.arrow(['c', '4'], ['a', '5'])

//     g.undirected('a', ['d', '6'])

//     const position = decoration<{ x: number; y: number }>()
//     position.set('a', { x: 150, y: 100 })
//     position.set('b', { x: 300, y: 100 })
//     position.set('c', { x: 225, y: 200 })
//     position.set('d', { x: 75, y: 200 })

//     const label = decoration<string>()
//     label.set(e1, 'test')

//     const anotherDeco = decoration<LaTeXDecoration>()
//     anotherDeco.set(e1, latex('x'))
//     anotherDeco.set(e2, latex('x^2'))

//     return decoratedGraph(g, {
//         position,
//         label,
//         anotherDeco,
//     })
// }

// // const vec2 = (x: number, y: number) => ({ x, y })
// const degrees = (angleInDegrees: number) => angleInDegrees * (Math.PI / 180)
// // const radians = (angleInRadians: number) => angleInRadians * (180 / Math.PI)

// export function example_flowgraph() {
//     const g = graph()

//     g.node('a')
//     g.node('b')
//     g.node('c')
//     g.node('d')
//     g.node('h1')
//     g.node('h2')

//     g.arrow(['a', 'out'], ['d', 'in'])

//     g.arrow(['d', 'out'], ['b', 'in'])
//     g.arrow(['d', 'out'], ['c', 'in'])
//     g.arrow(['c', 'out'], ['b', 'in'])

//     g.path(['b', 'out'], ['h1', ['in', 'out']], ['a', 'in'])
//     g.path(['c', 'out'], ['h2', ['in', 'out']], ['a', 'in'])

//     const position = decoration<{ x: number; y: number }>()
//     position.set('a', { x: 50, y: 0 })
//     position.set('d', { x: 50, y: -75 })
//     position.set('c', { x: 100, y: -200 })
//     position.set('b', { x: 0, y: -250 })
//     position.set('h1', { x: -100, y: -250 })
//     position.set('h2', { x: 200, y: -150 })

//     const direction = decoration<number>()
//     direction.set('a', degrees(-90))
//     direction.set('b', degrees(-90 - 10))
//     direction.set('c', degrees(-90 + 10))

//     return decoratedGraph(g, {
//         position,
//         direction,
//     })
// }

// export function example_trefoil() {
//     const g = graph()

//     g.node('c1')
//     g.node('c2')
//     g.node('c3')

//     g.undirected(['c1', '2'], ['c2', '3'])
//     g.undirected(['c2', '1'], ['c3', '0'])
//     g.undirected(['c3', '2'], ['c1', '3'])
//     g.undirected(['c1', '1'], ['c2', '0'])
//     g.undirected(['c2', '2'], ['c3', '1'])
//     g.undirected(['c3', '3'], ['c1', '0'])

//     const tauThird = (2 * Math.PI) / 3

//     const position = decoration<{ x: number; y: number }>()
//     position.set('c1', Vec2.scale(Vec2.rotor(2 * tauThird), 100))
//     position.set('c2', Vec2.scale(Vec2.rotor(0 * tauThird), 100))
//     position.set('c3', Vec2.scale(Vec2.rotor(1 * tauThird), 100))

//     const flip = decoration<boolean>()
//     flip.set('c3', true)

//     const angle = decoration<number>()
//     angle.set('c1', degrees(10))
//     angle.set('c2', degrees(10))
//     angle.set('c3', degrees(10))

//     return decoratedGraph(g, {
//         position,
//         angle,
//         flip,
//     })
// }
