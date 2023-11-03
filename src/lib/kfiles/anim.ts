import BinaryDataReader from "../binary-data/BinaryDataReader"

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

    getSubRow() {
        return this.elements
    }
}

export class Animation {
    name: string
    frameRate: number
    frames: AnimFrame[]

    constructor(name: string = "", frame_rate: number = 30, frames: AnimFrame[] = []) {
        this.name = name
        this.frameRate = frame_rate
        this.frames = frames
    }

    sort() {
        this.frames.sort((a, b) => a.idx - b.idx)
    }

    getSubRow() {
        return this.frames
    }
}

export class Bank {
    [key: string]: any

    name: string
    animations: Animation[]

    constructor(name: string = "", animations: Animation[] = []) {
        this.name = name
        this.animations = animations
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

export async function UnpackAnim(data: BinaryDataReader | ArrayBuffer) {
    const anim = new Anim()

    const reader = data instanceof BinaryDataReader ? data : new BinaryDataReader(data)
    reader.cursor = 20

    const animation_num = reader.readUint32()

    // unpack hash dict first
    for (let i = 0; i < animation_num; i++) {
        const animation_name_len = reader.readUint32()
        const frame_num = reader.readUint32(reader.cursor + 9 + animation_name_len)
        for (let idx = 0; idx < frame_num; idx++) {
            const event_num = reader.readUint32(reader.cursor + 16) // is 0, no use
            const element_num = reader.readUint32(reader.cursor + event_num * 4)
            reader.cursor += 40 * element_num
        }
    }
    const hash_dict_len = reader.readUint32()
    const hash_dict = new Map<number, string>()
    for (let i = 0; i < hash_dict_len; i++) {
        const hash = reader.readUint32()
        const str_len = reader.readInt32()
        const str = reader.readString(str_len)
        hash_dict.set(hash, str)
    }
    //

    reader.cursor = 24
    for (let i = 0; i < animation_num; i++) {
        const animation_name_len = reader.readInt32()
        let animation_name = reader.readString(animation_name_len)
        const facing_byte = reader.readByte()
        const bank_name_hash = reader.readUint32()
        const bank_name = hash_dict.get(bank_name_hash)!
        const frame_rate = reader.readFloat32()
        const frame_num = reader.readInt32()

        let bank = anim.getBank(bank_name)
        if (!bank) {
            bank = new Bank(bank_name)
            anim.banks.push(bank)
        }
        animation_name += faceing_dir[facing_byte] || ""
        const animation = new Animation(animation_name, frame_rate)
        bank.animations.push(animation)

        for (let idx = 0; idx < frame_num; idx++) {
            const x = reader.readFloat32()
            const y = reader.readFloat32()
            const w = reader.readFloat32()
            const h = reader.readFloat32()

            const event_num = reader.readUint32() // is 0, no use
            const element_num = reader.readUint32(reader.cursor + event_num * 4)
            const anim_frame = new AnimFrame(idx, x, y, w, h)
            animation.frames.push(anim_frame)

            for (let z_index = 0; z_index < element_num; z_index++) {
                const symbol_name_hash = reader.readUint32()
                const symbol = hash_dict.get(symbol_name_hash)!
                const frame = reader.readUint32()
                const layer_name_hash = reader.readUint32()
                const layer_name = hash_dict.get(layer_name_hash)!

                const m_a = reader.readFloat32()
                const m_b = reader.readFloat32()
                const m_c = reader.readFloat32()
                const m_d = reader.readFloat32()
                const m_tx = reader.readFloat32()
                const m_ty = reader.readFloat32()
                const z = reader.readFloat32()

                const element = new AnimElement(z_index, symbol, frame, layer_name, m_a, m_b, m_c, m_d, m_tx, m_ty)
                anim_frame.elements.push(element)
            }
            anim_frame.sort()
        }
        animation.sort()
    }

    return anim
}
