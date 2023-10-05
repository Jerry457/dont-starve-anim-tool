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

export class AnimElement {
    z_index: number
    symbol: string
    frame: number
    layer_name: string
    m_a: number
    m_b: number
    m_c: number
    m_d: number
    m_tx: number
    m_ty: number

    constructor(
        z_index: number,
        symbol: string = "",
        frame: number = 0,
        layer_name: string = "",
        m_a: number = 1,
        m_b: number = 0,
        m_c: number = 0,
        m_d: number = 1,
        m_tx: number = 0,
        m_ty: number = 1
    ) {
        this.symbol = symbol.toLowerCase()
        this.frame = frame
        this.layer_name = layer_name.toLowerCase()
        this.m_a = m_a
        this.m_b = m_b
        this.m_c = m_c
        this.m_d = m_d
        this.m_tx = m_tx
        this.m_ty = m_ty
        this.z_index = z_index
    }

    getCell() {
        return {
            z_index: this.z_index,
            symbol: this.symbol,
            frame: this.frame,
            layer_name: this.layer_name,
            m_a: this.m_a,
            m_b: this.m_b,
            m_c: this.m_c,
            m_d: this.m_d,
            m_tx: this.m_tx,
            m_ty: this.m_ty,
        }
    }

    getSubRow = undefined
}

export class AnimFrame {
    x: number
    y: number
    w: number
    h: number
    idx: number
    elements: AnimElement[]

    constructor(idx: number, x: number = 0, y: number = 0, w: number = 9999, h: number = 9999, elements: AnimElement[] = []) {
        this.idx = idx
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.elements = elements
    }

    sort() {
        this.elements.sort((a, b) => a.z_index - b.z_index)
    }

    getCell() {
        return {
            idx: this.idx,
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h,
        }
    }

    getSubRow() {
        return this.elements
    }
}

export class Animation {
    name: string
    frame_rate: number
    frames: AnimFrame[]

    constructor(name: string = "", frame_rate: number = 30, frames: AnimFrame[] = []) {
        this.name = name
        this.frame_rate = frame_rate
        this.frames = frames
    }

    sort() {
        this.frames.sort((a, b) => a.idx - b.idx)
    }

    getCell() {
        return {
            name: this.name,
            frame_rate: this.frame_rate,
        }
    }

    getSubRow() {
        return this.frames
    }
}

export class Bank {
    name: string
    animations: Animation[]

    constructor(name: string = "", animations: Animation[] = []) {
        this.name = name
        this.animations = animations
    }

    getCell() {
        return {
            name: this.name,
        }
    }

    getSubRow() {
        return this.animations
    }
}

export class Anim {
    version = 4
    type = "Anim"
    banks: Bank[]

    constructor(banks: Bank[] = []) {
        this.banks = banks
    }

    getBank(name: string) {
        for (const bank of this.banks) {
            if (bank.name === name) {
                return bank
            }
        }
    }
}

export function UnpackAnim(buff: Buffer) {
    const anim = new Anim()
    const animation_num = struct.unpack("<I", buff.subarray(20, 24))[0] as number

    // calculate hast dist offset, beacuse unpack hash dict first
    let offset = 24
    for (let i = 0; i < animation_num; i++) {
        const animation_name_len = struct.unpack("<i", buff.subarray(offset, offset + 4))[0] as number
        const frame_num = struct.unpack("<I", buff.subarray(offset + 13 + animation_name_len, offset + 17 + animation_name_len))[0] as number
        offset += 17 + animation_name_len
        for (let idx = 0; idx < frame_num; idx++) {
            const event_num = struct.unpack("<I", buff.subarray(offset + 16, offset + 20))[0] as number // is 0, no use
            const element_num = struct.unpack("<I", buff.subarray(offset + 20 + event_num * 4, offset + 24 + event_num * 4))[0] as number
            offset += 24 + event_num * 4 + 40 * element_num
        }
    }
    const hash_dict_len = struct.unpack("<I", buff.subarray(offset, offset + 4))[0] as number
    const hash_dict = new Map<number, string>()
    offset += 4
    for (let i = 0; i < hash_dict_len; i++) {
        const hash = struct.unpack("<I", buff.subarray(offset, offset + 4))[0] as number
        const str_len = struct.unpack("<i", buff.subarray(offset + 4, offset + 8))[0] as number
        const str = struct.unpack("<" + str_len + "s", buff.subarray(offset + 8, offset + 8 + str_len))[0] as string
        hash_dict.set(hash, str)
        offset += 8 + str_len
    }

    offset = 24
    for (let i = 0; i < animation_num; i++) {
        const animation_name_len = struct.unpack("<i", buff.subarray(offset, offset + 4))[0] as number
        let animation_name = struct.unpack("<" + animation_name_len + "s", buff.subarray(offset + 4, offset + 4 + animation_name_len))[0] as string
        const facing_byte = struct.unpack("<B", buff.subarray(offset + 4 + animation_name_len, offset + 5 + animation_name_len))[0] as number
        const bank_name_hash = struct.unpack("<I", buff.subarray(offset + 5 + animation_name_len, offset + 9 + animation_name_len))[0] as number
        const bank_name = hash_dict.get(bank_name_hash) as string
        const frame_rate = struct.unpack("<f", buff.subarray(offset + 9 + animation_name_len, offset + 13 + animation_name_len))[0] as number
        const frame_num = struct.unpack("<I", buff.subarray(offset + 13 + animation_name_len, offset + 17 + animation_name_len))[0] as number

        let bank = anim.getBank(bank_name)
        if (!bank) {
            bank = new Bank(bank_name)
            anim.banks.push(bank)
        }
        animation_name += faceing_dir[facing_byte] || ""
        const animation = new Animation(animation_name, frame_rate)
        bank.animations.push(animation)

        offset += 17 + animation_name_len

        for (let idx = 0; idx < frame_num; idx++) {
            const [x, y, w, h] = struct.unpack("<ffff", buff.subarray(offset, offset + 16)) as number[]
            const event_num = struct.unpack("<I", buff.subarray(offset + 16, offset + 20))[0] as number // is 0, no use
            const element_num = struct.unpack("<I", buff.subarray(offset + 20 + event_num * 4, offset + 24 + event_num * 4))[0] as number
            const anim_frame = new AnimFrame(idx, x, y, w, h)
            animation.frames.push(anim_frame)

            offset += 24 + event_num * 4

            for (let z_index = 0; z_index < element_num; z_index++) {
                const symbol_name_hash = struct.unpack("<I", buff.subarray(offset, offset + 4))[0] as number
                const symbol = hash_dict.get(symbol_name_hash) as string
                const frame = struct.unpack("<I", buff.subarray(offset + 4, offset + 8))[0] as number
                const layer_name_hash = struct.unpack("<I", buff.subarray(offset + 8, offset + 12))[0] as number
                const layer_name = hash_dict.get(layer_name_hash) as string
                const [m_a, m_b, m_c, m_d, m_tx, m_ty, z] = struct.unpack("<fffffff", buff.subarray(offset + 12, offset + 40)) as number[]

                const element = new AnimElement(z_index, symbol, frame, layer_name, m_a, m_b, m_c, m_d, m_tx, m_ty)
                anim_frame.elements.push(element)
                anim_frame.sort()

                offset += 40
            }
        }
        animation.sort()
    }

    return anim
}
