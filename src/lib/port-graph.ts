// export type Port<V, P> = {
//     vertex: V
//     port: P
// }

// export type Edge<V, P> = {
//     id: string
//     directed: boolean

//     from: Port<V, P>
//     to: Port<V, P>
// }

// export type PortGraph<P> = {
//     nodes(): string[]
//     edges(): Edge<string, P>[]

//     outset(v: string, port?: P): Edge<string, P>[]
//     inset(v: string, port?: P): Edge<string, P>[]
//     neighbors(v: string, port?: P): string[]

//     hasNode(v: string): boolean
//     hasEdge(e: Edge<string, P>): boolean

//     getEdgeById(id: string): Edge<string, P> | undefined
// }

// export type Decoration<T> = {
//     type: 'decoration'

//     keys: () => string[]
//     values: () => T[]
//     entries: () => [string, T][]

//     has: (v: string) => boolean
//     get: (v: string) => T | undefined
//     set: (v: string, value: T) => void

//     withEntry: (v: string, value: T) => Decoration<T>
//     mapValues: <U>(fn: (value: T, key: string) => U) => Decoration<U>

//     compatibleWith: (g: PortGraph<string>) => boolean
// }

// export type DecoratedGraph<P, D extends Record<string, any>> = {
//     graph: PortGraph<P>
//     decorations: {
//         [K in keyof D]: Decoration<D[K]>
//     }
// }

// export function decoratedGraphToEdgeDecorationMap<P, D extends Record<string, any>>(
//     dg: DecoratedGraph<P, D>
// ): Map<string, { type: keyof D; data: any }[]> {
//     const edgeIdToDecorationsDict = new Map<string, { type: keyof D; data: any }[]>()

//     for (const e of dg.graph.edges()) {
//         const id = e.id
//         if (!edgeIdToDecorationsDict.has(id)) {
//             edgeIdToDecorationsDict.set(id, [])
//         }

//         Object.entries(dg.decorations).forEach(([decType, decData]) => {
//             const edgeDecs = (decData as Decoration<any>).get(id)
//             if (edgeDecs) {
//                 edgeIdToDecorationsDict.get(id)!.push({ type: decType as keyof D, data: edgeDecs })
//             }
//         })
//     }

//     return edgeIdToDecorationsDict
// }

// // export type Decorations<
// //     V extends Record<string, any> = Record<string, never>,
// //     E extends Record<string, any> = Record<string, never>
// // > = {
// //     [K in keyof V]: VertexDecoration<V[K]>
// // } & {
// //     [K in keyof E]: EdgeDecoration<E[K]>
// // }

// // type example1 = Decorations<{ positions: { x: number; y: number } }, {}>

// export class SimplePortGraph<P> implements PortGraph<P> {
//     #nodes: string[]
//     #edges: Edge<string, P>[]

//     #nodeOutsetMap: Map<string, Edge<string, P>[]> = new Map()
//     #nodeInsetMap: Map<string, Edge<string, P>[]> = new Map()

//     constructor(nodes: string[] = [], edges: Omit<Edge<string, P>, 'id'>[] = []) {
//         this.#nodes = nodes
//         this.#edges = []

//         for (const e of edges) {
//             this.addEdge(e.from, e.to, e.directed)
//         }
//     }

//     nodes(): string[] {
//         return this.#nodes
//     }

//     edges(): Edge<string, P>[] {
//         return this.#edges
//     }

//     outset(v: string, port?: P): Edge<string, P>[] {
//         if (port === undefined) {
//             return this.#nodeOutsetMap.get(v) ?? []
//         }

//         return (this.#nodeOutsetMap.get(v) ?? []).filter(e => e.from.port === port)
//     }

//     inset(v: string, port?: P): Edge<string, P>[] {
//         if (port === undefined) {
//             return this.#nodeInsetMap.get(v) ?? []
//         }

//         return (this.#nodeInsetMap.get(v) ?? []).filter(e => e.to.port === port)
//     }

//     neighbors(v: string, port?: P): string[] {
//         const inNeighbors = this.inset(v, port).map(e => e.from.vertex)
//         const outNeighbors = this.outset(v, port).map(e => e.to.vertex)

//         return [...new Set([...inNeighbors, ...outNeighbors])]
//     }

//     addNode(v: string): string {
//         if (!this.#nodes.includes(v)) {
//             this.#nodes.push(v)
//         }

//         return v
//     }

//     addEdge(from: Port<string, P>, to: Port<string, P>, directed: boolean = true): Edge<string, P> {
//         this.addNode(from.vertex)
//         this.addNode(to.vertex)

//         // Prevent duplicate edges
//         const existing = this.#edges.find(
//             e =>
//                 e.from.vertex === from.vertex &&
//                 e.from.port === from.port &&
//                 e.to.vertex === to.vertex &&
//                 e.to.port === to.port &&
//                 e.directed === directed
//         )
//         if (existing) {
//             return existing
//         }

//         const edge: Edge<string, P> = {
//             id: `e${this.#edges.length}`,
//             directed,

//             from,
//             to,
//         }

//         this.#edges.push(edge)

//         const fromList = this.#nodeOutsetMap.get(from.vertex) ?? []
//         fromList.push(edge)
//         this.#nodeOutsetMap.set(from.vertex, fromList)

//         const toList = this.#nodeInsetMap.get(to.vertex) ?? []
//         toList.push(edge)
//         this.#nodeInsetMap.set(to.vertex, toList)

//         return edge
//     }

//     hasNode(v: string): boolean {
//         return this.#nodes.includes(v)
//     }

//     hasEdge(e: Edge<string, P>): boolean {
//         return (
//             this.#edges.find(
//                 en =>
//                     en.from.vertex === e.from.vertex &&
//                     en.from.port === e.from.port &&
//                     en.to.vertex === e.to.vertex &&
//                     en.to.port === e.to.port
//             ) !== undefined
//         )
//     }

//     getEdgeById(id: string): Edge<string, P> | undefined {
//         return this.#edges.find(e => e.id === id)
//     }

//     removeNode(v: string) {
//         this.#nodes = this.#nodes.filter(n => n !== v)

//         const outEdges = this.#nodeOutsetMap.get(v) ?? []
//         for (const e of outEdges) {
//             this.removeEdge(e)
//         }
//         this.#nodeOutsetMap.delete(v)

//         const inEdges = this.#nodeInsetMap.get(v) ?? []
//         for (const e of inEdges) {
//             this.removeEdge(e)
//         }
//         this.#nodeInsetMap.delete(v)
//     }

//     removeEdge(e: Edge<string, P>) {
//         this.#edges = this.#edges.filter(en => en !== e)

//         const fromList = this.#nodeOutsetMap.get(e.from.vertex) ?? []
//         this.#nodeOutsetMap.set(
//             e.from.vertex,
//             fromList.filter(en => en !== e)
//         )

//         const toList = this.#nodeInsetMap.get(e.to.vertex) ?? []
//         this.#nodeInsetMap.set(
//             e.to.vertex,
//             toList.filter(en => en !== e)
//         )
//     }

//     clear() {
//         this.#nodes = []
//         this.#edges = []
//         this.#nodeOutsetMap.clear()
//         this.#nodeInsetMap.clear()
//     }

//     clone(): SimplePortGraph<P> {
//         return new SimplePortGraph(this.#nodes.slice(), this.#edges.slice())
//     }
// }
