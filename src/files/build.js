import {crop, resize} from "./util.js"
import struct from "python-struct"

class BuildFrame {
    framenum = 0
    duration = 1
    x = 0
    y = 0
    w = 1
    h = 1
    canvas

    constructor(framenum, duration=1, x=0, y=0, w=1, h=1, alphaidx=0, alphacount=0) {
        this.framenum = framenum
        this.duration = duration
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.alphaidx = alphaidx
        this.alphacount = alphacount
    }

    get_pivot() {
        const pivot_x = 0.5 - this.x / this.w
        const pivot_y = 0.5 + this.y / this.h

        return [pivot_x, pivot_y]
    }

    from_pivot(pivot_x, pivot_y) {
        this.x = Math.floor(this.w / 2) - pivot_x * this.w
        this.y = - Math.floor(this.h / 2) + pivot_y * this.h
    }
}

class BuildSymbol extends Array {
    constructor(data) {
        super()

        this.name = data.name

        for (const frame of data) {
            this.add_frame(new BuildFrame(frame.framenum, frame.duration, frame.x, frame.y, frame.w, frame.h, frame.alphaidx, frame.alphacount))
        }
    }

    add_frame(frame) {
        if (! (frame instanceof BuildFrame)) {
            throw new TypeError(`frame is no ${BuildFrame}`)
        }

        const frames = this
        const proxy_frame = new Proxy(frame, {
            set(target, property, value) {
                target[property] = value
                if (property === "framenum") {
                    frames.sort((a, b) => a.framenum - b.framenum)
                }
                return true
            }
        })

        frames.push(proxy_frame)
        frames.sort((a, b) => a.framenum - b.framenum)
    }
}

class Vert {
    constructor(x, y, z, u, v, w) {
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
    symbols = {}
    atlases = []
    verts = []

    constructor(data) {
        if (!data) {
            return
        }

        this.name = data.name

        for (const symbol_name in data.Symbol) {
            this.symbols[symbol_name] = new BuildSymbol(data.Symbol[symbol_name])
        }
    }

    add_symbol(symbol) {
        if (! (symbol instanceof BuildSymbol)) {
            throw new TypeError(`symbol is no ${BuildSymbol}`)
        }

        if (symbol.name in this.symbols) {
            console.log(`over build symbol ${symbol.name}`)
        }
        this.symbols[symbol.name] = symbol
    }

    add_vert(vert) {
        if (! (vert instanceof Vert)) {
            throw new TypeError(`vert is no ${Vert}`)
        }
        this.verts.push(vert)
    }

    split_altas() {
        if (this.atlases.length === 0) {
            return
        }

        let scale_num = 0
        let scale = 0

        for (const symbol_name in this.symbols) {
            for (const frame of this.symbols[symbol_name]) {
                const verts = this.verts.slice(frame.alphaidx, frame.alphaidx + frame.alphacount)
                if (verts.length % 6 !== 0) {
                    throw Error("vert num error")
                }

                let u_min = Infinity
                let u_max = 0
                let v_min = Infinity
                let v_max = 0

                let region_left = Infinity
                let region_right = -Infinity
                let region_top = Infinity
                let region_bottom = -Infinity

                for (var i = 0; i < verts.length; i += 6) {
                    u_min = Math.min(u_min, verts[i].u)
                    u_max = Math.max(u_max, verts[i + 1].u)
                    v_max = Math.max(v_max, verts[i].v)
                    v_min = Math.min(v_min, verts[i + 2].v)

                    region_left = Math.min(region_left, verts[i].x)
                    region_right = Math.max(region_right, verts[i + 1].x)
                    region_bottom = Math.max(region_bottom, verts[i + 2].y)
                    region_top = Math.min(region_top, verts[i + 3].y)
                }

                if ((u_max - u_min) <= 0 || (v_max - v_min) <= 0) {
                    frame.canvas = document.createElement("canvas", {alpha: true})
                    frame.canvas.width = frame.w
                    frame.canvas.height = frame.h
                    continue
                }

                const atlas = this.atlases[verts[0].w]
                const bbox_x = Math.round(u_min * atlas.width)
                const bbox_y = Math.round((1 - v_max) * atlas.height)
                const bbox_width = Math.round((u_max - u_min) * atlas.width)
                const bbox_height = Math.round((v_max - v_min) * atlas.height)

                const x_offset = frame.x - Math.floor(frame.w / 2)
                const y_offset =  frame.y - Math.floor(frame.h / 2)

                const region_x = Math.round(region_left - x_offset)
                const region_y = Math.round(region_top - y_offset)
                const region_w = Math.round(region_right - region_left)
                const region_h = Math.round(region_bottom - region_top)

                let cropped = crop(atlas, bbox_x, bbox_y, bbox_width, bbox_height)
                if (cropped.width !== region_w || cropped.height !== region_h) {
                    scale_num += 2
                    scale += cropped.width / region_w + cropped.height / region_h

                    cropped = resize(cropped, region_w, region_h)
                }
                if (cropped.width !== frame.w || cropped.height !== frame.h) {
                    let _w = region_x + cropped.width
                    let _h = region_y + cropped.height
                    if (_w <= 0 || _w > frame.w || _h <= 0 || _h > frame.h) {
                        console.log(`Build: ${this.name}, Symbol: ${symbol_name}-${frame.framenum} data error, this maybe scml file image width or height error`)
                        // const [pivot_x, pivot_y] = frame.get_pivot()  // get pivot
                        // frame.w = _w
                        // frame.h = _h
                        // frame.from_pivot(pivot_x, pivot_y)  // recalculate data
                    }
                    else {
                        const new_canvas = document.createElement("canvas")
                        new_canvas.width = frame.w
                        new_canvas.height = frame.h
                        const new_context = new_canvas.getContext("2d")
                        new_context.drawImage(cropped, region_x, region_y)
                        cropped = new_canvas
                    }
                }

                frame.canvas = cropped
                // document.body.appendChild(cropped)
            }
        }

        if (scale_num > 0) {
            this.scale = scale / scale_num
        }
    }
}

export function UnpackBuild(buff, atlases) {
    let offset = 0

    const build = new Build()

    const symbol_num = struct.unpack("<I", buff.subarray(8, 12))[0]
    const build_name_len = struct.unpack("<I", buff.subarray(16, 20))[0]
    build.name = struct.unpack("<" + build_name_len + "s", buff.subarray(20, 20 + build_name_len))[0]
    const atlas_num = struct.unpack("<I", buff.subarray(20 + build_name_len, 24 + build_name_len))[0]

    offset += 24 + build_name_len

    for (let atlas_idx = 0; atlas_idx < atlas_num; atlas_idx++) {
        const atlas_name_len = struct.unpack("<I", buff.subarray(offset , offset + 4))[0]
        const atlas_name = struct.unpack("<" + atlas_name_len + "s", buff.subarray(offset + 4, offset + 4 + atlas_name_len))[0]
        offset += 4 + atlas_name_len

        if (atlases && atlases[atlas_name]) {
            build.atlases.push(atlases[atlas_name])
        }
    }

    const symbols = {}
    for (let symbol_idx = 0; symbol_idx < symbol_num; symbol_idx++) {
        const symbol_name_hash = struct.unpack("<I", buff.subarray(offset, offset + 4))[0]
        const frames_num = struct.unpack("<I", buff.subarray(offset + 4, offset + 8))[0]
        offset += 8

        symbols[symbol_name_hash] = []
        for (let frame_idx = 0; frame_idx < frames_num; frame_idx++) {
            const framenum = struct.unpack("<I", buff.subarray(offset, offset + 4))[0]
            const duration = struct.unpack("<I", buff.subarray(offset + 4, offset + 8))[0]
            const [x, y, w, h] = struct.unpack("<ffff", buff.subarray(offset + 8, offset + 24))
            const alphaidx = struct.unpack("<I", buff.subarray(offset + 24, offset + 28))[0]
            const alphacount = struct.unpack("<I", buff.subarray(offset + 28, offset + 32))[0]

            symbols[symbol_name_hash].push(new BuildFrame(framenum, duration, x, y, w, h, alphaidx, alphacount))

            offset += 32
        }
    }

    const verts_num = struct.unpack("<I", buff.subarray(offset, offset + 4))[0]
    offset += 4
    for (let vert_idx = 0; vert_idx < verts_num; vert_idx++) {
        const [x, y, z, u, v, w] = struct.unpack("<ffffff", buff.subarray(offset, offset + 24))
        offset += 24
        build.add_vert(new Vert(x, y, z, u, v, w))
    }

    const hash_num = struct.unpack("<I", buff.subarray(offset, offset + 4))[0]
    offset += 4
    for (let hash_idx = 0; hash_idx < hash_num; hash_idx++) {
        const hash = struct.unpack("<I", buff.subarray(offset, offset + 4))[0]
        const hash_str_len = struct.unpack("<i", buff.subarray(offset + 4, offset + 8))[0]
        const hash_str = struct.unpack("<" + hash_str_len + "s", buff.subarray(offset + 8, offset + 8 + hash_str_len))[0]

        if (hash in symbols) {
            symbols[hash].name = hash_str.toLowerCase()
            build.add_symbol(new BuildSymbol(symbols[hash]))
        }

        offset += 8 + hash_str_len
    }

    build.split_altas()

    return build
}
