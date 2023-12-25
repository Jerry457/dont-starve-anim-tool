import { Ktex, PixelFormat } from "../kfiles/ktex"

type ImageSource = HTMLCanvasElement | ImageBitmap | OffscreenCanvas | HTMLImageElement

export function newCanvas(image: ImageSource): HTMLCanvasElement
export function newCanvas(width: number, height: number): HTMLCanvasElement
export function newCanvas(image: number | ImageSource, height?: number): HTMLCanvasElement {
    const canvas = document.createElement("canvas")
    if (typeof image === "number") {
        canvas.width = image
        canvas.height = height!
    } else {
        canvas.width = image.width
        canvas.height = image.height
        canvas.getContext("2d", { willReadFrequently: true })!.drawImage(image, 0, 0)
    }

    return canvas
}

export function newOffscreenCanvas(width: number, height: number, image?: CanvasImageSource) {
    const canvas = new OffscreenCanvas(width, height)

    if (image) canvas.getContext("2d", { willReadFrequently: true })!.drawImage(image, 0, 0)

    return canvas
}

export function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
    return new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob))
    })
}

export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise(resolve => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.src = url
    })
}

export function flipY(canvas: HTMLCanvasElement) {
    const flipped = newCanvas(canvas.width, canvas.height)
    const ctx = flipped.getContext("2d", { willReadFrequently: true })!

    ctx.translate(0, canvas.height)
    ctx.scale(1, -1)
    ctx.drawImage(canvas, 0, 0)

    return newCanvas(flipped)
}

export function resize(canvas: HTMLCanvasElement, width: number, height: number) {
    const resized = newCanvas(width, height)
    resized.getContext("2d", { willReadFrequently: true })!.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, width, height)

    return resized
}

export function transform(canvas: HTMLCanvasElement, a: number, b: number, c: number, d: number, tx: number, ty: number) {
    const borderX = [0, canvas.width * a, canvas.height * c, canvas.width * a + canvas.height * c]
    const borderY = [0, canvas.width * b, canvas.height * d, canvas.width * b + canvas.height * d]

    const left = Math.min(...borderX)
    const right = Math.max(...borderX)
    const top = Math.max(...borderY)
    const bottom = Math.min(...borderY)

    const transformedWidth = Math.round(right - left)
    const transformedHeight = Math.round(top - bottom)
    if (transformedWidth <= 0 || transformedHeight <= 0) {
        return
    }
    const transformed = newCanvas(transformedWidth, transformedHeight)

    const transformedContext = transformed.getContext("2d")!
    transformedContext.setTransform(a, b, c, d, -left + tx, -bottom + ty)
    transformedContext.drawImage(canvas, 0, 0)

    return newCanvas(transformed)
}

export function crop(canvas: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
    // const canvas = newCanvas(image.width, image.height, image)
    const crop_data = canvas.getContext("2d")!.getImageData(x, y, w, h)

    const croped = newCanvas(w, h)
    croped.getContext("2d", { willReadFrequently: true })!.putImageData(crop_data, 0, 0)

    return croped
}

export function paste(pasted: HTMLCanvasElement, canvas: HTMLCanvasElement, dx: number, dy: number) {
    pasted.getContext("2d", { willReadFrequently: true })!.drawImage(canvas, dx, dy)

    return pasted
}

export function preMultiplyAlpha(canvas: HTMLCanvasElement) {
    const imageData = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < imageData.data.length; i += 4) {
        let [r, g, b, a] = imageData.data.slice(i, i + 4)

        const alpha = a / 255
        r = Math.min(Math.ceil(r / alpha), 255)
        g = Math.min(Math.ceil(g / alpha), 255)
        b = Math.min(Math.ceil(b / alpha), 255)

        imageData.data[i] = r
        imageData.data[i + 1] = g
        imageData.data[i + 2] = b
    }

    const preMultiplied = newCanvas(canvas.width, canvas.height)
    preMultiplied.getContext("2d")!.putImageData(imageData, 0, 0)

    return preMultiplied
}

export function unPreMultiplyAlpha(canvas: HTMLCanvasElement) {
    const imageData = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height)
    const pixelData = imageData.data
    for (let i = 0; i < imageData.data.length; i += 4) {
        let [r, g, b, a] = pixelData.slice(i, i + 4)

        const alpha = a / 255
        pixelData[i] = r * alpha
        pixelData[i + 1] = g * alpha
        pixelData[i + 2] = b * alpha
        pixelData[i + 3] = a
    }

    const unPreMultiplied = newCanvas(canvas.width, canvas.height)
    unPreMultiplied.getContext("2d")!.putImageData(imageData, 0, 0)

    return unPreMultiplied
}

export function applyColorCube(canvas: HTMLCanvasElement, colorCubeKtex: Ktex) {
    if (colorCubeKtex.header.pixelFormat !== PixelFormat.RGB || colorCubeKtex.mipmaps[0].dataSize !== 32 * 32 * 32 * 3) {
        throw new TypeError("this ktex no color cube file")
    }

    const imageData = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height)
    const pixelData = imageData.data
    const colorCubeData = colorCubeKtex.mipmaps[0].blockData!
    for (let i = 0; i < pixelData.length; i += 4) {
        let r = pixelData[i]
        let g = pixelData[i + 1]
        let b = pixelData[i + 2]
        const a = pixelData[i + 3]

        r = r >> 3 // r / 8
        g = g >> 3
        b = b >> 3

        let offset = (((31 - g) << 10) + (b << 5) + r) * 3 // ((31 - g) * 32 * 32 + b * 32 + r * 1) * 3

        pixelData[i] = colorCubeData[offset]
        pixelData[i + 1] = colorCubeData[offset + 1]
        pixelData[i + 2] = colorCubeData[offset + 2]
        pixelData[i + 3] = a
    }

    const applied = newCanvas(canvas)
    applied.getContext("2d")!.putImageData(imageData, 0, 0)

    return applied
}

export function drawArrow(canvas: HTMLCanvasElement, x: number, y: number, direction: "left" | "up", size = 8, tipSize = 4, lineColor = "black") {
    const context = canvas.getContext("2d")!

    context.beginPath()
    context.moveTo(x, y)
    if (direction === "left") {
        context.moveTo(x, y)
        context.lineTo(x + size + tipSize, y - size)
        context.lineTo(x + size, y)
        context.lineTo(x + size + tipSize, y + size)
    } else if (direction === "up") {
        context.moveTo(x, y)
        context.lineTo(x - size, y + size + tipSize)
        context.lineTo(x, y + size)
        context.lineTo(x + size, y + size + tipSize)
    }
    context.closePath()
    context.fillStyle = lineColor
    context.fill()
}

export function drawCoordinate(canvas: HTMLCanvasElement, lineColor = "black") {
    const context = canvas.getContext("2d")!
    context.clearRect(0, 0, canvas.width, canvas.height)

    context.beginPath()
    context.moveTo(0, canvas.height / 2)
    context.lineTo(canvas.width, canvas.height / 2)
    context.moveTo(canvas.width / 2, 0)
    context.lineTo(canvas.width / 2, canvas.height)
    context.strokeStyle = lineColor
    context.stroke()

    drawArrow(canvas, 0, canvas.height / 2, "left", undefined, undefined, lineColor)
    drawArrow(canvas, canvas.width / 2, 0, "up", undefined, undefined, lineColor)
}
