export function example_1() {
    const g = graph()

    g.node('a')
    g.node('b')
    g.node('c')
    g.node('d')

    g.arrow(['a', '0'], ['b', '1'])
    g.arrow(['b', '2'], ['c', '3'])
    g.arrow(['c', '4'], ['a', '5'])

    g.undirected('a', ['d', '6'])

    const positions = decoration()
    positions.set('a', { x: 150, y: 100 })
    positions.set('b', { x: 300, y: 100 })
    positions.set('c', { x: 225, y: 200 })
    positions.set('d', { x: 75, y: 200 })

    return decoratedGraph(g, {
        positions,
    })
}
