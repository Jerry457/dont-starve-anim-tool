import dxt from "dxt-js"
import { flags } from "dxt-js"
import Image from "image-js"
import struct from "python-struct"

import { Buffer } from "buffer"

enum Platform {
    Default = 0, // Unknown
    PC = 12,
    PS3 = 10,
    Xbox360 = 11,
}

enum PixelFormat {
    DXT1 = 0,
    DXT3 = 1,
    DXT5 = 2,
    RGBA = 4,
    RGB = 5,
    Unknown = 7,
}

enum TextureType {
    OneD = 0,
    TwoD = 1,
    ThreeD = 2,
    CubeMapped = 3,
}

const Specifications = Object.freeze({
    PreCaveSpec: Object.freeze({
        max_platform: 8, // 3
        max_pixel_format: 8, // 3
        max_texture_type: 8, // 3
        max_mipmap_count: 15, // 4
        max_flags: 1, // 1
        max_fill: 262143, // 18

        offset_platform: 0n,
        offset_pixel_format: 3n,
        offset_texture_type: 6n,
        offset_mipmap_count: 9n,
        offset_flags: 14n,
        offset_fill: 15n,
    }),

    PostCaveSpec: Object.freeze({
        max_platform: 15, // 4
        max_pixel_format: 31, // 5
        max_texture_type: 15, // 4
        max_mipmap_count: 31, // 5
        max_flags: 3, // 2
        max_fill: 4095, // 12

        offset_platform: 0n,
        offset_pixel_format: 4n,
        offset_texture_type: 9n,
        offset_mipmap_count: 13n,
        offset_flags: 18n,
        offset_fill: 20n,
    }),
})

class KtexHeader {
    MAGIC_NUM = "KTEX"

    specification: typeof Specifications.PreCaveSpec | typeof Specifications.PostCaveSpec = Specifications.PostCaveSpec
    platform: Platform = Platform.Default
    pixel_format: PixelFormat = PixelFormat.DXT5
    texture_type: TextureType = TextureType.TwoD
    mipmap_count: number = 0
    flags: number = this.specification.max_flags
    fill: number = this.specification.max_fill

    set_specification(
        specification: typeof Specifications.PreCaveSpec | typeof Specifications.PostCaveSpec,
        platform: Platform,
        pixel_format: PixelFormat,
        texture_type: TextureType,
        flags: number,
        fill: number
    ) {
        this.specification = specification

        this.platform = platform & specification.max_platform
        this.pixel_format = pixel_format & specification.max_pixel_format
        this.texture_type = texture_type & specification.max_texture_type
        this.flags = flags & specification.max_flags
        this.fill = fill & specification.max_fill
    }

    set_specification_data(data: number) {
        /*
            This test has a false positive (for pre-caves update) if the input TEX is of the post-caves update variety,
            has both flags set to high, and has at least 30 mipmaps. This is considered unlikely enough to be reasonable
            (as it would likely result from an image with an initial size of 73,728 x 73,728) since there is no other way to check
            by oblivioncth
        */
        // fuck klei
        const big_data = BigInt(data)
        if (((big_data >> 14n) & 0x3ffffn) == 0x3ffffn) {
            this.specification = Specifications.PreCaveSpec
        } else {
            this.specification = Specifications.PostCaveSpec
        }
        const specification = this.specification

        this.platform = Number(big_data >> specification.offset_platform) & specification.max_platform
        this.pixel_format = Number(big_data >> specification.offset_pixel_format) & specification.max_pixel_format
        this.texture_type = Number(big_data >> specification.offset_texture_type) & specification.max_texture_type
        this.mipmap_count = Number(big_data >> specification.offset_mipmap_count) & specification.max_mipmap_count
        this.flags = Number(big_data >> specification.offset_flags) & specification.max_flags
        this.fill = Number(big_data >> specification.offset_fill) & specification.max_fill
    }

    get_data() {
        const specification = this.specification
        const data = Number(
            (BigInt(this.platform) << specification.offset_platform) |
                (BigInt(this.pixel_format) << specification.offset_pixel_format) |
                (BigInt(this.texture_type) << specification.offset_texture_type) |
                (BigInt(this.mipmap_count) << specification.offset_mipmap_count) |
                (BigInt(this.flags) << specification.offset_flags) |
                (BigInt(this.fill) << specification.offset_fill)
        )
        return struct.pack("<ccccI", ...this.MAGIC_NUM.split(""), data)
    }
}

class KtexMipmap {
    width: number
    height: number
    data?: Uint8Array
    block_data?: Uint8Array
    pitch: number
    data_size: number = 0

    constructor(width: number, height: number, data?: Uint8Array) {
        this.width = width
        this.height = height
        this.pitch = Math.floor((width + 3) / 4) * 16
        // Math.floor((width + 3) / 4) * (datafmt == "RGB" ? 3 : 4) * 4

        this.data = data
    }

    compress(pixel_format: PixelFormat) {
        switch (pixel_format) {
            case PixelFormat.DXT1:
            case PixelFormat.DXT3:
            case PixelFormat.DXT5:
                this.block_data = dxt.compress(this.data!, this.width, this.height, flags[PixelFormat[pixel_format] as keyof flags])
                break
            default:
                this.block_data = this.data!
        }
        this.data_size = this.block_data.length
    }

    decompress(pixel_format: PixelFormat) {
        switch (pixel_format) {
            case PixelFormat.DXT1:
            case PixelFormat.DXT3:
            case PixelFormat.DXT5:
                this.data = dxt.decompress(this.block_data!, this.width, this.height, flags[PixelFormat[pixel_format] as keyof flags])
                break
            default:
                this.data = this.block_data!
        }
    }

    get_meta_data() {
        return struct.pack("<HHHI", this.width, this.height, this.pitch, this.data_size)
    }

    get_block_data() {
        return this.block_data!
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

    read_tex(buff: Buffer) {
        this.header.set_specification_data(struct.unpack("<I", buff.subarray(4, 8))[0] as number)

        let offset = 8
        for (let i = 0; i < this.header.mipmap_count; i++) {
            const [width, height, pitch, data_size] = struct.unpack("<HHHI", buff.subarray(offset, offset + 10)) as number[]
            const mipmap = new KtexMipmap(width, height)
            mipmap.data_size = data_size
            this.mipmaps.push(mipmap)

            offset += 10
        }

        for (const mipmap of this.mipmaps) {
            mipmap.block_data = new Uint8Array(buff.subarray(offset, offset + mipmap.data_size))
            offset += mipmap.data_size
        }

        if (buff.length - offset === 1) {
            this.preMultiplyAlpha = Boolean(buff[offset])
        }
    }

    from_image(image: Image, preMultiplyAlpha: boolean = true) {
        this.preMultiplyAlpha = Boolean(image.alpha) && preMultiplyAlpha

        if (preMultiplyAlpha) {
            for (let i = 0; i < image.data.length; i += 4) {
                let [r, g, b, a] = image.data.slice(i, i + 4)

                const alpha = a / 255
                r = Math.floor(r * alpha)
                g = Math.floor(g * alpha)
                b = Math.floor(b * alpha)

                image.data[i] = r
                image.data[i + 1] = g
                image.data[i + 2] = b
                image.data[i + 3] = a
            }
        }
        image.flipY()

        let width = image.width
        let height = image.height
        while ((width > 1 || height > 1) && this.mipmaps.length <= this.header.specification.max_mipmap_count) {
            const resized = image.resize({ width: width, height: height })
            const mipmap = new KtexMipmap(width, height, new Uint8Array(resized.data))
            mipmap.compress(this.header.pixel_format)
            this.mipmaps.push(mipmap)

            width = width > 1 ? Math.floor(width / 2) : width
            height = height > 1 ? Math.floor(height / 2) : height

            break
        }
        this.header.mipmap_count = this.mipmaps.length
    }

    async to_image(preMultiplyAlpha: boolean = true) {
        const mipmap = this.mipmaps[0]
        mipmap.decompress(this.header.pixel_format)

        const hasAlpha = this.header.pixel_format !== PixelFormat.RGB
        this.preMultiplyAlpha = preMultiplyAlpha && hasAlpha
        const channelNum = hasAlpha ? 4 : 3
        const image = new Image(mipmap.width, mipmap.height, { alpha: 1 })
        const width = image.width
        const height = image.height
        const data = mipmap.data!
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const i = (y * width + x) * channelNum
                let r = data[i]
                let g = data[i + 1]
                let b = data[i + 2]
                const a = hasAlpha ? data[i + 3] : 255

                if (this.preMultiplyAlpha) {
                    const alpha = a / 255
                    r = Math.min(Math.ceil(r / alpha), 255)
                    g = Math.min(Math.ceil(g / alpha), 255)
                    b = Math.min(Math.ceil(b / alpha), 255)
                }
                image.setPixelXY(x, y, [r, g, b, a])
            }
        }
        image.flipY()

        return image
    }

    get_file(name?: string) {
        let content = this.header.get_data()

        for (const mipmap of this.mipmaps) {
            content = Buffer.concat([content, mipmap.get_meta_data()])
        }
        for (const mipmap of this.mipmaps) {
            content = Buffer.concat([content, mipmap.get_block_data()])
        }
        content = Buffer.concat([content, new Uint8Array([this.preMultiplyAlpha ? 1 : 0])])

        const blob = new Blob([content])
        const downloadLink = document.createElement("a")
        downloadLink.href = URL.createObjectURL(blob)
        downloadLink.download = name || `${this.name}.tex`
        downloadLink.click()
        URL.revokeObjectURL(downloadLink.href)
    }
}
