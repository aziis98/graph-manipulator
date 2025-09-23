export const DEFAULT_PORT = '*'

export type Port = {
    vertex: string
    port: string
}

export type Edge = {
    id: string
    directed: boolean

    from: Port
    to: Port
}

export class PortGraph {
    #nodes: string[]
    #edges: Edge[]

    #nodeOutsetMap: Map<string, Edge[]> = new Map()
    #nodeInsetMap: Map<string, Edge[]> = new Map()

    constructor(nodes: string[] = [], edges: Omit<Edge, 'id'>[] = []) {
        this.#nodes = nodes
        this.#edges = []

        for (const e of edges) {
            this.addEdge(e.from, e.to, e.directed)
        }
    }

    nodes(): string[] {
        return this.#nodes
    }

    edges(): Edge[] {
        return this.#edges
    }

    outset(v: string, port?: string): Edge[] {
        if (port === undefined) {
            return this.#nodeOutsetMap.get(v) ?? []
        }

        return (this.#nodeOutsetMap.get(v) ?? []).filter(e => e.from.port === port)
    }

    inset(v: string, port?: string): Edge[] {
        if (port === undefined) {
            return this.#nodeInsetMap.get(v) ?? []
        }

        return (this.#nodeInsetMap.get(v) ?? []).filter(e => e.to.port === port)
    }

    neighbors(v: string, port?: string): string[] {
        const inNeighbors = this.inset(v, port).map(e => e.from.vertex)
        const outNeighbors = this.outset(v, port).map(e => e.to.vertex)

        return [...new Set([...inNeighbors, ...outNeighbors])]
    }

    addNode(v: string): string {
        if (!this.#nodes.includes(v)) {
            this.#nodes.push(v)
        }

        return v
    }

    addEdge(from: Port, to: Port, directed: boolean = true): Edge {
        this.addNode(from.vertex)
        this.addNode(to.vertex)

        // Prevent duplicate edges
        const existing = this.#edges.find(
            e =>
                e.from.vertex === from.vertex &&
                e.from.port === from.port &&
                e.to.vertex === to.vertex &&
                e.to.port === to.port &&
                e.directed === directed
        )
        if (existing) {
            return existing
        }

        const edge: Edge = {
            id: `e${this.#edges.length}`,
            directed,

            from,
            to,
        }

        this.#edges.push(edge)

        const fromList = this.#nodeOutsetMap.get(from.vertex) ?? []
        fromList.push(edge)
        this.#nodeOutsetMap.set(from.vertex, fromList)

        const toList = this.#nodeInsetMap.get(to.vertex) ?? []
        toList.push(edge)
        this.#nodeInsetMap.set(to.vertex, toList)

        return edge
    }

    hasNode(v: string): boolean {
        return this.#nodes.includes(v)
    }

    hasEdgeId(id: string): boolean {
        return this.#edges.some(e => e.id === id)
    }

    hasEdge(e: Edge): boolean {
        return (
            this.#edges.find(
                en =>
                    en.from.vertex === e.from.vertex &&
                    en.from.port === e.from.port &&
                    en.to.vertex === e.to.vertex &&
                    en.to.port === e.to.port
            ) !== undefined
        )
    }

    getEdge(id: string): Edge | undefined {
        return this.#edges.find(e => e.id === id)
    }

    removeNode(v: string) {
        this.#nodes = this.#nodes.filter(n => n !== v)

        const outEdges = this.#nodeOutsetMap.get(v) ?? []
        for (const e of outEdges) {
            this.removeEdge(e)
        }
        this.#nodeOutsetMap.delete(v)

        const inEdges = this.#nodeInsetMap.get(v) ?? []
        for (const e of inEdges) {
            this.removeEdge(e)
        }
        this.#nodeInsetMap.delete(v)
    }

    removeEdge(e: Edge) {
        this.#edges = this.#edges.filter(en => en !== e)

        const fromList = this.#nodeOutsetMap.get(e.from.vertex) ?? []
        this.#nodeOutsetMap.set(
            e.from.vertex,
            fromList.filter(en => en !== e)
        )

        const toList = this.#nodeInsetMap.get(e.to.vertex) ?? []
        this.#nodeInsetMap.set(
            e.to.vertex,
            toList.filter(en => en !== e)
        )
    }

    clear() {
        this.#nodes = []
        this.#edges = []
        this.#nodeOutsetMap.clear()
        this.#nodeInsetMap.clear()
    }

    clone(): PortGraph {
        return new PortGraph(this.#nodes.slice(), this.#edges.slice())
    }

    // Nicer methods for adding nodes and edges with default ports

    node(v: string): string {
        return this.addNode(v)
    }

    edge(from: string | [string, string], to: string | [string, string], directed: boolean): string {
        if (typeof from === 'string') {
            from = [from, DEFAULT_PORT]
        }
        if (typeof to === 'string') {
            to = [to, DEFAULT_PORT]
        }

        return this.addEdge({ vertex: from[0], port: from[1] }, { vertex: to[0], port: to[1] }, directed).id
    }

    arrow(from: string | [string, string], to: string | [string, string]): string {
        return this.edge(from, to, true)
    }

    path(...nodesWithPorts: [string, string | [string, string]][]): string[] {
        const nodes: { vertex: string; inputPort?: string; outputPort?: string }[] = nodesWithPorts.map((nwp, i) => {
            const vertex = nwp[0]
            const portSpec = nwp[1]
            if (typeof portSpec === 'string') {
                if (i === 0) {
                    return { vertex, outputPort: portSpec }
                } else if (i === nodesWithPorts.length - 1) {
                    return { vertex, inputPort: portSpec }
                } else {
                    throw new Error('Intermediate nodes in path must be [vertex, [inputPort, outputPort]]')
                }
            } else {
                const [inputPort, outputPort] = portSpec
                return { vertex, inputPort, outputPort }
            }
        })

        const edges: string[] = []

        for (let i = 0; i < nodes.length - 1; i++) {
            const from = nodes[i]
            const to = nodes[i + 1]

            const fromPort = from.outputPort || DEFAULT_PORT
            const toPort = to.inputPort || DEFAULT_PORT

            const edge = this.arrow([from.vertex, fromPort], [to.vertex, toPort])
            edges.push(edge)
        }

        return edges
    }

    undirected(from: string | [string, string], to: string | [string, string]): string {
        return this.edge(from, to, false)
    }
}

export class Decoration<T> {
    data: Map<string, T>

    constructor(initial?: Map<string, T> | Iterable<readonly [string, T]>) {
        this.data = initial ? new Map(initial) : new Map<string, T>()
    }

    has(v: string) {
        return this.data.has(v)
    }

    get(v: string) {
        return this.data.get(v)
    }

    set(v: string, value: T) {
        return this.data.set(v, value)
    }

    keys() {
        return Array.from(this.data.keys())
    }
    values() {
        return Array.from(this.data.values())
    }
    entries() {
        return Array.from(this.data.entries())
    }

    withEntry(v: string, value: T) {
        const newData = new Map(this.data)
        newData.set(v, value)
        return new Decoration(newData)
    }

    mapValues<U>(fn: (value: T, key: string) => U) {
        const newData = new Map<string, U>()
        for (const [k, v] of this.data.entries()) {
            newData.set(k, fn(v, k))
        }
        return new Decoration(newData)
    }

    compatibleWith(g: PortGraph) {
        for (const id of this.data.keys()) {
            if (!g.hasNode(id) && !g.hasEdgeId(id)) {
                return false
            }
        }

        return true
    }
}

export type DecorationMap<D extends Record<string, any>> = {
    [K in keyof D]: Decoration<D[K]>
}

export class DecoratedGraph<D extends Record<string, any>> {
    graph: PortGraph
    decorations: DecorationMap<D>

    constructor(graph: PortGraph, decorations: DecorationMap<D>) {
        this.graph = graph
        this.decorations = decorations
    }
}

export const GraphDSL = {
    graph: (nodes: string[] = [], edges: Omit<Edge, 'id'>[] = []) => {
        return new PortGraph(nodes, edges)
    },
    decoration: <T>(initial?: Map<string, T> | Iterable<readonly [string, T]>) => {
        return new Decoration<T>(initial)
    },
    decoratedGraph: <D extends Record<string, any>>(g: PortGraph, decorations: DecorationMap<D>) => {
        return new DecoratedGraph<D>(g, decorations)
    },
}
