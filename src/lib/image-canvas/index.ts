export function newCanvas(width: number, height: number, image?: CanvasImageSource) {
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    if (image) {
        canvas.getContext("2d", { willReadFrequently: true })!.drawImage(image, 0, 0)
    }

    return canvas
}

export function newOffscreenCanvas(width: number, height: number, image?: CanvasImageSource) {
    const canvas = new OffscreenCanvas(width, height)

    if (image) {
        canvas.getContext("2d", { willReadFrequently: true })!.drawImage(image, 0, 0)
    }

    return canvas
}

export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise(resolve => {
        const image = new Image()
        image.onload = () => {
            resolve(image)
        }
        image.src = url
    })
}

export function flipY(canvas: HTMLCanvasElement) {
    const flipped = newCanvas(canvas.width, canvas.height)
    const ctx = flipped.getContext("2d", { willReadFrequently: true })!

    ctx.translate(0, canvas.height)
    ctx.scale(1, -1)
    ctx.drawImage(canvas, 0, 0)

    return flipped
}

export function resize(canvas: HTMLCanvasElement, width: number, height: number) {
    const resized = newCanvas(width, height)
    const ctx = resized.getContext("2d")!
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, width, height)

    return resized
}

export function transform(canvas: HTMLCanvasElement, m_a: number, m_b: number, m_c: number, m_d: number, m_tx: number, m_ty: number) {
    const borderX = [0, canvas.width * m_a, canvas.height * m_c, canvas.width * m_a + canvas.height * m_c]
    const borderY = [0, canvas.width * m_b, canvas.height * m_d, canvas.width * m_b + canvas.height * m_d]

    const left = Math.min(...borderX)
    const right = Math.max(...borderX)
    const top = Math.max(...borderY)
    const bottom = Math.min(...borderY)

    const transformed = newCanvas(Math.round(right - left), Math.round(top - bottom))
    const transformedContext = transformed.getContext("2d")!
    transformedContext.setTransform(m_a, m_b, m_c, m_d, -left + m_tx, -bottom + m_ty)
    transformedContext.drawImage(canvas, 0, 0)

    return newCanvas(transformed.width, transformed.height, transformed)
}

export function crop(canvas: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
    // const canvas = newCanvas(image.width, image.height, image)
    const ctx = canvas.getContext("2d")!
    const crop_data = ctx.getImageData(x, y, w, h)

    const croped = newCanvas(w, h)
    croped.getContext("2d")!.putImageData(crop_data, 0, 0)

    return croped
}

export function paste(pasted: HTMLCanvasElement, canvas: HTMLCanvasElement, dx: number, dy: number) {
    const ctx = pasted.getContext("2d")!
    ctx.drawImage(canvas, dx, dy)

    return pasted
}

export function preMultiplyAlpha(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

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
    const ctx = canvas.getContext("2d")!

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < imageData.data.length; i += 4) {
        let [r, g, b, a] = imageData.data.slice(i, i + 4)

        const alpha = a / 255
        r = Math.floor(r * alpha)
        g = Math.floor(g * alpha)
        b = Math.floor(b * alpha)

        imageData.data[i] = r
        imageData.data[i + 1] = g
        imageData.data[i + 2] = b
        imageData.data[i + 3] = a
    }

    const unPreMultiplied = newCanvas(canvas.width, canvas.height)
    unPreMultiplied.getContext("2d")!.putImageData(imageData, 0, 0)

    return unPreMultiplied
}
