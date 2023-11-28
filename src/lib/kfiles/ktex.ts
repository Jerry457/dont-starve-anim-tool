import dxt from "dxt-js"
import { flags } from "dxt-js"
import { newCanvas, resize, flipY, preMultiplyAlpha } from "../image-canvas"

import { BinaryDataReader, BinaryDataWriter } from "../binary-data"

export enum Platform {
    Default = 0, // unknown
    PC = 12,
    PS3 = 10,
    Xbox360 = 11,
}

export enum PixelFormat {
    DXT1 = 0,
    DXT3 = 1,
    DXT5 = 2,
    RGBA = 4,
    RGB = 5,
    UNKNOWN = 7,
}

export enum TextureType {
    oneD = 0,
    twoD = 1,
    threeD = 2,
    cubeMapped = 3,
}

export const Specifications = Object.freeze({
    PreCaveSpec: Object.freeze({
        maxPlatform: 8, // 3
        maxPixelFormat: 8, // 3
        maxTextureType: 8, // 3
        maxMipmapCount: 15, // 4
        maxFlags: 1, // 1
        maxFill: 262143, // 18

        offsetPlatform: 0n,
        offsetPixelFormat: 3n,
        offsetTextureType: 6n,
        offsetMipmapCount: 9n,
        offsetFlags: 14n,
        offsetFill: 15n,
    }),

    PostCaveSpec: Object.freeze({
        maxPlatform: 15, // 4
        maxPixelFormat: 31, // 5
        maxTextureType: 15, // 4
        maxMipmapCount: 31, // 5
        maxFlags: 3, // 2
        maxFill: 4095, // 12

        offsetPlatform: 0n,
        offsetPixelFormat: 4n,
        offsetTextureType: 9n,
        offsetMipmapCount: 13n,
        offsetFlags: 18n,
        offsetFill: 20n,
    }),
})

class KtexHeader {
    MAGIC = "KTEX"

    specification: typeof Specifications.PreCaveSpec | typeof Specifications.PostCaveSpec = Specifications.PostCaveSpec
    platform: Platform = Platform.Default
    pixelFormat: PixelFormat = PixelFormat.DXT5
    textureType: TextureType = TextureType.twoD
    mipmapCount: number = 0
    flags: number = this.specification.maxFlags
    fill: number = this.specification.maxFill

    setSpecification(
        platform: Platform,
        pixelFormat: PixelFormat,
        textureType: TextureType,
        flags: number,
        fill: number,
        specification: typeof Specifications.PreCaveSpec | typeof Specifications.PostCaveSpec = Specifications.PostCaveSpec
    ) {
        this.specification = specification

        this.platform = platform & specification.maxPlatform
        this.pixelFormat = pixelFormat & specification.maxPixelFormat
        this.textureType = textureType & specification.maxTextureType
        this.flags = flags & specification.maxFlags
        this.fill = fill & specification.maxFill
    }

    setSpecificationData(data: number) {
        /*
            This test has a false positive (for pre-caves update) if the input TEX is of the post-caves update variety,
            has both flags set to high, and has at least 30 mipmaps. This is considered unlikely enough to be reasonable
            (as it would likely result from an image with an initial size of 73,728 x 73,728) since there is no other way to check
            by oblivioncth
        */
        // fuck klei
        const bigData = BigInt(data)
        if (((bigData >> 14n) & 0x3ffffn) == 0x3ffffn) {
            this.specification = Specifications.PreCaveSpec
        } else {
            this.specification = Specifications.PostCaveSpec
        }
        const specification = this.specification

        this.platform = Number(bigData >> specification.offsetPlatform) & specification.maxPlatform
        this.pixelFormat = Number(bigData >> specification.offsetPixelFormat) & specification.maxPixelFormat
        this.textureType = Number(bigData >> specification.offsetTextureType) & specification.maxTextureType
        this.mipmapCount = Number(bigData >> specification.offsetMipmapCount) & specification.maxMipmapCount
        this.flags = Number(bigData >> specification.offsetFlags) & specification.maxFlags
        this.fill = Number(bigData >> specification.offsetFill) & specification.maxFill
    }

    getSpecificationData() {
        const specification = this.specification
        const data = Number(
            (BigInt(this.platform) << specification.offsetPlatform) |
                (BigInt(this.pixelFormat) << specification.offsetPixelFormat) |
                (BigInt(this.textureType) << specification.offsetTextureType) |
                (BigInt(this.mipmapCount) << specification.offsetMipmapCount) |
                (BigInt(this.flags) << specification.offsetFlags) |
                (BigInt(this.fill) << specification.offsetFill)
        )
        return data
    }
}

class KtexMipmap {
    width: number
    height: number
    data?: Uint8Array
    blockData?: Uint8Array
    pitch: number
    dataSize: number = 0

    constructor(width: number, height: number, data?: Uint8Array) {
        this.width = width
        this.height = height
        this.pitch = Math.floor((width + 3) / 4) * 16 // DXT5

        this.data = data
    }

    compress(pixelFormat: PixelFormat) {
        switch (pixelFormat) {
            case PixelFormat.DXT1:
                this.pitch = Math.floor((this.width + 3) / 4) * 8
            case PixelFormat.DXT3:
            case PixelFormat.DXT5:
                this.blockData = dxt.compress(this.data!, this.width, this.height, flags[PixelFormat[pixelFormat] as keyof flags])
                break
            case PixelFormat.RGB:
                this.pitch = this.width * 3
                this.blockData = this.data!
                break
            default: // PixelFormat.RGBA
                this.pitch = this.width * 4
                this.blockData = this.data!
        }
        this.dataSize = this.blockData.length
    }

    decompress(pixelFormat: PixelFormat) {
        switch (pixelFormat) {
            case PixelFormat.DXT1:
            case PixelFormat.DXT3:
            case PixelFormat.DXT5:
                this.data = dxt.decompress(this.blockData!, this.width, this.height, flags[PixelFormat[pixelFormat] as keyof flags])
                break
            default:
                this.data = this.blockData!
        }
    }

    getMetaData() {
        return [this.width, this.height, this.pitch, this.dataSize]
    }

    getBlockData() {
        return this.blockData!
    }
}

export class Ktex {
    name: string = ""

    preMultiplyAlpha?: boolean

    header: KtexHeader = new KtexHeader()

    mipmaps: KtexMipmap[] = []

    constructor(name: string = "") {
        this.name = name
    }

    readKtex(data: BinaryDataReader | ArrayBuffer) {
        const reader = data instanceof BinaryDataReader ? data : new BinaryDataReader(data)
        this.header.setSpecificationData(reader.readUint32(4))

        for (let i = 0; i < this.header.mipmapCount; i++) {
            const width = reader.readtHex()
            const height = reader.readtHex()
            const pitch = reader.readtHex()
            const dataSize = reader.readUint32()

            const mipmap = new KtexMipmap(width, height)
            mipmap.dataSize = dataSize
            this.mipmaps.push(mipmap)
        }

        for (const mipmap of this.mipmaps) {
            mipmap.blockData = reader.readBytes(mipmap.dataSize)
        }

        if (reader.buffer.byteLength - reader.cursor === 1) {
            this.preMultiplyAlpha = Boolean(reader.readByte())
        }
    }

    fromImage(canvas: HTMLCanvasElement, usePreMultiplyAlpha: boolean = true) {
        this.preMultiplyAlpha = usePreMultiplyAlpha

        canvas = preMultiplyAlpha(canvas)
        canvas = flipY(canvas)

        let width = canvas.width
        let height = canvas.height
        while ((width > 1 || height > 1) && this.mipmaps.length <= this.header.specification.maxMipmapCount) {
            const resized = resize(canvas, width, height)
            const mipmap = new KtexMipmap(
                width,
                height,
                new Uint8Array(resized.getContext("2d")!.getImageData(0, 0, resized.width, resized.height).data)
            )
            mipmap.compress(this.header.pixelFormat)
            this.mipmaps.push(mipmap)

            width = width > 1 ? Math.floor(width / 2) : width
            height = height > 1 ? Math.floor(height / 2) : height
        }
        this.header.mipmapCount = this.mipmaps.length
    }

    toImage(preMultiplyAlpha: boolean = true) {
        const mipmap = this.mipmaps[0]
        mipmap.decompress(this.header.pixelFormat)
        const mipmapData = mipmap.data!

        const hasAlpha = this.header.pixelFormat !== PixelFormat.RGB
        this.preMultiplyAlpha = preMultiplyAlpha && hasAlpha

        let canvas = newCanvas(mipmap.width, mipmap.height)
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        const channelNum = hasAlpha ? 4 : 3
        for (let i = 0; i < mipmapData.length; i += channelNum) {
            let [r, g, b] = mipmapData.slice(i, i + 3)
            const a = hasAlpha ? mipmapData[i + 3] : 255

            if (this.preMultiplyAlpha) {
                const alpha = a / 255
                r = Math.ceil(r / alpha)
                g = Math.ceil(g / alpha)
                b = Math.ceil(b / alpha)
            }

            const index = (i / channelNum) * 4
            data[index] = r
            data[index + 1] = g
            data[index + 2] = b
            data[index + 3] = a
        }
        ctx.putImageData(imageData, 0, 0)

        canvas = flipY(canvas)
        // document.body.appendChild(canvas)

        return canvas
    }

    compile() {
        const writer = new BinaryDataWriter()

        // write header
        writer.writeString(this.header.MAGIC)
        writer.writeUint32(this.header.getSpecificationData())

        // write mipmap metaData
        for (const mipmap of this.mipmaps) {
            const [width, height, pitch, dataSize] = mipmap.getMetaData()
            writer.writeHex(width)
            writer.writeHex(height)
            writer.writeHex(pitch)
            writer.writeUint32(dataSize)
        }

        // write mipmap blockData
        for (const mipmap of this.mipmaps) {
            writer.writeBytes(mipmap.getBlockData())
        }

        // write preMultiplyAlpha info
        writer.writeBytes(new Uint8Array([this.preMultiplyAlpha ? 1 : 0]))

        return writer.getBuffer()
    }
}
