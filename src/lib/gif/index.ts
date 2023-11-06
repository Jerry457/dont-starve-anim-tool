import { newCanvas } from "../image-canvas"
import { encode } from "modern-gif"
import _workerUrl from "modern-gif/worker?url"

const workerUrl = _workerUrl as unknown as string

export async function encodeDownload(
    name: string,
    width: number,
    height: number,
    frameDuration: number,
    renderedFrames: (HTMLCanvasElement | undefined)[]
) {
    const frames: { imageData: HTMLCanvasElement; delay: number }[] = []

    for (let renderedFrame of renderedFrames) {
        if (!renderedFrame) renderedFrame = newCanvas(width, height)
        frames.push({ imageData: renderedFrame, delay: frameDuration })
    }
    encode({ workerUrl: workerUrl, width, height, frames }).then(output => {
        const blob = new Blob([output], { type: "image/gif" })
        const link = document.createElement("a")
        link.download = `${name}.gif`
        link.href = URL.createObjectURL(blob)
        link.click()
    })
}
