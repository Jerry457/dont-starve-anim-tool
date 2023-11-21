import { createSignal } from "solid-js"

import { pack, split } from "../../lib/image-canvas/packer"
import { Ktex, PixelFormat, Platform, TextureType } from "../../lib/kfiles/ktex"
import { bboxTouvbbox, block, uvbbox, uvbboxTobbox } from "../../lib/image-canvas/type"

export const [atlasName, setAtlasName] = createSignal<string>()
export const [texture, setTexture] = createSignal<HTMLCanvasElement>()
export const [textureInfo, setTextureInfo] = createSignal<{
    platform: string
    pixelFormat: string
    textureType: string
    mipmapCount: number
    flags: number
    fill: number
}>({ platform: "Default", pixelFormat: "DXT5", textureType: "twoD", mipmapCount: 0, flags: 0, fill: 0 })

export const [uvBBoxs, setuvBBoxs] = createSignal<uvbbox[]>()

export function addAtlasImages(blocks: block[]) {
    if (blocks.length === 0) return

    if (!atlasName()) {
        setAtlasName(blocks[0].name!)
    }
    if (!texture()) {
        const block = blocks.shift()
        if (block) {
            setTexture(block.canvas)
            if (!uvBBoxs()) setuvBBoxs([{ u1: 0, v1: 0, u2: 1, v2: 1, name: block.name! }])
        }
    }
    if (uvBBoxs()) {
        const textureCanvas = texture()!
        const bbox = uvBBoxs()!.map(uvbbox => uvbboxTobbox(uvbbox, textureCanvas.width, textureCanvas.height))
        const splitedBlocks = split(textureCanvas, bbox)
        let mergeBlocks = [...blocks, ...splitedBlocks]
        let packed = mergeBlocks[0].canvas

        if (mergeBlocks.length > 1) {
            packed = pack(mergeBlocks) // auto modify mergeBlocks
        } else {
            const { name, canvas } = mergeBlocks[0]
            mergeBlocks = [{ name, canvas, insertBBox: { x: 0, y: 0, w: canvas.width, h: canvas.height } }]
        }

        setTexture(packed)
        const uvbboxs = mergeBlocks.map(({ name, insertBBox }) => bboxTouvbbox(insertBBox!, packed.width, packed.height, name))
        setuvBBoxs(uvbboxs)
    }
}

export function addAtlasBboxs(name: string, uvbboxs: uvbbox[]) {
    setAtlasName(name)
    setuvBBoxs(uvbboxs)
}

export function updateTextureInfo(ktex: Ktex) {
    const platform = Platform[ktex.header.platform]
    const pixelFormat = PixelFormat[ktex.header.pixelFormat]
    const textureType = TextureType[ktex.header.textureType]
    const { mipmapCount, flags, fill } = ktex.header
    setTextureInfo({ platform, pixelFormat, textureType, mipmapCount, flags, fill })
}

export function addTexture(name: string, ktex: Ktex) {
    setTexture(ktex.toImage())
    setAtlasName(name)
}
