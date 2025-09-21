import type { JSX } from 'preact'
import { latexDecoration, type LaTeXDecoration } from '@/lib/graph-dsl'
import type { Decoration, PortGraph } from '@/lib/port-graph'
import { Vec2, type Vector2 } from '@/lib/vec2'
import { Basic } from './Basic'
import { FlowGraph } from './FlowGraph'
import { KnotLink } from './KnotLink'

export type ViewerOverlay = {
    position: Vector2
    content: LaTeXDecoration | { format: 'jsx'; value: JSX.Element }
}

export type Viewer<DD = {}> = <
    D extends {
        position: Decoration<{ x: number; y: number }>
    } & DD,
>(props: {
    graph: PortGraph<string>
    decorations: D
    vertexProps?: (v: string) => Record<string, any>
    edgeProps?: (e: string) => Record<string, any>
}) => [JSX.Element, ViewerOverlay[]]

export const Viewers: Record<string, Viewer> = {
    Basic,
    FlowGraph,
    KnotLink,
}
