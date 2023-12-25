import { For, Show, createEffect, createSignal, onCleanup, onMount } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { encode as gifEncode } from "modern-gif"
import _workerUrl from "modern-gif/worker?url"
const workerUrl = _workerUrl as unknown as string

import Pause from "~icons/mdi/pause"
import Play from "~icons/mdi/play"
import Previous from "~icons/mdi/skip-previous"
import Next from "~icons/mdi/skip-next"
import DownloadIcon from "~icons/mdi/download"
import CopyIcon from "~icons/mdi/content-copy"

import Select from "../components/Select"
import TextButton from "../components/TextButton"
import IconButton from "../components/IconButton"
import ZoomDragDiv from "../components/ZoomDragDiv"
import ProgressBar from "../components/ProgressBar"
import ColorPicker from "../components/ColorPicker"
import { playAnimation } from "./AnimViewer"
import { isHided, setShown as setHideLayerShown } from "./HideLayerViewer"
import { getMapSymbol, setShown as setSymbolMapVierwrShown } from "./SymbolMapViewer"

import { clamp } from "../lib/math"
import { downloadFile } from "../lib/util"
import { applyColorCube, newCanvas, paste, transform } from "../lib/image-canvas"
import { AnimElement, AnimFrame, Animation, Build, BuildFrame, BuildSymbol } from "../lib/kfiles"

import { UiData, builds } from "./data"
import { colorCubeNames, colorCubes } from "./data/colorCubes"

import style from "./AnimationViewer.module.css"

const [shownCollisionBox, SetShownCollisionBox] = createSignal<boolean>(false)

export const [colorCube, setColorCube] = createSignal<string>("")
export const [playIndex, setPlayIndex] = createSignal(0)
export const [frameNum, setFrameNum] = createSignal(1)
export const [pause, setPause] = createSignal(true)

export function refreshAnimation() {
    window.dispatchEvent(new CustomEvent("refreshAnimation"))
}

export function refreshBox() {
    window.dispatchEvent(new CustomEvent("refreshBox"))
}

const appliedColorCubeMap: { [name: string]: Map<HTMLCanvasElement, HTMLCanvasElement> } = {}
for (const name in colorCubes) {
    appliedColorCubeMap[name] = new Map<HTMLCanvasElement, HTMLCanvasElement>()
}

function getColorCubeCanvas(canvas: HTMLCanvasElement, name: string) {
    if (name === "") return canvas

    let applied = appliedColorCubeMap[name].get(canvas)
    if (!applied) {
        applied = applyColorCube(canvas, colorCubes[name])
        appliedColorCubeMap[name].set(canvas, applied)
    }
    return applied
}

function getBuildFrame(builds: UiData<Build, BuildSymbol, undefined>[], symbolName: string, frameNum: number) {
    const overSymbol = getMapSymbol(symbolName) || symbolName

    for (const buildUiData of builds) {
        if (!buildUiData.use) continue
        const symbolData = buildUiData.data.getSymbol(overSymbol)
        if (!symbolData) continue

        const [symbol, symbolIdx] = symbolData
        const symbolUIdata = buildUiData.sub[symbolIdx] as UiData<BuildSymbol, BuildFrame, Build>
        if (!symbolUIdata.use) continue

        const buildFrameData = symbol.getFrame(frameNum)
        if (!buildFrameData) return
        const [frame, frameIdx] = buildFrameData
        const frameUIdata = symbolUIdata.sub[frameIdx]
        if (!frameUIdata.use) return

        return frame
    }
}

async function renderFrame(animFrame: UiData<AnimFrame, AnimElement, Animation>) {
    let frameTop = Infinity
    let frameLeft = Infinity
    let frameBottom = -Infinity
    let frameRight = -Infinity

    const transfromedElement = []
    for (let i = animFrame.sub.length - 1; i >= 0; i--) {
        const element = animFrame.sub[i]

        if (!element.use) continue

        const { symbol, frameNum, layerName, a, b, c, d, tx, ty } = element.data as AnimElement

        if (isHided(layerName)) continue

        const buildFamre = getBuildFrame(builds, symbol, frameNum)

        if (!buildFamre) continue

        let { x, y, canvas } = buildFamre

        if (!canvas) continue

        const transfromed = transform(getColorCubeCanvas(canvas, colorCube()), a, b, c, d, 0, 0)
        if (!transfromed || transfromed.width <= 0 || transfromed.height <= 0) continue

        const offestX = tx + x * a + y * c
        const offestY = ty + x * b + y * d

        const elementTop = offestY - transfromed.height / 2
        const elementBottom = offestY + transfromed.height / 2
        const elementLeft = offestX - transfromed.width / 2
        const elementRight = offestX + transfromed.width / 2

        frameTop = Math.min(frameTop, elementTop)
        frameLeft = Math.min(frameLeft, elementLeft)
        frameBottom = Math.max(frameBottom, elementBottom)
        frameRight = Math.max(frameRight, elementRight)

        transfromedElement.push({ transfromed, elementLeft, elementTop })
    }

    return { frameLeft, frameTop, frameRight, frameBottom, transfromedElement }
}

function AnimationPlayer() {
    let frameRate = 30
    let druation = 1000 / frameRate

    const lineWidth = 2
    let collisionBoxCanvas: HTMLCanvasElement
    let collisionBoxContext: CanvasRenderingContext2D

    const [scale, setScale] = createSignal(1)
    const [deltaY, setDeltaY] = createSignal(0)
    const [deltaX, setDeltaX] = createSignal(0)
    const [layers, setLayers] = createStore<HTMLCanvasElement[]>([])

    function getNextIndex(index: number) {
        return (index + 1) % frameNum()
    }

    function getPreIndex(index: number) {
        if (index - 1 < 0) return Math.min(frameNum() - 1, 1)
        return (index - 1) % frameNum()
    }

    function preFrame() {
        setPlayIndex(getPreIndex(playIndex()))
    }

    function nextFrame() {
        setPlayIndex(getNextIndex(playIndex()))
    }

    function onClickprogress(percent: number) {
        setPlayIndex(clamp(Math.round(percent * (frameNum() - 1)), 0, frameNum() - 1))
    }

    function drawCollisionBox() {
        const animationUiData = playAnimation()
        const index = playIndex()

        if (!collisionBoxContext) if (!collisionBoxCanvas) return
        if (!collisionBoxContext) {
            collisionBoxContext = collisionBoxCanvas.getContext("2d")!
        }
        collisionBoxContext.clearRect(0, 0, collisionBoxCanvas.width, collisionBoxCanvas.height)

        if (!animationUiData) return

        const frameUIdata = animationUiData.sub[index]

        if (!frameUIdata) return

        const frameCollisionBox = frameUIdata.data

        const { x, y, w, h } = frameCollisionBox
        if (w + lineWidth * 2 >= collisionBoxCanvas.width) collisionBoxCanvas.width = w + lineWidth * 2
        if (h + lineWidth * 2 >= collisionBoxCanvas.height) collisionBoxCanvas.height = h + lineWidth * 2

        let boxX = x - w / 2 + collisionBoxCanvas.width / 2 - lineWidth
        let boxY = y - h / 2 + collisionBoxCanvas.height / 2 - lineWidth

        collisionBoxContext.strokeStyle = "red"
        collisionBoxContext.lineWidth = lineWidth
        collisionBoxContext.strokeRect(lineWidth, lineWidth, w, h)

        const s = scale()
        const dx = deltaX()
        const dy = deltaY()

        collisionBoxCanvas.style.translate = `${boxX * s + dx}px ${boxY * s + dy}px`
        collisionBoxCanvas.style.scale = `${s}`
    }

    function drawAnimation() {
        const animationUiData = playAnimation()

        const playframeIndex = playIndex()

        for (const [i, layer] of layers.entries()) {
            const ctx = layer.getContext("2d", { willReadFrequently: true })!
            ctx.clearRect(0, 0, layer.width, layer.height)

            if (!animationUiData) continue

            const animFrameUiData = animationUiData.sub[playframeIndex] as UiData<AnimFrame, AnimElement, Animation>

            if (!animFrameUiData || !animFrameUiData.use) continue

            const index = animFrameUiData.sub.length - 1 - i
            const elementUiData = animFrameUiData.sub[index]

            if (!elementUiData || !elementUiData.use) continue

            const { a, b, c, d, tx, ty, symbol, frameNum, layerName } = elementUiData.data

            if (isHided(layerName)) continue

            const buildFrame = getBuildFrame(builds, symbol, frameNum)
            if (buildFrame) {
                const s = scale()
                const dx = deltaX()
                const dy = deltaY()

                const originX = buildFrame.w / 2 - buildFrame.x
                const originY = buildFrame.h / 2 - buildFrame.y

                layer.width = buildFrame.w
                layer.height = buildFrame.h
                layer.style.transformOrigin = `${originX}px ${originY}px`
                layer.style.transform = `matrix(
                    ${a * s},
                    ${b * s},
                    ${c * s},
                    ${d * s},
                    ${tx * s + buildFrame.x + dx},
                    ${ty * s + buildFrame.y + dy}
                )`

                if (buildFrame.canvas) {
                    let canvas = getColorCubeCanvas(buildFrame.canvas, colorCube())
                    ctx.drawImage(canvas, 0, 0)
                }
            }
        }
    }

    function changeAnimation() {
        setPlayIndex(0)
        const animationUiData = playAnimation()

        if (!animationUiData) return

        setFrameNum(animationUiData.sub.length)
        frameRate = animationUiData.data.frameRate
        druation = 1000 / frameRate

        const layerNum = animationUiData.data.frames.reduce((max, frame) => Math.max(max, frame.elements.length), 0)
        if (layerNum <= layers.length) return

        setLayers(
            produce(pre => {
                const length = pre.length
                for (let i = length; i < layerNum; i++) {
                    const canvas = newCanvas(100, 100)
                    canvas.style.zIndex = String(i)
                    canvas.style.position = "absolute"
                    canvas.className = style.layer
                    pre.push(canvas)
                }
            })
        )
    }

    function onRefreshAnimation() {
        changeAnimation()
        drawAnimation()
    }

    function onCopy() {
        const animationUiData = playAnimation()
        const index = playIndex()
        if (!animationUiData) return

        renderFrame(animationUiData.sub[index]).then(({ frameLeft, frameTop, frameRight, frameBottom, transfromedElement }) => {
            const width = Math.round(frameRight - frameLeft)
            const height = Math.round(frameBottom - frameTop)
            if (width <= 0 || height <= 0) {
                return
            }

            const canvas = newCanvas(width, height)
            for (const { transfromed, elementLeft, elementTop } of transfromedElement) {
                paste(canvas, transfromed, elementLeft - frameLeft, elementTop - frameTop)
            }

            canvas.toBlob(async blob => {
                const clipboardItem = new ClipboardItem({ "image/png": blob! })
                navigator.clipboard.write([clipboardItem])
            })
        })
    }

    async function onDownload() {
        const animationUiData = playAnimation()
        if (!animationUiData) return

        let animationTop = Infinity
        let animationLeft = Infinity
        let animationBottom = -Infinity
        let animationRight = -Infinity

        const delay = 1000 / animationUiData.data.frameRate
        const framesData = []
        for (const [index, animFrameUiData] of animationUiData.sub.entries()) {
            if (!animFrameUiData.use) continue
            const { frameLeft, frameTop, frameRight, frameBottom, transfromedElement } = await renderFrame(animFrameUiData)
            framesData[index] = { transfromedElement, frameLeft, frameTop }

            animationTop = Math.min(frameTop, animationTop)
            animationLeft = Math.min(frameLeft, animationLeft)
            animationBottom = Math.max(frameBottom, animationBottom)
            animationRight = Math.max(frameRight, animationRight)
        }

        const width = Math.round(animationRight - animationLeft)
        const height = Math.round(animationBottom - animationTop)
        if (width <= 0 || height <= 0) {
            return
        }

        const frames: { imageData: HTMLCanvasElement; delay: number }[] = []
        for (const frameData of framesData) {
            const imageData = newCanvas(width, height)
            frames.push({ imageData, delay })

            if (!frameData) continue

            for (const { transfromed, elementLeft, elementTop } of frameData.transfromedElement) {
                paste(imageData, transfromed, elementLeft - animationLeft, elementTop - animationTop)
            }
        }

        gifEncode({ workerUrl, width, height, frames }).then(output =>
            downloadFile(new Blob([output], { type: "image/gif" }), `${animationUiData.data.name}.gif`)
        )
    }

    createEffect(drawAnimation)
    createEffect(drawCollisionBox)
    createEffect(changeAnimation)

    onMount(() => {
        window.addEventListener("refreshAnimation", onRefreshAnimation)
        window.addEventListener("refreshBox", drawCollisionBox)
    })

    onCleanup(() => {
        window.removeEventListener("refreshAnimation", onRefreshAnimation)
        window.removeEventListener("refreshBox", drawCollisionBox)
    })

    let startTime: number | undefined = undefined
    function playFrame(timeStamp: number) {
        startTime = startTime || timeStamp
        const elapsed = timeStamp - startTime

        if (elapsed >= druation) {
            startTime = timeStamp
            if (!pause()) nextFrame()
        }
        requestAnimationFrame(playFrame)
    }
    requestAnimationFrame(playFrame)

    return (
        <>
            <ZoomDragDiv
                dragable={true}
                zoomable={true}
                customResize={() => {
                    setDeltaX(0)
                    setDeltaY(0)
                    setScale(1)
                }}
                customDrag={(dx, dy) => {
                    setDeltaX(dx)
                    setDeltaY(dy)
                }}
                customZoom={scale => setScale(scale)}
                style={{ position: "relative", overflow: "hidden" }}
                classList={{ ["center"]: true }}>
                <canvas
                    ref={collisionBoxCanvas!}
                    style={{ position: "absolute", "z-index": 997, visibility: `${shownCollisionBox() ? "visible" : "hidden"}` }}
                    class="noSelect"
                    width={500}
                    height={500}></canvas>
                <For each={layers}>{layer => layer}</For>
            </ZoomDragDiv>

            <div class="center" style={{ position: "absolute", top: 0, right: 0, "z-index": 998 }}>
                <IconButton icon={CopyIcon} classList={{ [style.downloadButton]: true }} onClick={onCopy} />
                <IconButton icon={DownloadIcon} classList={{ [style.downloadButton]: true }} onClick={onDownload} />
            </div>

            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, "z-index": 998 }} class={style.AnimationPlayerBar}>
                <IconButton icon={Previous} classList={{ [style.controlButton]: true }} onClick={preFrame} />
                <Show // pause
                    when={pause()}
                    fallback={<IconButton icon={Pause} classList={{ [style.controlButton]: true }} onClick={() => setPause(true)} />}>
                    <IconButton icon={Play} classList={{ [style.controlButton]: true }} onClick={() => setPause(false)} />
                </Show>
                <IconButton icon={Next} classList={{ [style.controlButton]: true }} onClick={nextFrame} />
                <div>{`${playIndex()}/${frameNum() - 1}`}</div>
                <ProgressBar onClickprogress={onClickprogress} progressValue={frameNum() === 0 ? 1 : (playIndex() + 1) / frameNum()} />
            </div>
        </>
    )
}

export default function AnimationViewer() {
    const [color, setColor] = createSignal<string>("#C8C8C8")

    return (
        <div style={{ height: "100%", display: "grid", "grid-template-columns": "auto 10rem" }}>
            <div style={{ position: "relative", "background-color": color() }} class={style.animationPlayer}>
                <AnimationPlayer />
            </div>
            <div>
                <ColorPicker defauleColor={color()} onChange={color => setColor(color)} />
                <TextButton checkbox={true} text={"CollisionBox"} onClick={() => SetShownCollisionBox(pre => !pre)}></TextButton>
                <Select onChange={e => setColorCube(e.target.value)} options={[{ name: "ColorCube", value: "" }, ...colorCubeNames]}></Select>
                <TextButton text={"Hide Layer"} onClick={() => setHideLayerShown(pre => !pre)}></TextButton>
                <TextButton text={"Override Symbol"} onClick={() => setSymbolMapVierwrShown(pre => !pre)}></TextButton>
            </div>
        </div>
    )
}
