import { Decoration, GraphDSL } from './graphs'
import { Vec2 } from './vec2'

export class FormattedContent<F extends 'latex' | 'text'> {
    format: F
    value: string

    constructor(format: F, value: string) {
        this.format = format
        this.value = value
    }
}

export const DEFAULT_CONTEXT = {
    // Graph building utilities
    ...GraphDSL,

    // Math utilities
    Vec2,

    vec2: (x: number, y: number) => {
        return { x, y }
    },
    clamp: (value: number, { min, max }: { min?: number; max?: number }) => {
        if (min !== undefined && value < min) return min
        if (max !== undefined && value > max) return max
        return value
    },
    degrees: (angleInDegrees: number) => {
        return angleInDegrees * (Math.PI / 180)
    },
    radians: (angleInRadians: number) => {
        return angleInRadians * (180 / Math.PI)
    },

    // Content formatting
    latex: (s: string) => {
        return new FormattedContent('latex', s)
    },
    text: (s: string) => {
        return new FormattedContent('text', s)
    },

    // Other utilities can be added here
    intersperse: <T>(arr: T[], sep: T): T[] => {
        return arr.flatMap((v, i) => (i === 0 ? [v] : [sep, v]))
    },
}

function evaluateBlock(
    source: string,
    context: Record<string, any>
): { success: true; result: any; error: undefined } | { success: false; result: undefined; error: string } {
    try {
        const func = new Function(...Object.keys(context), source)

        const result = func(...Object.values(context))

        return {
            success: true,
            result,
            error: undefined,
        }
    } catch (error) {
        return {
            success: false,
            result: undefined,
            error: error instanceof Error ? error.message : String(error),
        }
    }
}

export type Cell = {
    id: string
    source: string
    lastUpdated: number
}

export type EvaluatedCell = {
    id: string
    lastEvaluated: number

    result: any
    decorations: Record<string, Decoration<any>>

    dependencies: string[]
}

export type Notebook = {
    cells: Record<string, Cell>
    evaluatedCells: Record<string, EvaluatedCell | null>
}
