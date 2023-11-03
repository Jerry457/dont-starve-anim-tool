import BinaryDataReader from "../binary-data/BinaryDataReader"
import { newCanvas, resize, crop, paste } from "../image-canvas"

export class BuildFrame {
    frame_num: number
    duration: number
    x: number
    y: number
    w: number
    h: number
    vert_idx: number
    vert_count: number

    canvas?: HTMLCanvasElement

    constructor(
        frame_num: number = 0,
        duration: number = 0,
        x: number = 0,
        y: number = 0,
        w: number = 1,
        h: number = 1,
        vert_idx: number = 0,
        vert_count: number = 0
    ) {
        this.frame_num = frame_num
        this.duration = duration
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.vert_idx = vert_idx
        this.vert_count = vert_count
    }

    get_pivot() {
        /**
         * Return transform-origin relative coordinates
         * The coordinate system has its origin at the bottom-left corner of the image
         * the positive x-axis extending to the right and the positive y-axis extending upwards.
         */
        const pivot_x = 0.5 - this.x / this.w
        const pivot_y = 0.5 + this.y / this.h

        return [pivot_x, pivot_y]
    }

    from_pivot(pivot_x: number, pivot_y: number, w: number, h: number) {
        /**
         * Return transform-origin absolute coordinates
         * The coordinate system has its origin at the image center
         * the positive x-axis extending to the left and the positive y-axis extending upwards.
         */
        const x = Math.floor(w / 2) - pivot_x * w
        const y = -Math.floor(h / 2) + pivot_y * h

        return [x, y]
    }

    getSubRow = undefined
}

export class BuildSymbol {
    name: string
    frames: BuildFrame[]

    constructor(name: string = "", frames: BuildFrame[] = []) {
        this.name = name.toLowerCase()
        this.frames = frames

        this.sort()
    }

    sort() {
        this.frames.sort((a, b) => a.frame_num - b.frame_num)
    }

    get_frame(frame_num: number, get_duration: boolean = true): BuildFrame | undefined {
        for (const frame of this.frames) {
            const duration = get_duration ? frame.duration - 1 : 0
            if (frame.frame_num <= frame_num && frame_num <= frame.frame_num + duration) {
                return frame
            }
        }
    }

    get_all_frame(get_duration: boolean = false) {
        this.sort()

        const frames = []
        for (const frame of this.frames) {
            for (let i = frame.frame_num; i < frame.frame_num + frame.duration; i++) {
                const frame = this.get_frame(i, get_duration)
                if (frame) {
                    frames.push(frame)
                }
            }
        }

        return frames
    }

    getSubRow() {
        return this.frames
    }
}

export class Vert {
    x: number
    y: number
    z: number
    u: number
    v: number
    w: number

    constructor(x: number, y: number, z: number, u: number, v: number, w: number) {
        this.x = x
        this.y = y
        this.z = z
        this.u = u
        this.v = v
        this.w = Math.floor(w)
    }
}

export class Build {
    version = 6
    scale = 1
    type = "Build"

    name: string
    symbols: BuildSymbol[]

    atlas_names: string[] = []
    verts: Vert[] = []

    constructor(name: string = "", symbols: BuildSymbol[] = []) {
        this.name = name.toLowerCase()
        this.symbols = symbols
    }

    getSubRow() {
        return this.symbols
    }

    async splitAltas(atlases: { [fileName: string]: HTMLCanvasElement }) {
        if (this.atlas_names.length === 0) {
            return
        }

        let scaled_size = 0
        let origin_size = 0

        for (const [symbol_name, symbol] of Object.entries(this.symbols)) {
            for (const frame of symbol.get_all_frame()) {
                if (frame.vert_count === 0) {
                    continue
                } else if (frame.vert_count % 6 !== 0) {
                    const error_message = "vert num error"
                    alert(error_message)
                    throw Error(error_message)
                }
                const frameVerts = this.verts.slice(frame.vert_idx, frame.vert_idx + frame.vert_count)

                let uMin = Infinity
                let uMax = 0
                let vMin = Infinity
                let vMax = 0

                let regionLeft = Infinity
                let regionRight = -Infinity
                let regionTop = Infinity
                let regionBottom = -Infinity

                for (let i = 0; i < frameVerts.length; i += 6) {
                    uMin = Math.min(uMin, frameVerts[i].u)
                    uMax = Math.max(uMax, frameVerts[i + 1].u)
                    vMax = Math.max(vMax, frameVerts[i].v)
                    vMin = Math.min(vMin, frameVerts[i + 2].v)

                    regionLeft = Math.min(regionLeft, frameVerts[i].x)
                    regionRight = Math.max(regionRight, frameVerts[i + 1].x)
                    regionBottom = Math.max(regionBottom, frameVerts[i + 2].y)
                    regionTop = Math.min(regionTop, frameVerts[i + 3].y)
                }

                const atlas = atlases[this.atlas_names[frameVerts[0].w]]

                const bboxX = Math.round(uMin * atlas.width)
                const bboxY = Math.round((1 - vMax) * atlas.height)
                const bboxW = Math.round((uMax - uMin) * atlas.width)
                const bboxH = Math.round((vMax - vMin) * atlas.height)

                const xOffset = frame.x - Math.floor(frame.w / 2)
                const yOffset = frame.y - Math.floor(frame.h / 2)

                const regionX = Math.round(regionLeft - xOffset)
                const regionY = Math.round(regionTop - yOffset)
                const regionW = Math.round(regionRight - regionLeft)
                const regionH = Math.round(regionBottom - regionTop)

                if (uMax - uMin <= 0 || vMax - vMin <= 0) {
                    frame.canvas = newCanvas(frame.w, frame.h)
                    continue
                }

                let cropped = crop(atlas, bboxX, bboxY, bboxW, bboxH)
                if (cropped.width !== regionW || cropped.height !== regionH) {
                    scaled_size = cropped.width * cropped.height
                    origin_size = regionW * regionH

                    cropped = resize(cropped, regionW, regionH)
                }
                if (cropped.width !== frame.w || cropped.height !== frame.h) {
                    let _w = regionX + cropped.width
                    let _h = regionY + cropped.height
                    if (_w <= 0 || _w > frame.w || _h <= 0 || _h > frame.h) {
                        alert(
                            `Build: ${this.name}, Symbol: ${symbol_name}-${frame.frame_num} data error, this maybe scml file image width or height error`
                        )
                        // const [pivot_x, pivot_y] = frame.get_pivot() // get pivot
                        // frame.w = _w
                        // frame.h = _h
                        // frame.from_pivot(pivot_x, pivot_y) // recalculate data
                    } else {
                        const image = newCanvas(frame.w, frame.h)
                        cropped = paste(image, cropped, regionX, regionY)
                    }
                }
                frame.canvas = cropped

                // document.body.appendChild(newCanvas(cropped.width, cropped.height, cropped))
            }
        }

        if (origin_size > 0) {
            this.scale = Math.sqrt(scaled_size / origin_size)
        }
    }
}

export async function UnpackBuild(data: BinaryDataReader | ArrayBuffer) {
    const build = new Build()

    const reader = data instanceof BinaryDataReader ? data : new BinaryDataReader(data)
    // Skip 'BUID' and version info
    reader.cursor = 8

    const symbol_num = reader.readUint32()
    const build_name_len = reader.readUint32(16)
    build.name = reader.readString(build_name_len)

    const atlas_num = reader.readUint32()

    if (atlas_num > 3) {
        alert(`Waring! ${build.name} atlas more than 3`)
    }

    for (let atlas_idx = 0; atlas_idx < atlas_num; atlas_idx++) {
        const atlas_name_len = reader.readUint32()
        const atlas_name = reader.readString(atlas_name_len)

        build.atlas_names.push(atlas_name)
    }

    const symbol_offset = reader.cursor
    for (let symbol_idx = 0; symbol_idx < symbol_num; symbol_idx++) {
        const frames_cont = reader.readUint32(reader.cursor + 4) // Skip symbol_name_hash

        // Skip 8 uint32
        reader.cursor += frames_cont * 4 * 8
    }

    const verts_num = reader.readUint32()
    for (let vert_idx = 0; vert_idx < verts_num; vert_idx++) {
        const x = reader.readFloat32()
        const y = reader.readFloat32()
        const z = reader.readFloat32()
        const u = reader.readFloat32()
        const v = reader.readFloat32()
        const w = reader.readFloat32()

        build.verts.push(new Vert(x, y, z, u, v, w))
    }

    const hash_cont = reader.readUint32()
    const hash_dict = new Map<number, string>()
    for (let hash_idx = 0; hash_idx < hash_cont; hash_idx++) {
        const hash = reader.readUint32()
        const str_len = reader.readUint32()
        const str = reader.readString(str_len)
        hash_dict.set(hash, str)
    }

    reader.cursor = symbol_offset
    for (let symbol_idx = 0; symbol_idx < symbol_num; symbol_idx++) {
        const symbol_name_hash = reader.readUint32()
        const frames_cont = reader.readUint32()

        const symbol = new BuildSymbol(hash_dict.get(symbol_name_hash))
        for (let frame_idx = 0; frame_idx < frames_cont; frame_idx++) {
            const frame_num = reader.readUint32()
            const duration = reader.readUint32()
            const x = reader.readFloat32()
            const y = reader.readFloat32()
            const w = reader.readFloat32()
            const h = reader.readFloat32()
            const vert_idx = reader.readUint32()
            const vert_count = reader.readUint32()

            symbol.frames.push(new BuildFrame(frame_num, duration, x, y, w, h, vert_idx, vert_count))
        }
        symbol.sort()
        build.symbols.push(symbol)
    }

    return build
}
