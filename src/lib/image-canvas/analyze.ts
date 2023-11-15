import { bbox } from "./type"

export function analyze(canvas: HTMLCanvasElement, bbox: bbox) {
    const imageData = canvas.getContext("2d")!.getImageData(bbox.x, bbox.y, bbox.w, bbox.h)
    const pixelData = imageData.data
    let numBlank = 0
    let numOpaque = 0

    for (let i = 3; i < pixelData.length; i += 4) {
        const alpha = pixelData[i]
        if ((0 < alpha && alpha < 255) || (numBlank > 0 && numOpaque > 0)) {
            return "alpha"
        }

        if (alpha === 0) numBlank += 1
        else numOpaque += 1
    }

    if (numBlank > 0) return "empty"
    else return "opaque"
}

function MergeRegion(regions: bbox[]) {
    const MergedRegions: bbox[] = []
    for (const o of regions) {
        let added = false
        for (const [i, n] of MergedRegions.entries()) {
            if (n.w === o.w && n.x === o.x && (n.y + n.h === o.y || o.y + o.h === n.y)) {
                MergedRegions.splice(i, 1)
                MergedRegions.push({
                    x: n.x,
                    y: Math.min(o.y, n.y),
                    w: n.w,
                    h: o.h + n.h,
                })
                added = true
                break
            }

            if (n.h === o.h && n.y === o.y && (n.x + n.w === o.x || o.x + o.w === n.x)) {
                MergedRegions.splice(i, 1)
                MergedRegions.push({
                    x: Math.min(o.x, n.x),
                    y: n.y,
                    w: n.w + o.w,
                    h: o.h,
                })

                added = true
                break
            }
        }
        if (!added) MergedRegions.push(o)
    }

    if (MergedRegions.length === regions.length) return MergedRegions
    else return MergeRegion(MergedRegions)
}

export function getRegion(canvas: HTMLCanvasElement, blocksize = 32) {
    const bbox = { x: 0, y: 0, w: canvas.width, h: canvas.height }
    const opaqueRegions: bbox[] = []
    const alphaRegions: bbox[] = []

    function quadTreeAnalyze(canvas: HTMLCanvasElement, bbox: bbox) {
        const { x, y, w, h } = bbox
        if (w > blocksize && h > blocksize) {
            const halfW = Math.floor(w / 2)
            const halfH = Math.floor(h / 2)

            const leftTopBbox = { x: x, y: y, w: halfW, h: halfH }
            const rightTopBbox = { x: x + halfW, y: y, w: w - halfW, h: halfH }
            const leftBottomBbox = { x: x, y: y + halfH, w: halfW, h: h - halfH }
            const rightBottomBbox = { x: x + halfW, y: y + halfH, w: w - halfW, h: h - halfH }

            const leftTopType = analyze(canvas, leftTopBbox)
            const rightTopType = analyze(canvas, rightTopBbox)
            const leftBottomType = analyze(canvas, leftBottomBbox)
            const rightBottomType = analyze(canvas, rightBottomBbox)

            const isSameType = leftTopType === rightTopType && leftTopType === leftBottomType && leftTopType === rightBottomType
            const isLastDiv = halfW < blocksize || halfH < blocksize

            if (isSameType && (leftTopType !== "alpha" || isLastDiv)) {
                if (leftTopType === "alpha") alphaRegions.push(bbox)
                if (leftTopType === "opaque") opaqueRegions.push(bbox)
                return leftTopType
            } else {
                const type1 = quadTreeAnalyze(canvas, leftTopBbox)
                const type2 = quadTreeAnalyze(canvas, rightTopBbox)
                const type3 = quadTreeAnalyze(canvas, leftBottomBbox)
                const type4 = quadTreeAnalyze(canvas, rightBottomBbox)

                if (type1 === type2 && type1 === type3 && type1 === type4 && type1 === "alpha") {
                    alphaRegions.push(bbox)
                    return "alpha"
                }
            }
        } else {
            const type = analyze(canvas, bbox)
            if (type === "alpha") alphaRegions.push(bbox)
            else if (type === "opaque") opaqueRegions.push(bbox)
            return type
        }

        return "unknow"
    }
    quadTreeAnalyze(canvas, bbox)

    // debug
    // const ctx = canvas.getContext("2d")!
    // for (const region of MergeRegion(opaqueRegions)) {
    //     ctx.strokeRect(region.x, region.y, region.w, region.h)
    // }
    // ctx.strokeStyle = "red"
    // for (const region of MergeRegion(alphaRegions)) {
    //     ctx.strokeRect(region.x, region.y, region.w, region.h)
    // }
    // document.body.appendChild(canvas)

    return [MergeRegion(opaqueRegions), MergeRegion(alphaRegions)]
}
