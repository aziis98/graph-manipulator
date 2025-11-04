import type { Decoration, PortGraph } from "@/lib/graphs"
import type { FormattedContent } from "@/lib/notebook"
import { type Vector2 } from "@/lib/vec2"
import type { JSX } from "preact"
import { Basic } from "./Basic"
import { FlowGraph } from "./FlowGraph"
import { KnotLink } from "./KnotLink"

export type ViewerOverlay = {
    position: Vector2
    content: FormattedContent<"latex"> | { format: "jsx"; value: JSX.Element }
}

export type Viewer = (props: {
    graph: PortGraph
    decorations: Record<string, Decoration<any>>
    vertexProps?: (v: string) => Record<string, any>
    edgeProps?: (e: string) => Record<string, any>
}) => [JSX.Element, ViewerOverlay[]]

export const Viewers = {
    Basic,
    FlowGraph,
    KnotLink,
}
