import stringify from "json-stringify-pretty-compact"

import { BinaryDataReader, BinaryDataWriter } from "../binary-data"
import { Build } from "./build"
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
    frameNum: number
    layerName: string
    a: number
    b: number
    c: number
    d: number
    tx: number
    ty: number

    constructor(
        zIndex: number = 0,
        symbol: string = "",
        frameNum: number = 0,
        layerName: string = "",
        a: number = 1,
        b: number = 0,
        c: number = 0,
        d: number = 1,
        tx: number = 0,
        ty: number = 1
    ) {
        this.symbol = symbol
        this.frameNum = frameNum
        this.layerName = layerName
        this.a = a
        this.b = b
        this.c = c
        this.d = d
        this.tx = tx
        this.ty = ty
        this.zIndex = zIndex
    }

    getSubRows = undefined
}

export class AnimFrame {
    x: number
    y: number
    w: number
    h: number
    idx: number
    elements: AnimElement[]
    events: string[]

    constructor(idx: number = 0, x: number = 0, y: number = 0, w: number = 1, h: number = 1, elements: AnimElement[] = [], events: string[] = []) {
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

    getSubRows() {
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

    getSubRows() {
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

    sort() {
        this.animations.sort((a, b) => a.name[0].localeCompare(b.name[0]))
    }

    getSubRows() {
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

    calculateCollisionBox(build: Build) {
        for (const bank of this.banks) {
            for (const animation of bank.animations) {
                for (const frame of animation.frames) {
                    let frameTop = Infinity
                    let frameLeft = Infinity
                    let frameBottom = -Infinity
                    let frameRight = -Infinity

                    for (const element of frame.elements) {
                        const buildFrame = build.getSymbol(element.symbol)?.[0].getFrame(element.frameNum)?.[0]

                        if (!buildFrame) continue

                        const { a, b, c, d, tx, ty } = element
                        const { x, y, w, h } = buildFrame

                        const borderX = [0, w * a, h * c, w * a + h * c]
                        const borderY = [0, w * b, h * d, w * b + h * d]
                        const transformedWidth = Math.round(Math.max(...borderX) - Math.min(...borderX))
                        const transformedHeight = Math.round(Math.max(...borderY) - Math.min(...borderY))

                        if (transformedWidth <= 0 || transformedHeight <= 0) continue

                        const offsetX = tx + x * a + y * c
                        const offsetY = ty + x * b + y * d

                        const elementTop = offsetY - transformedHeight / 2
                        const elementBottom = offsetY + transformedHeight / 2
                        const elementLeft = offsetX - transformedWidth / 2
                        const elementRight = offsetX + transformedWidth / 2
                        frameTop = Math.min(frameTop, elementTop)
                        frameBottom = Math.max(frameBottom, elementBottom)
                        frameLeft = Math.min(frameLeft, elementLeft)
                        frameRight = Math.max(frameRight, elementRight)
                    }

                    const frameWidth = Math.round(frameRight - frameLeft)
                    const frameHeight = Math.round(frameBottom - frameTop)
                    if (frameWidth > 0 && frameHeight > 0) {
                        frame.w = frameWidth
                        frame.h = frameHeight
                        frame.x = (frameRight + frameLeft) / 2
                        frame.y = (frameTop + frameBottom) / 2
                    }
                }
            }
        }
    }

    jsonStringify(indent: number = 4) {
        const indent1 = `\n${" ".repeat(indent)}`
        const indent2 = `\n${" ".repeat(indent * 2)}`
        const indent3 = `\n${" ".repeat(indent * 3)}`
        const indent4 = `\n${" ".repeat(indent * 4)}`
        const indent5 = `\n${" ".repeat(indent * 5)}`
        const indent6 = `\n${" ".repeat(indent * 6)}`
        const indent7 = `\n${" ".repeat(indent * 7)}`

        const animHead = `"type": "${this.type}", "version": ${this.version}`

        let bankJson = this.banks
            .map((bank, bankIdx) => {
                const bankName = `"name": "${bank.name}"`

                let animationsJson = bank.animations
                    .map((animation, animationIdx) => {
                        const animationInfo = `"name": "${animation.name}", "frameRate": ${animation.frameRate}`

                        let framesJson = animation.frames
                            .map((frame, frameIdx) => {
                                const frameInfo = `"x": ${frame.x}, "y": ${frame.y}, "w": ${frame.w}, "h": ${frame.h}`

                                let elementJson = frame.elements
                                    .map((element, elementIdx) => {
                                        const elementInfo = stringify(element, { maxLength: Infinity })
                                        return `${elementInfo}${elementIdx === frame.elements.length - 1 ? "" : ","}`
                                    })
                                    .join(indent7)
                                elementJson = `"elemenets": [${indent7}${elementJson}${indent6}]`

                                return `{${indent6}${frameInfo},${indent6}${elementJson}${indent5}}${
                                    frameIdx === animation.frames.length - 1 ? "" : ","
                                }`
                            })
                            .join(indent5)
                        framesJson = `"frames": [${indent5}${framesJson}${indent4}]`

                        return `{${indent4}${animationInfo},${indent4}${framesJson}${indent3}}${
                            animationIdx === bank.animations.length - 1 ? "" : ","
                        }`
                    })
                    .join(indent3)
                animationsJson = `"animations": [${indent3}${animationsJson}${indent2}]`

                return `{${indent2}${bankName},${indent2}${animationsJson}${indent1}}${bankIdx === this.banks.length - 1 ? "" : ","}`
            })
            .join(indent1)
        bankJson = `"banks": [${indent1}${bankJson}\n]`

        return `{\n${animHead}, \n${bankJson} \n}`
    }

    parseJson(source: any) {
        Object.assign(this, source)
        this.banks = this.banks.map(bankJson => {
            const bank = new Bank()
            Object.assign(bank, bankJson)

            bank.animations = bank.animations.map(animationJson => {
                const animation = new Animation()
                Object.assign(animation, animationJson)

                animation.frames = animation.frames.map(frameJson => {
                    const frame = new AnimFrame()
                    Object.assign(frame, frameJson)

                    frame.elements = frame.elements.map(elementJson => {
                        const element = new AnimElement()
                        Object.assign(element, elementJson)
                        return element
                    })

                    return frame
                })

                return animation
            })
            bank.sort()

            return bank
        })
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

                const a = reader.readFloat32()
                const b = reader.readFloat32()
                const c = reader.readFloat32()
                const d = reader.readFloat32()
                const tx = reader.readFloat32()
                const ty = reader.readFloat32()
                const z = reader.readFloat32()

                const element = new AnimElement(zIndex, symbol, frame, layerName, a, b, c, d, tx, ty)
                animFrame.elements.push(element)
            }
            animFrame.sort()
        }
        animation.sort()
    }
    anim.banks.map(bank => bank.sort())

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
                    writer.writeUint32(element.frameNum)
                    writer.writeUint32(layerNameHash)
                    writer.writeFloat32(element.a)
                    writer.writeFloat32(element.b)
                    writer.writeFloat32(element.c)
                    writer.writeFloat32(element.d)
                    writer.writeFloat32(element.tx)
                    writer.writeFloat32(element.ty)
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
