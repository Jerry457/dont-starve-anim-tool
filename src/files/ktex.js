import {resize, flipped, premultiply_alpha, combine_array} from "./util.js"
import struct from "python-struct"
import dxt from "dxt-js"

function invert(obj) {
    const ret = {}
    for (const [key, value] of Object.entries(obj)) {
        ret[value] = key
    }
    return ret
}

const Platform = {
    Default: 0,  // Unknown
    PC: 12,
    PS3: 10,
    Xbox360: 11,
}


const PixelFormat = {
    DXT1: 0,
    DXT3: 1,
    DXT5: 2,
    RGBA: 4,
    RGB: 5,
    Unknown: 7,
}

const PixelFormatInvert = invert(PixelFormat)

const TextureType = {
    OneD: 0,
    TwoD: 1,
    ThreeD: 2,
    CubeMapped: 3,
}

const Specifications = {
    PreCaveSpec: {
        platform: 8,  // 3
        pixel_format: 8,  // 3
        texture_type: 8,  // 3
        mipmap_count: 15,  // 4
        flags: 1,  // 1
        fill: 262143,  // 18

        offset_platform: 0n,
        offset_pixel_format: 3n,
        offset_texture_type: 6n,
        offset_mipmap_count: 9n,
        offset_flags: 14n,
        offset_fill: 15n
    },
    PostCaveSpec: {
        platform: 15,  // 4
        pixel_format: 31,  // 5
        texture_type: 15,  // 4
        mipmap_count: 31,  // 5
        flags: 3,  // 2
        fill: 4095,  // 12

        offset_platform: 0n,
        offset_pixel_format: 4n,
        offset_texture_type: 9n,
        offset_mipmap_count: 13n,
        offset_flags: 18n,
        offset_fill: 20n
    }
}

class KtexHeader {
    MAGIC_NUM = "KTEX"

    specification = Specifications.PostCaveSpec
    platform = Platform.Default
    pixel_format = PixelFormat.DXT5
    texture_type = TextureType.TwoD
    mipmap_count = 0
    flags = this.specification.flags
    fill = this.specification.fill

    set_specification(specification, platform, pixel_format, texture_type, flags, fill) {
        this.specification = specification

        if (platform && pixel_format && texture_type && flags && fill) {
            this.platform = platform & specification.platform
            this.pixel_format = pixel_format & specification.pixel_format
            this.texture_type = texture_type & specification.texture_type
            this.flags = flags & specification.flags
            this.fill = fill & specification.fill
        }
    }

    set_specification_data(data) {
        /*
            This test has a false positive (for pre-caves update) if the input TEX is of the post-caves update variety,
            has both flags set to high, and has at least 30 mipmaps. This is considered unlikely enough to be reasonable
            (as it would likely result from an image with an initial size of 73,728 x 73,728) since there is no other way to check
            by oblivioncth
        */
        // fuck klei
        data = BigInt(data)
        if ( (data >> 14n & 0x3FFFFn) == 0x3FFFFn ) {
            this.specification = Specifications.PreCaveSpec
        } else {
            this.specification = Specifications.PostCaveSpec
        }
        const specification = this.specification

        this.platform = Number(data >> specification.offset_platform) & specification.platform
        this.pixel_format = Number(data >> specification.offset_pixel_format) & specification.pixel_format
        this.texture_type = Number(data >> specification.offset_texture_type) & specification.texture_type
        this.mipmap_count = Number(data >> specification.offset_mipmap_count) & specification.mipmap_count
        this.flags = Number(data >> specification.offset_flags) & specification.flags
        this.fill = Number(data >> specification.offset_fill) & specification.fill
    }

    get_data() {
        const specification = this.specification
        const data = Number(
            BigInt(this.platform) << specification.offset_platform |
            BigInt(this.pixel_format) << specification.offset_pixel_format |
            BigInt(this.texture_type) << specification.offset_texture_type |
            BigInt(this.mipmap_count) << specification.offset_mipmap_count |
            BigInt(this.flags) << specification.offset_flags |
            BigInt(this.fill) << specification.offset_fill
        )
        return struct.pack("<ccccI", "K", "T", "E", "X", data)
    }
}

class KtexMipmap {
    width
    height
    data
    pitch
    block_data
    data_size

    constructor(width, height, context, pixel_format) {
        this.width = width
        this.height = height
        this.pitch = Math.floor((width + 3) / 4) * 16

        if (context) {
            this.data = new Uint8Array(context.getImageData(0, 0, width, height).data.buffer)
        }

        if (pixel_format) {
            this.compress(pixel_format)
        }
    }

    compress(pixel_format) {
        switch(pixel_format) {
            case PixelFormat.DXT1:
            case PixelFormat.DXT3:
            case PixelFormat.DXT5:
                this.block_data = dxt.compress(this.data, this.width, this.height, dxt.flags[PixelFormatInvert[pixel_format]])
                break
            default:
                this.block_data = new Uint8Array(this.data.buffer)
        }
        this.data_size = this.block_data.length
    }

    decompress(pixel_format) {
        switch(pixel_format) {
            case PixelFormat.DXT1:
            case PixelFormat.DXT3:
            case PixelFormat.DXT5:
                this.data = dxt.decompress(this.block_data, this.width, this.height, dxt.flags[PixelFormatInvert[pixel_format]])
                break
            default:
                this.data = new Uint8Array(this.block_data.buffer)
        }
    }

    get_meta_data() {
        return struct.pack("<HHHI", this.width, this.height, this.pitch, this.data_size)
    }

    get_block_data() {
        return this.block_data
    }
}

export class Ktex {
    header = new KtexHeader()
    premultiply_alpha = true
    mipmaps = []

    constructor(file_name) {
        this.file_name = file_name
    }

    read_tex(buff) {
        this.header.set_specification_data(struct.unpack("<I", buff.subarray(4, 8)))

        let offset = 8
        for (let i = 0; i < this.header.mipmap_count; i++) {
            const [width, height, pitch, data_size] = struct.unpack("<HHHI", buff.subarray(offset, offset + 10))
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
            this.premultiply_alpha = Boolean(buff[offset])
        }
    }

    from_image(image, pre_alpha=true) {
        const canvas = document.createElement("canvas", {alpha: true})
        const context = canvas.getContext("2d")
        canvas.width = image.width
        canvas.height = image.height
        context.drawImage(image, 0, 0)

        this.premultiply_alpha = pre_alpha
        if (pre_alpha) {
            premultiply_alpha(canvas)
        }

        const flipped_canvas = flipped(canvas)

        this.mipmaps.push(new KtexMipmap(flipped_canvas.width, flipped_canvas.height, flipped_context, this.header.pixel_format))

        let width = flipped_canvas.width
        let height = flipped_canvas.height
        while ((width > 1 || height > 1) && this.mipmaps.length <= this.header.specification.mipmap_count) {
            width = width > 1 ? Math.floor(width / 2) : width
            height = height > 1 ? Math.floor(height / 2) : height

            const resized_canvas = resize(flipped_canvas, width, height)

            this.mipmaps.push(new KtexMipmap(resized_canvas.width, resized_canvas.height, resized_context, this.header.pixel_format))
        }
        this.header.mipmap_count = this.mipmaps.length
    }

    to_image() {
        const mipmap = this.mipmaps[0]
        mipmap.decompress(this.header.pixel_format)

        const canvas = document.createElement("canvas", {alpha: true,})
        const context = canvas.getContext("2d")
        canvas.width = mipmap.width
        canvas.height = mipmap.height

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const image_data = imageData.data

        if (this.header.pixel_format === PixelFormat.RGB) {
            for (let i = 0; i < mipmap.data.length; i += 3) {
                image_data[i] = mipmap.data[i]
                image_data[i + 1] = mipmap.data[i + 1]
                image_data[i + 2] = mipmap.data[i + 2]
            }
        }
        else if (!this.premultiply_alpha) {
            for (let i = 0; i < mipmap.data.length; i += 4) {
                image_data[i] = mipmap.data[i]
                image_data[i + 1] = mipmap.data[i + 1]
                image_data[i + 2] = mipmap.data[i + 2]
                image_data[i + 3] = mipmap.data[i + 3]
            }
        }
        else {
            for (let i = 0; i < mipmap.data.length; i += 4) {
                let [r, g, b, a] = mipmap.data.slice(i, i + 4)

                const alpha = a / 255
                image_data[i] = Math.ceil(r / alpha)
                image_data[i + 1] = Math.ceil(g / alpha)
                image_data[i + 2] = Math.ceil(b / alpha)
                image_data[i + 3] = a
            }
        }
        context.putImageData(imageData, 0, 0)

        const flipped_canvas = flipped(canvas)

        return flipped_canvas
    }

    get_file(file_name) {
        let content = this.header.get_data()

        for (const mipmap of this.mipmaps) {
            content = combine_array(content, mipmap.get_meta_data())

        }
        for (const mipmap of this.mipmaps) {
            content = combine_array(content, mipmap.get_block_data())
        }
        content = combine_array(content, new Uint8Array([this.premultiply_alpha]))

        const blob = new Blob([content])
        const downloadLink = document.createElement("a")
        downloadLink.href = URL.createObjectURL(blob)
        downloadLink.download = file_name
        downloadLink.click()
        URL.revokeObjectURL(downloadLink.href)
    }
}
