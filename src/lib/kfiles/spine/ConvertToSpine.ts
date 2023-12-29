import JsonStringify from "json-stringify-pretty-compact"

import { Build } from "../build"
import { Anim, AnimElement, AnimFrame } from "../anim"
import { getMapSymbol } from "../../../AnimTool/SymbolMapViewer"

type BuildPacks = { [name: string]: Build[] }

type SpinAttachment = { name: string; path: string; x: number; y: number; width: number; height: number }
type SkinAttachment = { [skinPlaceholder: string]: SpinAttachment }
type SpineSlot = { name: string; bone?: string; attachment?: SpinAttachment["name"] }
type SpineBone = {
    name: string
    parent?: string
    x?: number
    y?: number
    rotation?: number
    scaleX?: number
    scaleY?: number
    shearX?: number
    shearY?: number
}

type TimelineKey = { time: number }
interface AttachmentTimelineKey extends TimelineKey {
    name: string | null
}
interface DrawOrderTimelineKey extends TimelineKey {
    offsets: { slot: string; offset: number }[]
}
interface transformTimelineKey extends TimelineKey {
    curve?: "stepped"
}

class SpineSkin {
    name: string
    attachments: { [slotName: string]: SkinAttachment } = {}

    constructor(name: string) {
        this.name = name
    }

    getAttachment(slotName: string): SkinAttachment | undefined {
        return this.attachments[slotName]
    }

    getSkinPlaceholder(slotName: string, skinPlaceholder: string) {
        let attachment = this.getAttachment(slotName)
        return attachment?.[skinPlaceholder]
    }

    addAttachment(slotName: string, skinAttachment: SkinAttachment) {
        if (this.getAttachment(slotName)) throw Error("name already exists")
        this.attachments[slotName] = skinAttachment
        return skinAttachment
    }

    addSkinPlaceholder(slotName: string, skinPlaceholder: string, spinAttachment: SpinAttachment) {
        if (this.getSkinPlaceholder(slotName, skinPlaceholder)) throw Error("skin placeholder already exists")

        let attachment = this.getAttachment(slotName)
        if (!attachment) attachment = this.addAttachment(slotName, {})

        attachment[skinPlaceholder] = spinAttachment
        return spinAttachment
    }
}

class SlotTimeline {
    attachment: AttachmentTimelineKey[] = []

    addAttachmentTimelineKey(attachment: AttachmentTimelineKey) {
        const lastAttachment = getLast<AttachmentTimelineKey>(this.attachment)
        if (!lastAttachment) {
            this.attachment.push(attachment)
        } else if (lastAttachment.name !== attachment.name) {
            this.attachment.push(attachment)
        }
    }
}

class BoneTimeline {
    rotate: (transformTimelineKey & { angle: number })[] = []
    translate: (transformTimelineKey & { x: number; y: number })[] = []
    scale: (transformTimelineKey & { x: number; y: number })[] = []
    shear: (transformTimelineKey & { x: number; y: number })[] = []

    addRotateTimelineKey(rotate: BoneTimeline["rotate"][number], isEnd?: boolean) {
        const lastRotate = getLast(this.rotate)
        if (isEnd || !lastRotate || !isInvalidValue(lastRotate.angle - rotate.angle)) this.rotate.push(rotate)
    }

    addTranslateTimelineKey(translate: BoneTimeline["translate"][number], isEnd?: boolean) {
        const lastTranslate = getLast(this.translate)
        if (isEnd || !lastTranslate || !isInvalidValue(lastTranslate.x - translate.x) || lastTranslate.y !== translate.y)
            this.translate.push(translate)
    }

    addScaleTimelineKey(scale: BoneTimeline["scale"][number], isEnd?: boolean) {
        const lastScale = getLast(this.scale)
        if (isEnd || !lastScale || !isInvalidValue(lastScale.x - scale.x) || !isInvalidValue(lastScale.y - scale.y)) this.scale.push(scale)
    }

    addShearTimelineKey(shear: BoneTimeline["shear"][number], isEnd?: boolean) {
        const lastShear = getLast(this.shear)
        if (isEnd || !lastShear || !isInvalidValue(lastShear.x - shear.x) || !isInvalidValue(lastShear.y - shear.y)) this.shear.push(shear)
    }

    clearTimelineKey() {
        // delete last curve
        const rotate = getLast(this.rotate)
        const translate = getLast(this.translate)
        const scale = getLast(this.scale)
        const shear = getLast(this.shear)

        for (const transformTimelineKey of [rotate, translate, scale, shear]) {
            if (transformTimelineKey) delete transformTimelineKey.curve
        }
    }
}

class SpineAnimation {
    slots: { [slotName: string]: SlotTimeline } = {}
    bones: { [boneName: string]: BoneTimeline } = {}
    drawOrder: DrawOrderTimelineKey[] = []

    getBoneTimeline(boneName: string): BoneTimeline | undefined {
        return this.bones[boneName]
    }

    addBoneTimeline(boneName: string) {
        if (this.getBoneTimeline(boneName)) throw Error("bone timeline already exists")
        const boneTimeline = new BoneTimeline()
        this.bones[boneName] = boneTimeline
        return boneTimeline
    }

    getSlotTimeline(slotName: string): SlotTimeline | undefined {
        return this.slots[slotName]
    }

    addSlotTimeline(slotName: string) {
        if (this.getSlotTimeline(slotName)) throw Error("slot timeline already exists")
        const slotTimeline = new SlotTimeline()
        this.slots[slotName] = slotTimeline
        return slotTimeline
    }

    addDrawOrderTimelineKey(drawOrder: DrawOrderTimelineKey) {
        if (drawOrder.offsets.length === 0) return

        const lastOffsets = getLast(this.drawOrder)?.offsets

        if (!lastOffsets || JSON.stringify(lastOffsets) !== JSON.stringify(drawOrder.offsets)) {
            this.drawOrder.push(drawOrder)
        }
    }

    clearBoneTimeline() {
        // delete last curve
        for (const boneName in this.bones) {
            const bone = this.bones[boneName]
            bone.clearTimelineKey()
        }
    }
}

class SpineData {
    skeleton = {
        spine: "3.8.75",
        images: "./images",
        audio: "",
    }
    rootBoon: SpineBone
    bones: SpineBone[] = []
    slots: SpineSlot[] = []
    skins: SpineSkin[] = []
    animations: { [animationName: string]: SpineAnimation } = {}

    constructor() {
        this.rootBoon = { name: "root" }
        this.bones.push(this.rootBoon)
    }

    getSlot(slotName: string): [SpineSlot, number] | undefined {
        for (const [index, slot] of this.slots.entries()) {
            if (slot.name === slotName) return [slot, index]
        }
    }

    getBone(boneName: string): [SpineBone, number] | undefined {
        for (const [index, bone] of this.bones.entries()) {
            if (bone.name === boneName) return [bone, index]
        }
    }

    getSkin(skinName: string): [SpineSkin, number] | undefined {
        for (const [index, skin] of this.skins.entries()) {
            if (skin.name === skinName) return [skin, index]
        }
    }

    getAnimation(animationName: string): SpineAnimation | undefined {
        return this.animations[animationName]
    }

    addSlots(slot: SpineSlot) {
        const { name, bone = this.rootBoon.name } = slot

        if (this.getSlot(name)) throw Error("name already exists")

        const newSlot = { name, bone }
        this.slots.push(newSlot)
        return newSlot
    }

    addBone(bone: SpineBone) {
        const { name, parent = this.rootBoon.name } = bone

        if (this.getBone(name)) throw Error("bone name already exists")

        const newBone = { name, parent }
        this.bones.push(newBone)

        return newBone
    }

    addSkin(skin: SpineSkin) {
        if (this.getSkin(skin.name)) throw Error("name already exists")
        this.skins.push(skin)
    }

    addAnimation(animationName: string, spinAnimation: SpineAnimation) {
        if (this.getAnimation(animationName)) throw Error("name already exists")
        this.animations[animationName] = spinAnimation
    }

    jsonStringify(beautify: boolean = false, indent: number = 4) {
        return beautify ? JsonStringify(this, { indent, maxLength: 200 }) : JSON.stringify(this)
    }
}

function isInvalidValue(value: number, eps = 1e-3) {
    return Math.abs(value) < eps
}

function getLast<T>(array: Array<T>) {
    return array.length > 0 ? array[array.length - 1] : undefined
}

function findSymbolFrame(symbolName: string, frameNum: number, builds: Build[]) {
    for (const build of builds) {
        const symbolData = build.getSymbol(symbolName)
        if (!symbolData) continue
        const [symbol] = symbolData
        const frameData = symbol.getFrame(frameNum)
        return frameData?.[0]
    }
}

function ConvertToSpineAttachment(buildName: string, symbol: string, frameNum: number, builds: Build[]): SpinAttachment {
    const attachmentName = `${symbol}-${frameNum}` // skin placeholder

    const frame = findSymbolFrame(symbol, frameNum, builds)
    const path = frame ? `${buildName}/${symbol}/${symbol}-${frame.frameNum}` : `${buildName}/${symbol}/missing`
    const { x, y, w, h } = frame || { x: 0, y: 0, w: 100, h: 100 }
    const attachment = { name: attachmentName, path: path, x: x, y: -y, width: w, height: h } // transform origin
    return attachment
}

function decomposeMatrix(m_a: number, m_b: number, m_c: number, m_d: number, m_tx: number, m_ty: number, lastScale?: { x: number; y: number }) {
    const scaleX = Math.sqrt(m_a * m_a + m_b * m_b)
    const normalizeA = m_a / scaleX
    const normalizeB = m_b / scaleX

    let shearX = normalizeA * m_c + normalizeB * m_d
    const a1 = m_c + -shearX * normalizeA
    const a2 = m_d + -shearX * normalizeB
    const scaleY = Math.sqrt(a1 ** 2 + a2 ** 2)
    shearX = -shearX / scaleY

    const translate = { x: m_tx, y: -m_ty }
    const scale = { x: scaleX, y: scaleY }
    const shear = { x: shearX, y: 0 }
    // const shear = { x: Math.atan2(m_b, m_d), y: Math.atan2(m_c, m_a) }

    const delta = m_a * m_d - m_c * m_b
    if (delta < 0) {
        if (!lastScale || lastScale.x <= lastScale.y) scale.x = -scale.x
        else scale.y = -scale.y
    } else if (delta === 0) shear.x = 0

    let angle = 0
    if (!isInvalidValue(Math.abs(scale.x)) && !isInvalidValue(Math.abs(scale.y))) {
        // const sinApprox = 0.5 * (m_c / scale.y - m_b / scale.x)
        // const cosApprox = 0.5 * (m_a / scale.x + m_d / scale.y)
        angle = Math.atan2(m_c / scale.y, m_d / scale.y)
    }

    angle *= 180 / Math.PI
    shear.x *= 180 / Math.PI
    shear.y *= 180 / Math.PI

    return { angle, translate, scale, shear }
}

export function convertToSpine(anim: Anim, buildPacks: BuildPacks, setupPoseFrame?: AnimFrame) {
    const spineData = new SpineData()
    const elementTimelineMap: Map<AnimElement, string> = new Map()

    // convert builds to skin
    for (const name in buildPacks) {
        spineData.addSkin(new SpineSkin(name))
    }

    // convert animaton to bone and slot timeline
    for (const bank of anim.banks) {
        for (const animation of bank.animations) {
            const frameDruation = 1 / animation.frameRate

            const spineAnimation = new SpineAnimation()
            for (const [frameIdx, frame] of animation.frames.entries()) {
                const time = frameIdx * frameDruation
                const isEnd = frameIdx === animation.frames.length - 1

                const showSlotTimelines = []
                const layerNameCount: { [name: string]: number } = {}
                for (const element of frame.elements) {
                    const { layerName, symbol, frameNum, a, b, c, d, tx, ty } = element
                    const overSymbol = getMapSymbol(symbol) || symbol

                    if (!layerNameCount[layerName]) layerNameCount[layerName] = 0
                    layerNameCount[layerName] += 1

                    const timelineName = `${layerName}_${layerNameCount[layerName]}`
                    elementTimelineMap.set(element, timelineName)

                    const boneName = timelineName
                    const slotName = timelineName
                    const skinPlaceholder = `${overSymbol}-${frameNum}`

                    // if not, add bone and slot
                    if (!spineData.getBone(boneName)) {
                        spineData.addBone({ name: boneName })
                        spineData.addSlots({ name: slotName, bone: boneName })
                    }

                    // if not, add attachment and placeholder to skin
                    for (const skin of spineData.skins) {
                        if (!skin.getSkinPlaceholder(slotName, skinPlaceholder)) {
                            const spineAttachment = ConvertToSpineAttachment(skin.name, overSymbol, frameNum, buildPacks[skin.name])
                            skin.addSkinPlaceholder(slotName, skinPlaceholder, spineAttachment)
                        }
                    }

                    // if not, add slot timeline
                    let slotTimeline = spineAnimation.getSlotTimeline(slotName)
                    if (!slotTimeline) slotTimeline = spineAnimation.addSlotTimeline(slotName)

                    // if not, add bone timeline
                    let boneTimeline = spineAnimation.getBoneTimeline(boneName)
                    if (!boneTimeline) boneTimeline = spineAnimation.addBoneTimeline(boneName)

                    // key attachment
                    showSlotTimelines.push(slotName)
                    slotTimeline.addAttachmentTimelineKey({ time, name: skinPlaceholder })

                    // key bone
                    const lastScale = getLast(boneTimeline.scale)
                    const { angle, translate, scale, shear } = decomposeMatrix(a, b, c, d, tx, ty, lastScale)

                    const curve = "stepped"
                    boneTimeline.addRotateTimelineKey({ angle, time, curve }, isEnd)
                    boneTimeline.addTranslateTimelineKey({ ...translate, time, curve }, isEnd)
                    boneTimeline.addScaleTimelineKey({ ...scale, time, curve }, isEnd)
                    boneTimeline.addShearTimelineKey({ ...shear, time, curve }, isEnd)

                    if (setupPoseFrame === frame) {
                        const [bone] = spineData.getBone(boneName)!
                        const [slot] = spineData.getSlot(slotName)!
                        slot.attachment = skinPlaceholder
                        bone.x = translate.x
                        bone.y = translate.y
                        bone.scaleX = scale.x
                        bone.scaleY = scale.y
                        bone.rotation = angle
                        bone.shearX = shear.x
                        bone.shearY = shear.y
                    }
                }

                // key attachment
                for (const slotTimelineName in spineAnimation.slots) {
                    const slotTimeline = spineAnimation.slots[slotTimelineName]
                    if (!showSlotTimelines.includes(slotTimelineName)) {
                        slotTimeline.addAttachmentTimelineKey({ time, name: null })
                    }
                }
            }
            spineAnimation.clearBoneTimeline()

            const animationPath = `${bank.name}/${animation.name}`
            spineData.addAnimation(animationPath, spineAnimation)
        }
    }

    // setup pose order
    if (setupPoseFrame) {
        const layerNameCount: { [name: string]: number } = {}
        for (const element of setupPoseFrame.elements) {
            const { layerName, symbol, frameNum, a, b, c, d, tx, ty, zIndex } = element
            if (!layerNameCount[layerName]) layerNameCount[layerName] = 0
            layerNameCount[layerName] += 1

            const slotName = `${layerName}_${layerNameCount[layerName]}`
            const [slot, index] = spineData.getSlot(slotName)!

            const order = spineData.slots.length - 1 - zIndex
            spineData.slots.splice(index, 1)
            spineData.slots.splice(order, 0, slot)

            for (const animationName in spineData.animations) {
                const spineAnimation = spineData.animations[animationName]
                const boneTimeline = spineAnimation.getBoneTimeline(slotName)

                if (boneTimeline) {
                    const [bone] = spineData.getBone(slotName)!
                    for (const rotateTimeline of boneTimeline.rotate) {
                        if (bone.rotation) rotateTimeline.angle = rotateTimeline.angle - bone.rotation
                    }
                    for (const translateTimeline of boneTimeline.translate) {
                        if (bone.x) translateTimeline.x = translateTimeline.x - bone.x
                        if (bone.y) translateTimeline.y = translateTimeline.y - bone.y
                    }
                    // for (const scaleTimeline of boneTimeline.scale) {
                    //     if (bone.scaleX) scaleTimeline.x = scaleTimeline.x - bone.scaleX
                    //     if (bone.scaleY) scaleTimeline.y = scaleTimeline.y - bone.scaleY
                    // }
                    for (const shearTimeline of boneTimeline.shear) {
                        if (bone.shearX) shearTimeline.x = shearTimeline.x - bone.shearX
                        if (bone.shearY) shearTimeline.y = shearTimeline.y - bone.shearY
                    }
                }

                let slotTimeline = spineAnimation.getSlotTimeline(slotName)
                if (!slotTimeline) slotTimeline = spineAnimation.addSlotTimeline(slotName)
                if (!slotTimeline.attachment[0] || slotTimeline.attachment[0].time !== 0)
                    slotTimeline.attachment.splice(0, 0, { time: 0, name: null })
            }
        }
    }

    // convert animaton order
    for (const bank of anim.banks) {
        for (const animation of bank.animations) {
            const frameDruation = 1 / animation.frameRate
            const animationPath = `${bank.name}/${animation.name}`
            const spineAnimation = spineData.getAnimation(animationPath)!

            for (const [frameIdx, frame] of animation.frames.entries()) {
                const time = frameIdx * frameDruation

                // key draw order
                const offsets: { slot: string; offset: number }[] = []
                for (const [slotIndex, slot] of spineData.slots.entries()) {
                    for (const element of frame.elements) {
                        if (elementTimelineMap.get(element) === slot.name) {
                            const order = spineData.slots.length - 1 - element.zIndex
                            const offset = order - slotIndex
                            offsets.push({ slot: slot.name, offset })
                            break
                        }
                    }
                }

                spineAnimation.addDrawOrderTimelineKey({ time, offsets })
            }
        }
    }

    return spineData.jsonStringify()
}
