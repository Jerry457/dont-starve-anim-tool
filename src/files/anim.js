import struct from "python-struct"

const FACING_RIGHT = 1 << 0
const FACING_UP = 1 << 1
const FACING_LEFT = 1 << 2
const FACING_DOWN = 1 << 3
const FACING_UPRIGHT = 1 << 4
const FACING_UPLEFT = 1 << 5
const FACING_DOWNRIGHT = 1 << 6
const FACING_DOWNLEFT = 1 << 7

const faceing_dir = {
    [FACING_UP]: "_up",
    [FACING_DOWN]: "_down",
    [FACING_LEFT | FACING_RIGHT]: "_side",
    [FACING_LEFT]: "_left",
    [FACING_RIGHT]: "_right",
    [FACING_UPLEFT | FACING_UPRIGHT]: "_upside",
    [FACING_DOWNLEFT | FACING_DOWNRIGHT]: "_downside",
    [FACING_UPLEFT]: "_upleft",
    [FACING_UPRIGHT]: "_upright",
    [FACING_DOWNLEFT]: "_downleft",
    [FACING_DOWNRIGHT]: "_downright",
    [FACING_UPLEFT | FACING_UPRIGHT | FACING_DOWNLEFT | FACING_DOWNRIGHT]: "_45s",
    [FACING_UP | FACING_DOWN | FACING_LEFT | FACING_RIGHT]: "_90s",
}

class AnimElement {
    symbol
    frame
    layername
    m_a
    m_b
    m_c
    m_d
    m_tx
    m_ty
    z_index
    used = true

    constructor(z_index, symbol, frame, layername, m_a, m_b, m_c, m_d, m_tx, m_ty) {
        this.symbol = symbol.toLowerCase()
        this.frame = frame
        this.layername = layername.toLowerCase()
        this.m_a = m_a
        this.m_b = m_b
        this.m_c = m_c
        this.m_d = m_d
        this.m_tx = m_tx
        this.m_ty = m_ty
        this.z_index = z_index
    }
}

class AnimFrame {
    x
    y
    w
    h
    idx
    used = true
    elements = []

    constructor(idx, x, y, w, h, elements = []) {
        this.idx = idx
        this.x = x
        this.y = y
        this.w = w
        this.h = h

        for (const element of elements) {
            this.add_element(new AnimElement(element.z_index, element.symbol || element.name, element.frame, element.layername, element.m_a, element.m_b, element.m_c, element.m_d, element.m_tx, element.m_ty))
        }
    }

    add_element(element) {
        if (!(element instanceof AnimElement)) {
            throw new TypeError(`element is no ${AnimElement}`)
        }

        const elements = this.elements
        const proxy_element = new Proxy(element, {
            get(target, key) {
                return target[key]
            },
            set(target, key, value) {
                target[key] = value
                if (key === "z_index") {
                    elements.sort((a, b) => a.z_index - b.z_index)
                }
                return true
            },
        })

        elements.push(proxy_element)
        elements.sort((a, b) => a.z_index - b.z_index)
    }
}

class Animation {
    name
    framerate
    frames = []

    constructor(name, framerate, frames = []) {
        this.name = name
        this.framerate = framerate

        for (const frame_idx in frames) {
            const frame = frames[frame_idx]
            this.add_frame(new AnimFrame(frame_idx, frame.x, frame.y, frame.w, frame.h, frame.elements))
        }
    }

    add_frame(frame) {
        if (!(frame instanceof AnimFrame)) {
            throw new TypeError(`frame is no ${AnimFrame}`)
        }

        const frames = this.frames
        const proxy_frame = new Proxy(frame, {
            get(target, key) {
                return target[key]
            },
            set(target, key, value) {
                target[key] = value
                if (key === "idx") {
                    frames.sort((a, b) => a.idx - b.idx)
                }
                return true
            },
        })
        frames.push(proxy_frame)
        frames.sort((a, b) => a.z_index - b.z_index)
    }
}

class Bank {
    name
    animations = {}

    constructor(name, data = []) {
        this.name = name

        for (const animation_name in data) {
            this.add_animation(new Animation(animation_name, data[animation_name].framerate, data[animation_name].frames))
        }
    }

    add_animation(animation) {
        if (!(animation instanceof Animation)) {
            throw new TypeError(`animation is no ${Animation}`)
        }

        if (animation.name in this.animations) {
            alert(`repeat animation ${animation.name}`)
            throw new ErrorEvent(`repeat animation ${animation.name}`)
        }

        this.animations[animation.name] = animation
    }
}

export class Anim {
    version = 4
    type = "Anim"

    banks = {}

    constructor(data) {
        if (!data) {
            return
        }
        for (const bank_name in data.banks) {
            this.add_bank(new Bank(bank_name, data.banks[bank_name]))
        }
    }

    add_bank(bank) {
        if (!(bank instanceof Bank)) {
            throw new TypeError(`bank is no ${Bank}`)
        }
        if (!(bank.name in this.banks)) {
            this.banks[bank.name] = bank
        }
    }
}

export function UnpackAnim(buff) {
    const anim = new Anim()

    const animation_num = struct.unpack("<I", buff.subarray(20, 24))[0]

    // calculate hast dist offset, beacuse unpack hash dict first
    let offset = 24
    for (var i = 0; i < animation_num; i++) {
        const animation_name_len = struct.unpack("<i", buff.subarray(offset, offset + 4))[0]
        const frame_num = struct.unpack("<I", buff.subarray(offset + 13 + animation_name_len, offset + 17 + animation_name_len))[0]
        offset += 17 + animation_name_len
        for (var idx = 0; idx < frame_num; idx++) {
            const event_num = struct.unpack("<I", buff.subarray(offset + 16, offset + 20))[0] // is 0, no use
            const element_num = struct.unpack("<I", buff.subarray(offset + 20 + event_num * 4, offset + 24 + event_num * 4))[0]
            offset += 24 + event_num * 4 + 40 * element_num
        }
    }
    const hash_dict_len = struct.unpack("<I", buff.subarray(offset, offset + 4))[0]
    const hash_dict = {}
    offset += 4
    for (var i = 0; i < hash_dict_len; i++) {
        const hash = struct.unpack("<I", buff.subarray(offset, offset + 4))[0]
        const str_len = struct.unpack("<i", buff.subarray(offset + 4, offset + 8))[0]
        const str = struct.unpack("<" + str_len + "s", buff.subarray(offset + 8, offset + 8 + str_len))[0]
        hash_dict[hash] = str
        offset += 8 + str_len
    }

    offset = 24
    for (var i = 0; i < animation_num; i++) {
        const animation_name_len = struct.unpack("<i", buff.subarray(offset, offset + 4))[0]
        let animation_name = struct.unpack("<" + animation_name_len + "s", buff.subarray(offset + 4, offset + 4 + animation_name_len))[0]
        const facing_byte = struct.unpack("<B", buff.subarray(offset + 4 + animation_name_len, offset + 5 + animation_name_len))[0]
        const bank_name_hash = struct.unpack("<I", buff.subarray(offset + 5 + animation_name_len, offset + 9 + animation_name_len))[0]
        const bank_name = hash_dict[bank_name_hash]
        const frame_rate = struct.unpack("<f", buff.subarray(offset + 9 + animation_name_len, offset + 13 + animation_name_len))[0]
        const frame_num = struct.unpack("<I", buff.subarray(offset + 13 + animation_name_len, offset + 17 + animation_name_len))[0]

        if (!(bank_name in anim.banks)) {
            anim.add_bank(new Bank(bank_name))
        }
        animation_name += faceing_dir[facing_byte] || ""
        const animation = new Animation(animation_name, frame_rate)
        anim.banks[bank_name].add_animation(animation)

        offset += 17 + animation_name_len

        for (var idx = 0; idx < frame_num; idx++) {
            const [x, y, w, h] = struct.unpack("<ffff", buff.subarray(offset, offset + 16))
            const event_num = struct.unpack("<I", buff.subarray(offset + 16, offset + 20))[0] // is 0, no use
            const element_num = struct.unpack("<I", buff.subarray(offset + 20 + event_num * 4, offset + 24 + event_num * 4))[0]
            const anim_frame = new AnimFrame(idx, x, y, w, h)

            offset += 24 + event_num * 4

            for (var z_index = 0; z_index < element_num; z_index++) {
                const symbol_name_hash = struct.unpack("<I", buff.subarray(offset, offset + 4))[0]
                const symbol_name = hash_dict[symbol_name_hash]
                const frame = struct.unpack("<I", buff.subarray(offset + 4, offset + 8))[0]
                const layer_name_hash = struct.unpack("<I", buff.subarray(offset + 8, offset + 12))[0]
                const layer_name = hash_dict[layer_name_hash]
                const [m_a, m_b, m_c, m_d, m_tx, m_ty, z] = struct.unpack("<fffffff", buff.subarray(offset + 12, offset + 40))

                anim_frame.add_element(new AnimElement(z_index, symbol_name, frame, layer_name, m_a, m_b, m_c, m_d, m_tx, m_ty))

                offset += 40
            }

            animation.add_frame(anim_frame)
        }
    }

    return anim
}
