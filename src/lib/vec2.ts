export type Vector2 = { x: number; y: number }

export const Vec2 = {
    of: (x: number, y: number): Vector2 => ({ x, y }),
    add: (a: Vector2, b: Vector2): Vector2 => ({ x: a.x + b.x, y: a.y + b.y }),
    sub: (a: Vector2, b: Vector2): Vector2 => ({ x: a.x - b.x, y: a.y - b.y }),
    lerp: (a: Vector2, b: Vector2, t: number): Vector2 => ({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
    }),
    scale: (v: Vector2, s: number): Vector2 => ({ x: v.x * s, y: v.y * s }),
    dot: (a: Vector2, b: Vector2): number => a.x * b.x + a.y * b.y,
    length: (v: Vector2): number => Math.sqrt(v.x * v.x + v.y * v.y),
    normalize: (v: Vector2): Vector2 => {
        const len = Vec2.length(v)
        return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len }
    },
    distance: (a: Vector2, b: Vector2): number => Vec2.length(Vec2.sub(a, b)),

    average: (points: Vector2[]): Vector2 => {
        if (points.length === 0) return { x: 0, y: 0 }
        const sum = points.reduce(
            (acc, p) => {
                acc.x += p.x
                acc.y += p.y
                return acc
            },
            { x: 0, y: 0 }
        )
        return { x: sum.x / points.length, y: sum.y / points.length }
    },

    isClose: (a: Vector2, b: Vector2, epsilon = 1e-6): boolean => {
        return Vec2.distance(a, b) < epsilon
    },

    perpendicular: (v: Vector2): Vector2 => ({ x: -v.y, y: v.x }),

    rotor: (angleRad: number): Vector2 => ({
        x: Math.cos(angleRad),
        y: Math.sin(angleRad),
    }),

    Zero: { x: 0, y: 0 },
}
