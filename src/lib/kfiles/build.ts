import stringify from "json-stringify-pretty-compact"

import { strHash } from "./util"
import { BinaryDataReader, BinaryDataWriter } from "../binary-data"
import { newCanvas, resize, crop, paste, toBlob } from "../image-canvas"
import { getRegion } from "../image-canvas/analyze"
import { pack } from "../image-canvas/packer"
import { bbox } from "../image-canvas/type"
import { clamp } from "../math"
import { Ktex } from "./ktex"

export class BuildFrame {
    frameNum: number
    duration: number
    x: number
    y: number
    w: number
    h: number

    verts: Vert[] = []

    canvas?: HTMLCanvasElement

    constructor(frameNum = 0, duration = 0, x = 0, y = 0, w = 1, h = 1) {
        this.frameNum = frameNum
        this.duration = duration
        this.x = x
        this.y = y
        this.w = w
        this.h = h
    }

    getRelativePivot() {
        /**
         * Return transform-origin relative coordinates
         * The coordinate system has its origin at the bottom-left corner of the image
         * the positive x-axis extending to the right and the positive y-axis extending upwards.
         */
        const pivotX = 0.5 - this.x / this.w
        const pivotY = 0.5 + this.y / this.h

        return [pivotX, pivotY]
    }

    setAbsolutePivot(pivotX: number, pivotY: number) {
        /**
         * Return transform-origin absolute coordinates
         * The coordinate system has its origin at the image center
         * the positive x-axis extending to the left and the positive y-axis extending upwards.
         */
        this.x = Math.floor(this.w / 2) - pivotX * this.w
        this.y = -Math.floor(this.w / 2) + pivotY * this.h
    }

    getSubRows = undefined
}

export class BuildSymbol {
    name: string
    frames: BuildFrame[]

    constructor(name: string = "", frames: BuildFrame[] = []) {
        this.name = name
        this.frames = frames

        this.sort()
    }

    sort() {
        this.frames.sort((a, b) => a.frameNum - b.frameNum)
    }

    getSubRows() {
        return this.frames
    }

    getFrame(frameNum: number, getDuration: boolean = true): [BuildFrame, number] | undefined {
        for (const [index, frame] of this.frames.entries()) {
            const duration = getDuration ? frame.duration - 1 : 0
            if (frame.frameNum <= frameNum && frameNum <= frame.frameNum + duration) {
                return [frame, index]
            }
        }
    }

    addNewFrame() {
        const frameNum = this.frames.length ? this.frames[this.frames.length - 1].frameNum + this.frames[this.frames.length - 1].duration : 0
        const frame = new BuildFrame(frameNum)
        this.frames.push(frame)
        return frame
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

export class Atlas {
    name: string
    ktex?: Ktex

    constructor(name: string, ktex?: Ktex) {
        this.name = name
        this.ktex = ktex
    }
}

export class Build {
    version = 6
    scale = 1
    type = "Build"

    name: string
    symbols: BuildSymbol[]

    atlases: Atlas[] = []

    constructor(name: string = "", symbols: BuildSymbol[] = []) {
        this.name = name
        this.symbols = symbols
    }

    jsonStringify(indent: number = 4) {
        const indent1 = `\n${" ".repeat(indent)}`
        const indent2 = `\n${" ".repeat(indent * 2)}`
        const indent3 = `\n${" ".repeat(indent * 3)}`

        const buildHead = `"type": "${this.type}", "version": ${this.version}`
        const buildInfo = `"name": "${this.name}", "sclae": ${this.scale}`
        const atlasJSON = `"atlases": ${stringify(this.atlases, {
            replacer: (key, value) => (key === "ktex" ? undefined : value),
            indent,
            maxLength: 30,
        })}`

        const verts: Vert[] = []
        let symbolsJson = this.symbols
            .map((symbol, symbolIdx) => {
                const symbolName = `"name": "${symbol.name}"`
                let framesJson = symbol.frames
                    .map((frame, idx) => {
                        verts.push(...frame.verts)

                        const _frame: any = frame
                        _frame.vertIdx = verts.length
                        _frame.vertNum = frame.verts.length

                        const frameJson = stringify(_frame, {
                            replacer: (key, value) => (key === "canvas" || key === "name" || key === "verts" ? undefined : value),
                            maxLength: Infinity,
                        })

                        delete _frame.vertIdx
                        delete _frame.vertNum

                        return `${frameJson}${idx === symbol.frames.length - 1 ? "" : ","}`
                    })
                    .join(indent3)
                framesJson = `"frames": [${indent3}${framesJson}${indent2}]`
                return `{${indent2}${symbolName},${indent2}${framesJson}${indent1}}${symbolIdx === this.symbols.length - 1 ? "" : ","}`
            })
            .join(indent1)
        symbolsJson = `"symbols": [${indent1}${symbolsJson}\n]`

        let vertsJson = verts
            .map((vert, idx) => {
                const vertJson = stringify(vert, { maxLength: Infinity })
                return `${vertJson}${idx === verts.length - 1 ? "" : ","}`
            })
            .join(`${indent1}`)
        vertsJson = `"verts": [${indent1}${vertsJson}\n]`

        return `{\n${buildHead},\n${buildInfo},\n${atlasJSON},\n${symbolsJson},\n${vertsJson}\n}`
    }

    parseJson(source: any) {
        Object.assign(this, source)
        this.symbols = this.symbols.map(symbolJson => {
            const symbol = new BuildSymbol()
            Object.assign(symbol, symbolJson)

            symbol.frames = symbol.frames.map(frameJson => {
                const frame = new BuildFrame()
                Object.assign(frame, frameJson)

                return frame
            })

            return symbol
        })
    }

    getSubRows() {
        return this.symbols
    }

    getSymbol(name: string): [BuildSymbol, number] | undefined {
        for (const [index, symbol] of this.symbols.entries()) {
            if (symbol.name.toLowerCase() === name.toLowerCase()) return [symbol, index]
        }
    }

    getAtlasSubRow() {
        return this.atlases ? this.atlases?.map(atlas => ({ data: atlas })) : []
    }

    hasAtlas() {
        for (const atlas of this.atlases) {
            if (!atlas.ktex) return false
        }
        return true
    }

    packAtlas() {
        const blocks: {
            canvas: HTMLCanvasElement
            frame: BuildFrame
            regions: bbox[]
            regionsLeft: number
            regionsTop: number
            insertBBox?: bbox
        }[] = []
        for (const symbol of this.symbols) {
            for (const frame of symbol.frames) {
                frame.verts = []
                if (!frame.canvas) continue

                const [opaqueRegions, alphaRegions] = getRegion(frame.canvas)
                const regions = [...alphaRegions, ...opaqueRegions]

                if (regions.length === 0) continue

                let regionsLeft = Infinity
                let regionsRight = -Infinity
                let regionsTop = Infinity
                let regionsBottom = -Infinity
                for (const region of regions) {
                    const { x, y, w, h } = region
                    regionsLeft = Math.min(regionsLeft, x)
                    regionsRight = Math.max(regionsRight, x + w)
                    regionsTop = Math.min(regionsTop, y)
                    regionsBottom = Math.max(regionsBottom, y + h)
                }
                const w = Math.round(regionsRight - regionsLeft)
                const h = Math.round(regionsBottom - regionsTop)

                let canvas = crop(frame.canvas, regionsLeft, regionsTop, w, h)

                blocks.push({ canvas, frame, regions, regionsLeft, regionsTop })
            }
        }
        let atlas = pack(blocks)
        const atlasIdx = 0

        for (const { frame, regions, regionsLeft, regionsTop, insertBBox } of blocks) {
            frame.verts = []

            const xOffset = frame.x - Math.floor(frame.w / 2)
            const yOffset = frame.y - Math.floor(frame.h / 2)
            for (const region of regions) {
                const regionLeft = xOffset + region.x
                const regionRight = regionLeft + region.w
                const regionTop = yOffset + region.y
                const regionBottom = regionTop + region.h

                const regionInsertLeft = insertBBox!.x + region.x - regionsLeft
                const regionInsertRight = regionInsertLeft + region.w
                const regionInsertTop = insertBBox!.y + region.y - regionsTop
                const regionInsertBottom = regionInsertTop + region.h

                // debug
                // const ctx = atlas.getContext("2d")!
                // ctx.strokeStyle = "red"
                // ctx.strokeRect(regionInsertLeft, regionInsertTop, region.w, region.h)

                const uMin = clamp(regionInsertLeft / atlas.width, 0, 1)
                const uMax = clamp(regionInsertRight / atlas.width, 0, 1)
                const vMin = clamp(1 - regionInsertTop / atlas.height, 0, 1)
                const vMax = clamp(1 - regionInsertBottom / atlas.height, 0, 1)

                frame.verts.push(new Vert(regionLeft, regionTop, 0, uMin, vMin, atlasIdx))
                frame.verts.push(new Vert(regionRight, regionTop, 0, uMax, vMin, atlasIdx))
                frame.verts.push(new Vert(regionLeft, regionBottom, 0, uMin, vMax, atlasIdx))
                frame.verts.push(new Vert(regionRight, regionTop, 0, uMax, vMin, atlasIdx))
                frame.verts.push(new Vert(regionRight, regionBottom, 0, uMax, vMax, atlasIdx))
                frame.verts.push(new Vert(regionLeft, regionBottom, 0, uMin, vMax, atlasIdx))
            }
        }

        // debug
        // document.body.appendChild(atlas)
        this.scale = 1

        const ktex = new Ktex("atlas-0.tex")
        ktex.fromImage(atlas)
        this.atlases = [new Atlas("atlas-0.tex", ktex)]
    }

    async splitAtlas(atlases: { [atlasName: string]: Ktex }) {
        if (this.atlases.length === 0) {
            return
        }
        this.atlases.map(atlas => (atlas.ktex = atlases[atlas.name]))
        const canvasAtlases = []
        for (const atlas of this.atlases) {
            if (atlas.ktex) canvasAtlases.push(atlas.ktex!.toImage())
            else return
        }

        let scaledSize = 0
        let originSize = 0

        for (const symbol of this.symbols) {
            for (const frame of symbol.frames) {
                // if (!frame.vertNum) continue
                // else if (frame.vertNum % 6 !== 0) {
                //     const errorMessage = "vert num error"
                //     alert(errorMessage)
                //     throw Error(errorMessage)
                // }
                const frameVerts = frame.verts
                if (!frameVerts) continue

                const xOffset = frame.x - Math.floor(frame.w / 2)
                const yOffset = frame.y - Math.floor(frame.h / 2)

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

                const atlas = canvasAtlases[frameVerts[0].w]

                const bboxX = Math.round(uMin * atlas.width)
                const bboxY = Math.round((1 - vMax) * atlas.height)
                const bboxW = Math.round((uMax - uMin) * atlas.width)
                const bboxH = Math.round((vMax - vMin) * atlas.height)

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
                    scaledSize = cropped.width * cropped.height
                    originSize = regionW * regionH

                    cropped = resize(cropped, regionW, regionH)
                }
                if (cropped.width !== frame.w || cropped.height !== frame.h) {
                    let _w = regionX + cropped.width
                    let _h = regionY + cropped.height
                    if (_w <= 0 || _w > frame.w || _h <= 0 || _h > frame.h) {
                        console.log(
                            `Build: ${this.name}, Symbol: ${symbol.name}-${frame.frameNum} data error, this maybe scml file image width or height error`
                        )
                        // const [pivotX, pivotY] = frame.getRelativePivot() // get pivot
                        // frame.w = cropped.width
                        // frame.h = cropped.height
                        // frame.setAbsolutePivot(pivotX, pivotY) // recalculate data
                    } else {
                        const image = newCanvas(frame.w, frame.h)
                        cropped = paste(image, cropped, regionX, regionY)
                    }
                }
                frame.canvas = cropped

                // document.body.appendChild(newCanvas(cropped.width, cropped.height, cropped))
            }
        }

        if (originSize > 0) {
            this.scale = Math.sqrt(scaledSize / originSize)
        }
    }

    async getSplitAtlas() {
        const results: { data: Blob; name: string; path: string }[] = []

        for (const symbol of this.symbols) {
            for (const frame of symbol.frames) {
                if (!frame.canvas) continue
                const blob = await toBlob(frame.canvas)
                if (blob) results.push({ data: blob, name: `${symbol.name}-${frame.frameNum}.png`, path: symbol.name })
            }
        }
        return results
    }
}

export function mergeBuild(builds: Build[], mergeBiuldName: string = "") {
    mergeBiuldName = mergeBiuldName === "" ? builds[0].name : mergeBiuldName

    const mergedBiuld = new Build(mergeBiuldName, [])
    for (const build of builds) {
        mergedBiuld.symbols.push(...build.symbols)
    }

    return mergedBiuld
}

export async function decompileBuild(data: BinaryDataReader | ArrayBuffer) {
    const build = new Build()

    const reader = data instanceof BinaryDataReader ? data : new BinaryDataReader(data)
    // Skip 'BUID' and version info
    reader.cursor = 8

    const symbolNum = reader.readUint32()
    const buildNameLen = reader.readInt32(16)
    build.name = reader.readString(buildNameLen)

    const atlasNum = reader.readUint32()

    if (atlasNum > 3) {
        alert(`Waring! ${build.name} atlas more than 3`)
    }

    // read atlas info
    for (let atlasIdx = 0; atlasIdx < atlasNum; atlasIdx++) {
        const atlasNameLen = reader.readUint32()
        const atlasName = reader.readString(atlasNameLen)

        build.atlases.push(new Atlas(atlasName))
    }

    // Skip symbol info
    const symbolOffset = reader.cursor
    for (let symbolIdx = 0; symbolIdx < symbolNum; symbolIdx++) {
        const framesCont = reader.readUint32(reader.cursor + 4) // Skip symbolNameHash

        // Skip 8 uint32
        reader.cursor += framesCont * 4 * 8
    }

    // read vert info
    const vertsNum = reader.readUint32()
    const verts = []
    for (let vertIdx = 0; vertIdx < vertsNum; vertIdx++) {
        const x = reader.readFloat32()
        const y = reader.readFloat32()
        const z = reader.readFloat32()
        const u = reader.readFloat32()
        const v = reader.readFloat32()
        const w = reader.readFloat32()

        verts.push(new Vert(x, y, z, u, v, w))
    }

    const hashNum = reader.readUint32()
    const hashMap = new Map<number, string>()
    for (let hashIdx = 0; hashIdx < hashNum; hashIdx++) {
        const hash = reader.readUint32()
        const strlen = reader.readInt32()
        const str = reader.readString(strlen)
        hashMap.set(hash, str)
    }

    reader.cursor = symbolOffset
    for (let symbolIdx = 0; symbolIdx < symbolNum; symbolIdx++) {
        const symbolNameHash = reader.readUint32()
        const framesCont = reader.readUint32()

        const symbolName = hashMap.get(symbolNameHash)
        const symbol = new BuildSymbol(symbolName)
        for (let frameIdx = 0; frameIdx < framesCont; frameIdx++) {
            const frameNum = reader.readUint32()
            const duration = reader.readUint32()
            const x = reader.readFloat32()
            const y = reader.readFloat32()
            const w = reader.readFloat32()
            const h = reader.readFloat32()
            const vertIdx = reader.readUint32()
            const vertNum = reader.readUint32()

            const frame = new BuildFrame(frameNum, duration, x, y, w, h)
            frame.verts = verts.slice(vertIdx, vertIdx + vertNum)
            symbol.frames.push(frame)
        }
        symbol.sort()
        build.symbols.push(symbol)
    }

    return build
}

export async function compileBuild(build: Build) {
    const hashs: number[] = []
    const hashMap: Map<number, string> = new Map()
    const writer = new BinaryDataWriter()

    let frameNum = 0
    const symbolMap: { [key: string]: BuildSymbol } = {}
    for (const symbol of build.symbols) {
        frameNum += symbol.frames.length
        const hash = strHash(symbol.name)

        hashs.push(strHash(symbol.name))
        hashMap.set(hash, symbol.name)
        symbolMap[symbol.name] = symbol
    }

    // write head
    writer.writeString("BILD")
    writer.writeInt32(build.version)

    // write build info
    writer.writeUint32(build.symbols.length)
    writer.writeUint32(frameNum)
    writer.writeInt32(build.name.length)
    writer.writeString(build.name)

    // write atlases info
    writer.writeUint32(build.atlases.length)
    for (const atlas of build.atlases) {
        writer.writeInt32(atlas.name.length)
        writer.writeString(atlas.name)
    }

    // write symbol info
    const verts = []
    hashs.sort((a, b) => a - b)
    for (const hash of hashs) {
        const str = hashMap.get(hash)!
        const symbol = symbolMap[str]
        writer.writeUint32(hash)
        writer.writeUint32(symbol.frames.length)

        // write frame info
        symbol.sort()
        for (const frame of symbol.frames) {
            writer.writeUint32(Math.floor(frame.frameNum))
            writer.writeUint32(Math.floor(frame.duration))
            writer.writeFloat32(frame.x)
            writer.writeFloat32(frame.y)
            writer.writeFloat32(frame.w)
            writer.writeFloat32(frame.h)

            const vertIdx = verts.length
            const vertNum = frame.verts.length
            verts.push(...frame.verts)

            writer.writeUint32(Math.floor(vertIdx))
            writer.writeUint32(Math.floor(vertNum))
        }
    }

    // write vert info
    writer.writeUint32(verts.length)
    for (const vert of verts) {
        writer.writeFloat32(vert.x)
        writer.writeFloat32(vert.y)
        writer.writeFloat32(vert.z)
        writer.writeFloat32(vert.u)
        writer.writeFloat32(vert.v)
        writer.writeFloat32(vert.w)
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
