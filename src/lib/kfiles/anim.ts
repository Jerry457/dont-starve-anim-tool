import { BinaryDataReader, BinaryDataWriter } from "../binary-data"
import { strHash } from "./util"

const exportDepth = 10

const facingRight = 1 << 0
const facingUp = 1 << 1
const facingLeft = 1 << 2
const facingDown = 1 << 3
const facingUpRight = 1 << 4
const facingUpLeft = 1 << 5
const facingDownRight = 1 << 6
const facingDownLeft = 1 << 7

const defaultFacingByte = facingRight | facingLeft | facingUp | facingDown | facingUpLeft | facingUpRight | facingDownLeft | facingDownRight

const faceingDirectionMap: ReadonlyMap<number, string> = new Map([
    [facingUp, "_up"],
    [facingDown, "_down"],
    [facingLeft | facingRight, "_side"],
    [facingLeft, "_left"],
    [facingRight, "_right"],
    [facingUpLeft | facingUpRight, "_upside"],
    [facingDownLeft | facingDownRight, "_downside"],
    [facingUpLeft, "_upleft"],
    [facingUpRight, "_upright"],
    [facingDownLeft, "_downleft"],
    [facingDownRight, "_downright"],
    [facingUpLeft | facingUpRight | facingDownLeft | facingDownRight, "_45s"],
    [facingUp | facingDown | facingLeft | facingRight, "_90s"],
])

export class AnimElement {
    zIndex: number
    symbol: string
    frame: number
    layerName: string
    m_a: number
    m_b: number
    m_c: number
    m_d: number
    m_tx: number
    m_ty: number

    constructor(
        zIndex: number,
        symbol: string = "",
        frame: number = 0,
        layerName: string = "",
        m_a: number = 1,
        m_b: number = 0,
        m_c: number = 0,
        m_d: number = 1,
        m_tx: number = 0,
        m_ty: number = 1
    ) {
        this.symbol = symbol.toLowerCase()
        this.frame = frame
        this.layerName = layerName.toLowerCase()
        this.m_a = m_a
        this.m_b = m_b
        this.m_c = m_c
        this.m_d = m_d
        this.m_tx = m_tx
        this.m_ty = m_ty
        this.zIndex = zIndex
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
    events: string[]

    constructor(idx: number, x: number = 0, y: number = 0, w: number = 9999, h: number = 9999, elements: AnimElement[] = [], events: string[] = []) {
        this.idx = idx
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.elements = elements
        this.events = events
    }

    sort() {
        this.elements.sort((a, b) => a.zIndex - b.zIndex)
    }

    getSubRow() {
        return this.elements
    }
}

export class Animation {
    name: string
    frameRate: number
    frames: AnimFrame[]

    constructor(name: string = "", frameRate: number = 30, frames: AnimFrame[] = []) {
        this.name = name
        this.frameRate = frameRate
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

export async function decompileAnim(data: BinaryDataReader | ArrayBuffer) {
    const anim = new Anim()

    const reader = data instanceof BinaryDataReader ? data : new BinaryDataReader(data)
    reader.cursor = 20

    const animationNum = reader.readUint32()

    // skip animation, read hash dict first
    for (let i = 0; i < animationNum; i++) {
        const animationNameLen = reader.readUint32()
        const frameNum = reader.readUint32(reader.cursor + 9 + animationNameLen)
        for (let idx = 0; idx < frameNum; idx++) {
            const eventNum = reader.readUint32(reader.cursor + 16) // is 0, no use
            const elementNum = reader.readUint32(reader.cursor + eventNum * 4)
            reader.cursor += 40 * elementNum
        }
    }

    const hashNum = reader.readUint32()
    const hashMap = new Map<number, string>()
    for (let i = 0; i < hashNum; i++) {
        const hash = reader.readUint32()
        const strLen = reader.readInt32()
        const str = reader.readString(strLen)
        hashMap.set(hash, str)
    }

    // read animation
    reader.cursor = 24
    for (let i = 0; i < animationNum; i++) {
        const animationNameLen = reader.readInt32()
        let animationName = reader.readString(animationNameLen)
        const facingByte = reader.readByte()
        const bankNameHash = reader.readUint32()
        const bankName = hashMap.get(bankNameHash)!
        const frameRate = reader.readFloat32()
        const frameNum = reader.readInt32()

        let bank = anim.getBank(bankName)
        if (!bank) {
            bank = new Bank(bankName)
            anim.banks.push(bank)
        }
        animationName += faceingDirectionMap.get(facingByte) || ""
        const animation = new Animation(animationName, frameRate)
        bank.animations.push(animation)

        for (let idx = 0; idx < frameNum; idx++) {
            const x = reader.readFloat32()
            const y = reader.readFloat32()
            const w = reader.readFloat32()
            const h = reader.readFloat32()

            const animFrame = new AnimFrame(idx, x, y, w, h)
            animation.frames.push(animFrame)

            const eventNum = reader.readUint32()
            for (let eventindex = 0; eventindex < eventNum; eventindex++) {
                const eventNameHash = reader.readUint32()
                const eventName = hashMap.get(eventNameHash)!
                animFrame.events.push(eventName)
            }

            const elementNum = reader.readUint32(reader.cursor)
            for (let zIndex = 0; zIndex < elementNum; zIndex++) {
                const symbolNameHash = reader.readUint32()
                const symbol = hashMap.get(symbolNameHash)!
                const frame = reader.readUint32()
                const layerNameHash = reader.readUint32()
                const layerName = hashMap.get(layerNameHash)!

                const m_a = reader.readFloat32()
                const m_b = reader.readFloat32()
                const m_c = reader.readFloat32()
                const m_d = reader.readFloat32()
                const m_tx = reader.readFloat32()
                const m_ty = reader.readFloat32()
                const z = reader.readFloat32()

                const element = new AnimElement(zIndex, symbol, frame, layerName, m_a, m_b, m_c, m_d, m_tx, m_ty)
                animFrame.elements.push(element)
            }
            animFrame.sort()
        }
        animation.sort()
    }

    return anim
}

export async function compileAnim(anim: Anim) {
    const hashMap: Map<number, string> = new Map()
    const writer = new BinaryDataWriter()

    let animationNum = 0
    let eventNum = 0
    let frameNum = 0
    let elementNum = 0
    for (const bank of anim.banks) {
        animationNum += bank.animations.length
        for (const animation of bank.animations) {
            frameNum += animation.frames.length
            for (const frame of animation.frames) {
                elementNum += frame.elements.length
                eventNum += frame.events.length
            }
        }
    }

    // write head
    writer.writeString("ANIM")
    writer.writeInt32(anim.version)
    writer.writeUint32(elementNum)
    writer.writeUint32(frameNum)
    writer.writeUint32(eventNum)
    writer.writeUint32(animationNum)

    // write animations info
    for (const bank of anim.banks) {
        const bankNameHash = strHash(bank.name)
        hashMap.set(bankNameHash, bank.name)

        for (const animation of bank.animations) {
            let facingByte = defaultFacingByte
            let animationName = animation.name

            for (const [byte, direction] of faceingDirectionMap.entries()) {
                const result = new RegExp(`^(.*)${direction}$`).exec(animation.name)
                if (result) {
                    animationName = result[1]
                    facingByte = byte
                    break
                }
            }

            // write animation info
            writer.writeInt32(animationName.length)
            writer.writeString(animationName)
            writer.writeByte(facingByte)
            writer.writeUint32(bankNameHash)
            writer.writeFloat32(animation.frameRate)
            writer.writeUint32(animation.frames.length)

            // write frames info
            for (const frame of animation.frames) {
                // write frame info
                writer.writeFloat32(frame.x)
                writer.writeFloat32(frame.y)
                writer.writeFloat32(frame.w)
                writer.writeFloat32(frame.h)
                writer.writeUint32(frame.events.length)

                // write events info
                for (const eventName of frame.events) {
                    const eventNameHash = strHash(eventName)
                    hashMap.set(eventNameHash, eventName)
                }

                frame.sort()

                // write elements info
                writer.writeUint32(frame.elements.length)
                for (const element of frame.elements) {
                    const symbolHash = strHash(element.symbol)
                    const layerNameHash = strHash(element.layerName)
                    hashMap.set(symbolHash, element.symbol)
                    hashMap.set(layerNameHash, element.layerName)

                    // write element info
                    writer.writeUint32(symbolHash)
                    writer.writeUint32(element.frame)
                    writer.writeUint32(layerNameHash)
                    writer.writeFloat32(element.m_a)
                    writer.writeFloat32(element.m_b)
                    writer.writeFloat32(element.m_c)
                    writer.writeFloat32(element.m_d)
                    writer.writeFloat32(element.m_tx)
                    writer.writeFloat32(element.m_ty)
                    writer.writeFloat32((element.zIndex / frame.elements.length) * exportDepth - exportDepth * 10)
                }
            }
        }
    }

    // write hashMap info
    writer.writeUint32(hashMap.size)
    for (const [hash, str] of hashMap) {
        writer.writeUint32(hash)
        writer.writeInt32(str.length)
        writer.writeString(str)
    }

    return writer.getBuffer()
}
