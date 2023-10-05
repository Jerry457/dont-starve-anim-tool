import Image from "image-js"
import struct from "python-struct"

export class BuildFrame {
    frame_num: number
    duration: number
    x: number
    y: number
    w: number
    h: number
    vert_idx: number
    vert_count: number

    image?: Image

    constructor(
        frame_num: number = 0,
        duration: number = 0,
        x: number = 0,
        y: number = 0,
        w: number = 1,
        h: number = 1,
        vert_idx: number = 0,
        vert_count: number = 0,
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
         * @param frame BuildFrame Object
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

    getCell() {
        return {
            frame_num: this.frame_num,
            duration: this.duration,
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h,
            vert_idx: this.vert_idx,
            vert_count: this.vert_count,
            imageURL: this.image? this.image.toDataURL(): ""
        }
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

    getCell() {
        return {
            name: this.name,
        }
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

    atlases: Image[] = []
    verts: Vert[] = []

    constructor(name: string = "", symbols: BuildSymbol[] = []) {
        this.name = name.toLowerCase()
        this.symbols = symbols
    }

    getCell() {
        return {
            name: this.name,
            scale: this.scale,
        }
    }

    getSubRow() {
        return this.symbols
    }

    split_altas() {
        if (this.atlases.length === 0) {
            return
        }

        let scaled_size = 0
        let origin_size = 0

        for (const [symbol_name, symbol] of Object.entries(this.symbols)) {
            for (const frame of symbol.get_all_frame()) {
                const verts = this.verts.slice(frame.vert_idx, frame.vert_idx + frame.vert_count)
                if (verts.length % 6 !== 0) {
                    const error_message = "vert num error"
                    alert(error_message)
                    throw Error(error_message)
                }

                let u_min = Infinity
                let u_max = 0
                let v_min = Infinity
                let v_max = 0

                let region_left = Infinity
                let region_right = -Infinity
                let region_top = Infinity
                let region_bottom = -Infinity

                for (let i = 0; i < verts.length; i += 6) {
                    u_min = Math.min(u_min, verts[i].u)
                    u_max = Math.max(u_max, verts[i + 1].u)
                    v_max = Math.max(v_max, verts[i].v)
                    v_min = Math.min(v_min, verts[i + 2].v)

                    region_left = Math.min(region_left, verts[i].x)
                    region_right = Math.max(region_right, verts[i + 1].x)
                    region_bottom = Math.max(region_bottom, verts[i + 2].y)
                    region_top = Math.min(region_top, verts[i + 3].y)
                }

                if (u_max - u_min <= 0 || v_max - v_min <= 0) {
                    frame.image = new Image(frame.w, frame.h, { alpha: 1 })
                    continue
                }

                const atlas = this.atlases[verts[0].w]

                const bbox_x = Math.round(u_min * atlas.width)
                const bbox_y = Math.round((1 - v_max) * atlas.height)
                const bbox_w = Math.round((u_max - u_min) * atlas.width)
                const bbox_h = Math.round((v_max - v_min) * atlas.height)

                const x_offset = frame.x - Math.floor(frame.w / 2)
                const y_offset = frame.y - Math.floor(frame.h / 2)

                const region_x = Math.round(region_left - x_offset)
                const region_y = Math.round(region_top - y_offset)
                const region_w = Math.round(region_right - region_left)
                const region_h = Math.round(region_bottom - region_top)

                let cropped = atlas.crop({ x: bbox_x, y: bbox_y, width: bbox_w, height: bbox_h })
                if (cropped.width !== region_w || cropped.height !== region_h) {
                    scaled_size += (cropped.width * cropped.height)
                    origin_size += (region_w * region_h)

                    cropped = cropped.resize({ width: region_w, height: region_h })
                }
                if (cropped.width !== frame.w || cropped.height !== frame.h) {
                    let _w = region_x + cropped.width
                    let _h = region_y + cropped.height
                    if (_w <= 0 || _w > frame.w || _h <= 0 || _h > frame.h) {
                        alert(
                            `Build: ${this.name}, Symbol: ${symbol_name}-${frame.frame_num} data error, this maybe scml file image width or height error`
                        )
                        // const [pivot_x, pivot_y] = frame.get_pivot() // get pivot
                        // frame.w = _w
                        // frame.h = _h
                        // frame.from_pivot(pivot_x, pivot_y) // recalculate data
                    } else {
                        const image = new Image(frame.w, frame.h, { alpha: 1 })
                        image.data = image.data.map(value => 0)
                        cropped = image.insert(cropped, { x: region_x, y: region_y })
                    }
                }
                frame.image = cropped

                // const imgElement = document.createElement("img")
                // imgElement.src = cropped.toDataURL()
                // document.body.appendChild(imgElement)

            }
        }

        if (origin_size > 0) {
            this.scale = Math.sqrt(scaled_size / origin_size)
        }
    }
}

export function UnpackBuild(buff: Buffer, atlases: { [name: string]: Image } = {}) {
    let offset = 0

    const build = new Build()

    const symbol_num = struct.unpack("<I", buff.subarray(8, 12))[0] as number
    const build_name_len = struct.unpack("<I", buff.subarray(16, 20))[0] as number
    build.name = struct.unpack("<" + build_name_len + "s", buff.subarray(20, 20 + build_name_len))[0] as string
    const atlas_num = struct.unpack("<I", buff.subarray(20 + build_name_len, 24 + build_name_len))[0] as number

    offset += 24 + build_name_len

    if (atlas_num > 3) {
        alert(`Waring! ${build.name} atlas more than 3`)
    }

    for (let atlas_idx = 0; atlas_idx < atlas_num; atlas_idx++) {
        const atlas_name_len = struct.unpack("<I", buff.subarray(offset, offset + 4))[0] as number
        const atlas_name = struct.unpack("<" + atlas_name_len + "s", buff.subarray(offset + 4, offset + 4 + atlas_name_len))[0] as number
        offset += 4 + atlas_name_len

        if (atlases[atlas_name]) {
            build.atlases[atlas_idx] = atlases[atlas_name]
        }
    }

    let symbol_offset = offset
    for (let symbol_idx = 0; symbol_idx < symbol_num; symbol_idx++) {
        const frames_cont = struct.unpack("<I", buff.subarray(offset + 4, offset + 8))[0] as number
        offset += 8

        for (let frame_idx = 0; frame_idx < frames_cont; frame_idx++) {
            offset += 32
        }
    }

    const verts_num = struct.unpack("<I", buff.subarray(offset, offset + 4))[0] as number
    offset += 4
    for (let vert_idx = 0; vert_idx < verts_num; vert_idx++) {
        const [x, y, z, u, v, w] = struct.unpack("<ffffff", buff.subarray(offset, offset + 24)) as number[]
        offset += 24
        build.verts.push(new Vert(x, y, z, u, v, w))
    }

    const hash_cont = struct.unpack("<I", buff.subarray(offset, offset + 4))[0] as number
    const hash_dict = new Map<number, string>()
    offset += 4
    for (let hash_idx = 0; hash_idx < hash_cont; hash_idx++) {
        const hash = struct.unpack("<I", buff.subarray(offset, offset + 4))[0] as number
        const str_len = struct.unpack("<i", buff.subarray(offset + 4, offset + 8))[0] as number
        const str = struct.unpack("<" + str_len + "s", buff.subarray(offset + 8, offset + 8 + str_len))[0] as string
        hash_dict.set(hash, str)
        offset += 8 + str_len
    }

    for (let symbol_idx = 0; symbol_idx < symbol_num; symbol_idx++) {
        const symbol_name_hash = struct.unpack("<I", buff.subarray(symbol_offset, symbol_offset + 4))[0] as number
        const frames_cont = struct.unpack("<I", buff.subarray(symbol_offset + 4, symbol_offset + 8))[0] as number
        symbol_offset += 8

        const symbol = new BuildSymbol(hash_dict.get(symbol_name_hash))
        for (let frame_idx = 0; frame_idx < frames_cont; frame_idx++) {
            const frame_num = struct.unpack("<I", buff.subarray(symbol_offset, symbol_offset + 4))[0] as number
            const duration = struct.unpack("<I", buff.subarray(symbol_offset + 4, symbol_offset + 8))[0] as number
            const [x, y, w, h] = struct.unpack("<ffff", buff.subarray(symbol_offset + 8, symbol_offset + 24)) as number[]
            const vert_idx = struct.unpack("<I", buff.subarray(symbol_offset + 24, symbol_offset + 28))[0] as number
            const vert_count = struct.unpack("<I", buff.subarray(symbol_offset + 28, symbol_offset + 32))[0] as number

            symbol.frames.push(new BuildFrame(frame_num, duration, x, y, w, h, vert_idx, vert_count))

            symbol_offset += 32
        }
        symbol.sort()
        build.symbols.push(symbol)
    }

    build.split_altas()

    return build
}
