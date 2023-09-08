// image
export function flipped(canvas) {
    const flipped_canvas = document.createElement("canvas", {alpha: true,})
    const flipped_context = flipped_canvas.getContext("2d", {willReadFrequently: true})
    flipped_canvas.width = canvas.width
    flipped_canvas.height = canvas.height
    flipped_context.translate(0, canvas.height)
    flipped_context.scale(1, -1)
    flipped_context.drawImage(canvas, 0, 0)

    return flipped_canvas
}

export function crop(canvas, x, y, width, height) {
    const context = canvas.getContext("2d", {willReadFrequently: true})
    const crop_data = context.getImageData(x, y, width, height)

    const croped_canvas = document.createElement("canvas", {alpha: true})
    const croped_context = croped_canvas.getContext("2d")
    croped_canvas.width = width
    croped_canvas.height = height
    croped_context.putImageData(crop_data, 0, 0)

    return croped_canvas
}

export function resize(canvas, width, height) {
    const resized_canvas = document.createElement("canvas", {alpha: true})
    const resized_context = resized_canvas.getContext("2d")
    resized_canvas.width = width
    resized_canvas.height = height
    resized_context.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, width, height)

    return resized_canvas
}

export function premultiply_alpha(canvas) {
    const context = canvas.getContext("2d")

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const image_data = imageData.data
    for (let i = 0; i < image_data.length; i += 4) {
        const [r, g, b, a] = image_data.slice(i, i + 4)
        const alpha = a / 255
        image_data[i] = Math.floor(r * alpha)
        image_data[i + 1] = Math.floor(g * alpha)
        image_data[i + 2] = Math.floor(b * alpha)
    }
    context.putImageData(imageData, 0, 0)

    return canvas
}

// Uint8Array
export function combine_array(array1, array2) {
    const combined = new Uint8Array(array1.length + array2.length)
    combined.set(array1)
    combined.set(array2, array1.length)
    return combined
}

export function strhash(str, hash_dict) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        const c = str[i]
        const v = c.toLowerCase().charCodeAt(0)
        hash = (v + (hash << 6) + (hash << 16) - hash) & 0xFFFFFFFF
    }
    hash_dict[hash] = str
    return hash
}
