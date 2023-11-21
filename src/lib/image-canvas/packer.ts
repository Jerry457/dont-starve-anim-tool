import { crop, newCanvas, paste } from "."
import { nextTwoPower } from "../math"
import { bbox } from "./type"

export type block = {
    canvas: HTMLCanvasElement

    name?: string
    insertBBox?: bbox
}

function nextMultipleOf(n: number, target: number) {
    let remainder = n % target
    if (remainder == 0) return n
    return n + (target - remainder)
}

function bboxIntersects(bbox1: bbox, bbox2: bbox) {
    return !(bbox2.x >= bbox1.x + bbox1.w || bbox2.x + bbox2.w <= bbox1.x || bbox2.y + bbox2.h <= bbox1.y || bbox2.y >= bbox1.y + bbox1.h)
}

function tryInsert(block: block, w: number, h: number, fittedBlocks: bbox[]): bbox | undefined {
    let align = 4
    let x = 0
    let y = 0

    const bboxH = block.canvas.height
    const bboxW = block.canvas.width
    while (y + bboxH < h) {
        let minY = undefined
        let yTestBBox = { x: 0, y: y, w: w, h: bboxH }
        let tempBBoxs = fittedBlocks.filter(fittedBlock => bboxIntersects(fittedBlock, yTestBBox))

        while (x + bboxW <= w) {
            let testBBox = { x, y, w: bboxW, h: bboxH }
            let intersects = false
            for (const bbox of tempBBoxs) {
                if (bboxIntersects(bbox, testBBox)) {
                    x = nextMultipleOf(bbox.x + bbox.w, align)
                    if (!minY) {
                        minY = bbox.h + bbox.y
                    } else {
                        minY = Math.min(minY, bbox.h + bbox.y)
                    }

                    intersects = true
                    break
                }
            }
            if (!intersects) {
                return { x, y, w: bboxW, h: bboxH }
            }
        }
        if (minY) y = Math.max(nextMultipleOf(minY, align), y + align)
        else y += align
        x = 0
    }
}

export function pack(blocks: block[]) {
    const sortedBlocks = [...blocks].sort((a, b) => b.canvas.width * b.canvas.height - a.canvas.width * a.canvas.height)

    const totalArea = sortedBlocks.reduce((area, block) => area + block.canvas.width * block.canvas.height, 0)
    let w = 2 ** Math.ceil(Math.log2(totalArea) / 2)
    let h = nextTwoPower(totalArea / w)

    let fitBlocks: bbox[] = []
    function packGrow() {
        for (const block of sortedBlocks) {
            block.insertBBox = tryInsert(block, w, h, fitBlocks)
            if (block.insertBBox) fitBlocks.push(block.insertBBox)
            else {
                fitBlocks = []
                if (h >= w) w *= 2
                else h *= 2
                packGrow()
            }
        }
    }
    packGrow()

    const packed = newCanvas(w, h)
    for (const block of sortedBlocks) {
        paste(packed, block.canvas, block.insertBBox!.x, block.insertBBox!.y)
    }
    // document.body.appendChild(packed)
    return packed
}

export function split(canvas: HTMLCanvasElement, bboxs: bbox[]): block[] {
    return bboxs.map(({ x, y, w, h, name }) => {
        return { name, canvas: crop(canvas, x, y, w, h) }
    })
}
