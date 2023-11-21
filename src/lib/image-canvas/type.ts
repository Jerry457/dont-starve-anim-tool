export type bbox = {
    x: number
    y: number
    w: number
    h: number
    name?: string
}

export type uvbbox = {
    u1: number
    u2: number
    v1: number
    v2: number
    name?: string
}

export type block = {
    canvas: HTMLCanvasElement

    name?: string
    insertBBox?: bbox
}

export function uvbboxTobbox({ u1, u2, v1, v2, name }: uvbbox, width: number, height: number): bbox {
    const x = u1 * width
    const y = (1 - v2) * height
    const w = Math.ceil(u2 * width) - Math.floor(u1 * width)
    const h = Math.ceil(v2 * height) - Math.floor(v1 * height)
    return { x, y, w, h, name }
}

export function bboxTouvbbox({ x, y, w, h, name: _name }: bbox, width: number, height: number, name?: string): uvbbox {
    const u1 = x / width
    const v1 = 1 - (y + h) / height
    const u2 = (x + w) / width
    const v2 = 1 - y / height
    return { u1, v1, u2, v2, name: name ? name : _name }
}
