import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js"

import Popup from "../components/Popup"
import TextInput from "../components/LabelInput"
import TextButton from "../components/TextButton"
import FileInputButton from "../components/FileInputButton"
import { refreshAnimation } from "./AnimationViewer"

import { asyncLoadFile } from "../lib/util"
import { BuildFrame } from "../lib/kfiles"
import { getRegion } from "../lib/image-canvas/analyze"
import { drawCoordinate, loadImage, newCanvas } from "../lib/image-canvas"

import style from "./BuildFrameViewer.module.css"

export const [shown, setShown] = createSignal(false)
export const [buildFrame, setBuildFrame] = createSignal<BuildFrame>()
export const [xInput, setXInput] = createSignal<HTMLInputElement>()
export const [yInput, setYInput] = createSignal<HTMLInputElement>()
export const [wInput, setWInput] = createSignal<HTMLInputElement>()
export const [hInput, setHInput] = createSignal<HTMLInputElement>()

export function BuildFrameViewer() {
    let div: HTMLDivElement

    let coordinateCanvas: HTMLCanvasElement
    let frameCanvas: HTMLCanvasElement
    let regionCanvas: HTMLCanvasElement

    let frameCanvasCtx: CanvasRenderingContext2D
    let regionCanvasCtx: CanvasRenderingContext2D

    const lineWidth = 1

    const [x, setX] = createSignal(0)
    const [y, setY] = createSignal(0)
    const [w, setW] = createSignal(1)
    const [h, setH] = createSignal(1)
    const [shownRegions, setShownRegions] = createSignal(false)
    const [newBuildFrame, setNewBuildFrame] = createSignal<BuildFrame>()
    const [dragging, setDragging] = createSignal(false)

    function onMouseDown(e: MouseEvent) {
        setDragging(true)
        e.preventDefault()
    }

    function onMouseUp() {
        setDragging(false)
    }

    function onMouseMove(e: MouseEvent) {
        if (dragging()) {
            setX(pre => pre - e.movementX)
            setY(pre => pre - e.movementY)
        }
    }

    function onSave() {
        const frame = buildFrame()
        if (!frame) return

        frame.x = x()
        frame.y = y()

        const newFrame = newBuildFrame()
        if (newFrame !== frame && newFrame) {
            frame.w = newFrame.w
            frame.h = newFrame.h
            frame.canvas = newFrame.canvas
        }

        if (xInput()) xInput()!.value = String(frame.x)
        if (yInput()) yInput()!.value = String(frame.y)
        if (wInput()) wInput()!.value = String(frame.w)
        if (hInput()) hInput()!.value = String(frame.h)
        refreshAnimation()

        setShown(false)
    }

    function drawBuildFrame(frame: BuildFrame) {
        frameCanvas.width = frame.w
        frameCanvas.height = frame.h
        frameCanvasCtx.clearRect(0, 0, frameCanvas.width, frameCanvas.height)

        if (frame.canvas) frameCanvasCtx.drawImage(frame.canvas, 0, 0)
    }

    function drawBuildFrameRegion(frame: BuildFrame) {
        regionCanvas.width = frame.w + lineWidth * 2
        regionCanvas.height = frame.h + lineWidth * 2
        regionCanvasCtx.clearRect(0, 0, frameCanvas.width, frameCanvas.height)
        regionCanvasCtx.lineWidth = lineWidth
        regionCanvasCtx.strokeStyle = "red"

        if (!frame.verts.length && frame.canvas) {
            const [opaqueRegions, alphaRegions] = getRegion(frame.canvas)
            const regions = [...alphaRegions, ...opaqueRegions]
            for (const region of regions) {
                regionCanvasCtx.strokeRect(region.x + lineWidth, region.y + lineWidth, region.w, region.h)
            }
            return
        }

        const xOffset = frame.x - Math.floor(frame.w / 2)
        const yOffset = frame.y - Math.floor(frame.h / 2)
        for (let i = 0; i < frame.verts.length; i += 6) {
            const regionLeft = frame.verts[i].x
            const regionRight = frame.verts[i + 1].x
            const regionBottom = frame.verts[i + 2].y
            const regionTop = frame.verts[i + 3].y

            const regionX = Math.round(regionLeft - xOffset)
            const regionY = Math.round(regionTop - yOffset)
            const regionW = Math.round(regionRight - regionLeft)
            const regionH = Math.round(regionBottom - regionTop)

            regionCanvasCtx.strokeRect(regionX + lineWidth, regionY + lineWidth, regionW, regionH)
        }
    }

    function handleFile(e: Event) {
        let file = (e.target as HTMLInputElement)?.files?.[0]
        if (!file) return

        asyncLoadFile(file, "readAsDataURL").then(url => {
            loadImage(url!).then(image => {
                const lastFrame = buildFrame()!
                const frame = new BuildFrame(lastFrame.frameNum, lastFrame.duration, lastFrame.x, lastFrame.y)
                frame.w = image.width
                frame.h = image.height
                frame.canvas = newCanvas(image)

                setNewBuildFrame(frame)
            })
        })
    }

    function onHide() {
        setX(0)
        setY(0)
        setW(1)
        setH(1)
        setBuildFrame()
        setNewBuildFrame()
        setShownRegions(false)
        setDragging(false)
    }

    function onShown() {
        frameCanvasCtx = frameCanvas.getContext("2d")!
        regionCanvasCtx = regionCanvas.getContext("2d")!

        const { width, height } = div.getBoundingClientRect()
        coordinateCanvas.width = width
        coordinateCanvas.height = height
        drawCoordinate(coordinateCanvas)
    }

    createEffect(() => {
        if (shown()) onShown()
        else onHide()
    })

    createEffect(() => {
        setNewBuildFrame(buildFrame())
    })

    createEffect(() => {
        const frame = newBuildFrame()

        if (!shown() || !frame) return

        setX(frame.x)
        setY(frame.y)
        setW(frame.w)
        setH(frame.h)
        drawBuildFrame(frame)
        drawBuildFrameRegion(frame)
    })

    onMount(() => {
        window.addEventListener("mousemove", onMouseMove)
        window.addEventListener("mouseup", onMouseUp)
    })

    onCleanup(() => {
        window.removeEventListener("mousemove", onMouseMove)
        window.removeEventListener("mouseup", onMouseUp)
    })

    return (
        <Popup shown={shown} setShown={setShown} style={{ position: "absolute", top: "5rem", left: "30rem" }}>
            <div style={{ width: "600px", height: "700px", display: "grid", "padding-top": "1rem", "grid-template-rows": "5fr 2fr min-content" }}>
                <div class="center" classList={{ ["transparentBackground"]: true }} style={{ position: "relative" }} ref={div!}>
                    <canvas ref={coordinateCanvas!} style={{ position: "absolute", "z-index": 996 }} class="noSelect"></canvas>
                    <canvas ref={frameCanvas!} style={{ position: "absolute", "z-index": 997 }} data-cantdrag={true}></canvas>
                    <canvas
                        ref={regionCanvas!}
                        style={{ position: "absolute", "z-index": 998, visibility: `${shownRegions() ? "visible" : "hidden"}` }}
                        class="noSelect"></canvas>
                    <div
                        class={style.dot}
                        data-cantdrag={true}
                        style={{ transform: `translate(${-x()}px, ${-y()}px)`, "z-index": 999 }}
                        onMouseDown={onMouseDown}></div>
                </div>
                <div style={{ display: "grid", "grid-template-rows": "1fr 1fr 1fr 1fr 1fr", "place-items": "center" }}>
                    <div class="center">
                        <TextButton text="Show Region" checkbox={true} onClick={() => setShownRegions(pre => !pre)} />
                        <div style={{ width: "3rem" }}></div>
                        <FileInputButton text="Replace" accept=".png" onChange={handleFile} />
                    </div>
                    <TextInput title="X:" value={x()} labelStyle={{ width: "2rem" }} onChange={v => setX(v as number)} />
                    <TextInput title="Y:" value={y()} labelStyle={{ width: "2rem" }} onChange={v => setY(v as number)} />
                    <TextInput title="W:" value={w()} labelStyle={{ width: "2rem" }} readonly />
                    <TextInput title="H:" value={h()} labelStyle={{ width: "2rem" }} readonly />
                </div>
                <div style={{ display: "flex", "flex-direction": "row-reverse" }}>
                    <TextButton text="Save" classList={{ normalTextButton: true }} onClick={onSave} />
                </div>
            </div>
        </Popup>
    )
}
