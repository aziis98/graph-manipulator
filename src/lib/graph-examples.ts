import { DEFAULT_CONTEXT, FormattedContent } from '@/lib/notebook'
import type { DecoratedGraph, Decoration } from './graphs'

const {
    graph,
    decoration,
    decoratedGraph,
    dfs,

    Vec2,

    degrees,

    latex,
} = DEFAULT_CONTEXT

// @ts-ignore
const cell = (id: string): DecoratedGraph<{}> => {}

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

    const anotherDeco = decoration<FormattedContent<'latex'>>()
    anotherDeco.set(e1, latex('x'))
    anotherDeco.set(e2, latex('x^2'))

    const style = decoration<{ color: string }>()
    style.set(e1, { color: 'red' })
    style.set(e2, { color: 'blue' })

    return decoratedGraph(g, {
        position,
        anotherDeco,
        style,
    })
}

export function example_2() {
    const g = graph()

    g.node('a')
    g.node('b')
    g.node('c')
    g.node('d')
    g.node('e')
    g.node('f')
    g.node('g')
    g.node('h')

    g.arrow('a', 'b')
    g.arrow('a', 'c')
    g.arrow('b', 'd')
    g.arrow('c', 'd')
    g.arrow('d', 'e')
    g.arrow('a', 'd')
    g.arrow('d', 'f')
    g.arrow('e', 'g')
    g.arrow('f', 'g')
    g.arrow('c', 'f')
    g.arrow('h', 'g')
    g.arrow('e', 'h')
    g.arrow('b', 'h')
    g.arrow('b', 'e')

    const position = decoration<{ x: number; y: number }>()
    position.set('a', { x: 175, y: 90 })
    position.set('b', { x: 65, y: 200 })
    position.set('c', { x: 340, y: 130 })
    position.set('d', { x: 210, y: 240 })
    position.set('e', { x: 140, y: 375 })
    position.set('f', { x: 280, y: 370 })
    position.set('g', { x: 215, y: 500 })
    position.set('h', { x: 35, y: 425 })

    const start = decoration<boolean>()
    start.set('a', true)

    const style = decoration<{ color: string }>()
    style.set('a', { color: 'orange' })

    return decoratedGraph(g, {
        position,

        start,
        style,
    })
}

export function example_dfs() {
    const g = cell('cell-1')

    // @ts-ignore
    const start = g.decorations.start as Decoration<boolean>

    const startNode = start.keys()[0]

    const style = decoration<{ color: string }>()
    dfs(g.graph, startNode).forEach(e => {
        style.set(e, { color: 'orange' })
    })

    return decoratedGraph(g.graph, {
        ...g.decorations,
        style,

        // direction: decoration<number>(g.graph.nodes().map(v => [v, Math.PI / 2])),
    })
}

export function example_flowgraph() {
    const g = graph()

    g.node('a')
    g.node('b')
    g.node('c')
    g.node('d')
    g.node('h1')
    g.node('h2')

    g.arrow(['a', 'out'], ['d', 'in'])

    g.arrow(['d', 'out'], ['b', 'in'])
    g.arrow(['d', 'out'], ['c', 'in'])
    g.arrow(['c', 'out'], ['b', 'in'])

    g.path(['b', 'out'], ['h1', ['in', 'out']], ['a', 'in'])
    g.path(['c', 'out'], ['h2', ['in', 'out']], ['a', 'in'])

    const position = decoration<{ x: number; y: number }>()
    position.set('a', { x: 50, y: 0 })
    position.set('d', { x: 50, y: -75 })
    position.set('c', { x: 100, y: -200 })
    position.set('b', { x: 0, y: -250 })
    position.set('h1', { x: -100, y: -250 })
    position.set('h2', { x: 200, y: -250 })

    const direction = decoration<number>()
    direction.set('a', degrees(-90))
    direction.set('b', degrees(-90))
    direction.set('c', degrees(-90))
    direction.set('d', degrees(-90))
    direction.set('h1', degrees(+115))
    direction.set('h2', degrees(+40))

    return decoratedGraph(g, {
        position,
        direction,
    })
}

export function example_trefoil() {
    const g = graph()

    g.node('c1')
    g.node('c2')
    g.node('c3')

    g.undirected(['c1', '2'], ['c2', '3'])
    g.undirected(['c2', '1'], ['c3', '0'])
    g.undirected(['c3', '2'], ['c1', '3'])
    g.undirected(['c1', '1'], ['c2', '0'])
    g.undirected(['c2', '2'], ['c3', '1'])
    g.undirected(['c3', '3'], ['c1', '0'])

    const tauThird = (2 * Math.PI) / 3

    const position = decoration<{ x: number; y: number }>()
    position.set('c1', Vec2.scale(Vec2.rotor(2 * tauThird), 100))
    position.set('c2', Vec2.scale(Vec2.rotor(0 * tauThird), 100))
    position.set('c3', Vec2.scale(Vec2.rotor(1 * tauThird), 100))

    const flip = decoration<boolean>()
    flip.set('c3', true)

    const angle = decoration<number>()
    angle.set('c1', degrees(10))
    angle.set('c2', degrees(10))
    angle.set('c3', degrees(10))

    return decoratedGraph(g, {
        position,
        angle,
        flip,
    })
}
