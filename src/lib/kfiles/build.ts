import { strHash } from "./util"
import { BinaryDataReader, BinaryDataWriter } from "../binary-data"
import { newCanvas, resize, crop, paste } from "../image-canvas"
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
    xOffset: number
    yOffset: number
    vertIdx: number
    vertNum: number

    name: string
    canvas?: HTMLCanvasElement

    constructor(frameNum = 0, duration = 0, x = 0, y = 0, w = 1, h = 1, vertIdx = 0, vertNum = 0, name: string = "") {
        this.frameNum = frameNum
        this.duration = duration
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.vertIdx = vertIdx
        this.vertNum = vertNum
        this.name = name

        this.xOffset = x - Math.floor(w / 2)
        this.yOffset = y - Math.floor(h / 2)
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
        this.frames.sort((a, b) => a.frameNum - b.frameNum)
    }

    getSubRow() {
        return this.frames
    }

    getFrame(frameNum: number, getDuration: boolean = true) {
        for (const frame of this.frames) {
            const duration = getDuration ? frame.duration - 1 : 0
            if (frame.frameNum <= frameNum && frameNum <= frame.frameNum + duration) {
                return frame
            }
        }
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
    verts: Vert[] = []

    constructor(name: string = "", symbols: BuildSymbol[] = []) {
        this.name = name.toLowerCase()
        this.symbols = symbols
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

    getSubRow() {
        return this.symbols
    }

    getSymbol(name: string) {
        for (const symbol of this.symbols) {
            if (symbol.name === name) return symbol
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
                frame.vertIdx = 0
                frame.vertNum = 0
                if (!frame.canvas) continue

                const [opaqueRegions, alphaRegions] = getRegion(frame.canvas)
                const regions = [...opaqueRegions, ...alphaRegions]

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
        this.verts = []
        for (const { frame, regions, regionsLeft, regionsTop, insertBBox } of blocks) {
            frame.vertIdx = this.verts.length
            frame.vertNum = regions.length * 6
            for (const region of regions) {
                const regionLeft = frame.xOffset + region.x
                const regionRight = regionLeft + region.w
                const regionTop = frame.yOffset + region.y
                const regionBottom = regionTop + region.h

                const regionInsertLeft = insertBBox!.x + region.x - regionsLeft
                const regionInsertRight = regionInsertLeft + region.w
                const regionInsertTop = insertBBox!.y + region.y - regionsTop
                const regionInsertBottom = regionInsertTop + region.h

                const uMin = clamp(regionInsertLeft / atlas.width, 0, 1)
                const uMax = clamp(regionInsertRight / atlas.width, 0, 1)
                const vMin = clamp(1 - regionInsertTop / atlas.height, 0, 1)
                const vMax = clamp(1 - regionInsertBottom / atlas.height, 0, 1)

                this.verts.push(new Vert(regionLeft, regionTop, 0, uMin, vMin, atlasIdx))
                this.verts.push(new Vert(regionRight, regionTop, 0, uMax, vMin, atlasIdx))
                this.verts.push(new Vert(regionLeft, regionBottom, 0, uMin, vMax, atlasIdx))
                this.verts.push(new Vert(regionRight, regionTop, 0, uMax, vMin, atlasIdx))
                this.verts.push(new Vert(regionRight, regionBottom, 0, uMax, vMax, atlasIdx))
                this.verts.push(new Vert(regionLeft, regionBottom, 0, uMin, vMax, atlasIdx))
            }
        }
        if (this.scale !== 1) atlas = resize(atlas, atlas.width * this.scale, atlas.height * this.scale)

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
                if (frame.vertNum === 0) continue
                else if (frame.vertNum % 6 !== 0) {
                    const errorMessage = "vert num error"
                    alert(errorMessage)
                    throw Error(errorMessage)
                }
                const frameVerts = this.verts.slice(frame.vertIdx, frame.vertIdx + frame.vertNum)

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

                const regionX = Math.round(regionLeft - frame.xOffset)
                const regionY = Math.round(regionTop - frame.yOffset)
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
                        console.log(`Build: ${this.name}, Symbol: ${frame.name} data error, this maybe scml file image width or height error`)
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

    async getSpitAtlas(callback: (blob: Blob, symbolName: string, frameName: string) => void) {
        const promises = []
        for (const symbol of this.symbols) {
            for (const frame of symbol.frames) {
                promises.push(
                    new Promise<Blob>(resolve => {
                        frame.canvas?.toBlob(
                            blob => {
                                callback(blob!, symbol.name, frame.name)
                                resolve(blob!)
                            },
                            "image/png",
                            1
                        )
                    })
                )
            }
        }
        return await Promise.all(promises)
    }
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
    for (let vertIdx = 0; vertIdx < vertsNum; vertIdx++) {
        const x = reader.readFloat32()
        const y = reader.readFloat32()
        const z = reader.readFloat32()
        const u = reader.readFloat32()
        const v = reader.readFloat32()
        const w = reader.readFloat32()

        build.verts.push(new Vert(x, y, z, u, v, w))
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

            symbol.frames.push(new BuildFrame(frameNum, duration, x, y, w, h, vertIdx, vertNum, `${symbolName}-${frameNum}`))
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
    hashs.sort((a, b) => a - b)
    for (const hash of hashs) {
        const str = hashMap.get(hash)!
        const symbol = symbolMap[str]
        writer.writeUint32(hash)
        writer.writeUint32(symbol.frames.length)

        // write frame info
        for (const frame of symbol.frames) {
            writer.writeUint32(frame.frameNum)
            writer.writeUint32(frame.duration)
            writer.writeFloat32(frame.x)
            writer.writeFloat32(frame.y)
            writer.writeFloat32(frame.w)
            writer.writeFloat32(frame.h)
            writer.writeUint32(frame.vertIdx)
            writer.writeUint32(frame.vertNum)
        }
    }

    // write vert info
    writer.writeUint32(build.verts.length)
    for (const vert of build.verts) {
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
