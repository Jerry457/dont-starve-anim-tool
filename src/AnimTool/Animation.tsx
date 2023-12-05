import { createSignal, createEffect, onMount, onCleanup, Show } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { Animation, AnimElement, AnimFrame } from "../lib/kfiles/anim"
import { BuildFrame, BuildSymbol } from "../lib/kfiles/build"
import { newCanvas, applyColorCube, transform, paste } from "../lib/image-canvas"
import { encodeDownload } from "../lib/gif"
import { clamp } from "../lib/math"

import Pause from "~icons/mdi/pause"
import Play from "~icons/mdi/play"
import Previous from "~icons/mdi/skip-previous"
import Next from "~icons/mdi/skip-next"
import DownloadIcon from "~icons/mdi/download"

import Popup from "../components/Popup"
import IconButton from "../components/IconButton"
import TextButton from "../components/TextButton"
import ColorPicker from "../components/ColorPicker"
import ProgressBar from "../components/ProgressBar"
import ZoomDragDiv from "../components/ZoomDragDiv"
import { RowData } from "../components/DataViewer"

import { builds, playAnimation, playFrame } from "./data"
import { colorCubes } from "./data/colorCubes"
import { SelectColorCube } from "./SelectColorCube"
import { isHided, HideLayer } from "./HideLayer"
import { OverrideSymbol, mapSymbol } from "./OverrideSymbol"

import style from "./Animation.module.css"

const [showCollisionBox, SetShowCollisionBox] = createSignal<boolean>(false)
const transfromedElements = new Map<HTMLCanvasElement, { m_a: number; m_b: number; m_c: number; m_d: number; transfromed: HTMLCanvasElement }[]>()

function transfromElement(origin: HTMLCanvasElement, m_a: number, m_b: number, m_c: number, m_d: number) {
    let transfromeds = transfromedElements.get(origin)
    if (transfromeds) {
        for (const element of transfromeds) {
            if (m_a === element.m_a && m_b === element.m_b && m_c === element.m_c && m_d === element.m_d) {
                return element.transfromed
            }
        }
    }
    const transfromed = transform(origin, m_a, m_b, m_c, m_d, 0, 0)
    if (transfromed) {
        if (!transfromeds) {
            transfromeds = []
            transfromedElements.set(origin, transfromeds)
        }
        transfromeds.push({ m_a, m_b, m_c, m_d, transfromed })
        return transfromed
    }
}

function getBuildFrame(symbol_name: string, frame_num: number) {
    for (const build of builds) {
        if (!build.sub || !build.shown) continue

        for (const symbol of build.sub!) {
            if (!symbol.sub || !symbol.shown || (symbol.data as BuildSymbol).name.toLowerCase() !== symbol_name.toLowerCase()) {
                continue
            }

            for (const frame of symbol.sub) {
                const frameData = frame.data as BuildFrame
                const duration = frameData.duration
                const _frame_num = frameData.frameNum
                if (_frame_num <= frame_num && frame_num < _frame_num + duration) {
                    return frame
                }
            }
        }
    }
}

function AnimationPlayer() {
    let animCanvas: HTMLCanvasElement
    let frameCollisionBoxCanvas: HTMLCanvasElement
    let animCanvasContext: CanvasRenderingContext2D
    let animCollisionBoxContext: CanvasRenderingContext2D

    let renderedIndex = 0
    let frameRate = 30
    let frameDuration = 1000 / frameRate
    let frameTop = Infinity
    let frameLeft = Infinity
    let lastAnimation = ""
    let colorCube = ""
    let renderedcolorCubeFrames: (HTMLCanvasElement | undefined)[] = []

    const [frameIndex, setFrameIndex] = createSignal(0)
    const [frameNum, setFrameNum] = createSignal(1)
    const [renderedFrames, setRenderFrames] = createStore<(HTMLCanvasElement | undefined)[]>([])
    const [frameCollisions, setFrameCollisions] = createStore<{ x: number; y: number; w: number; h: number }[]>([])

    const [pause, setPause] = createSignal(true)

    function onClickprogress(percent: number) {
        setFrameIndex(clamp(Math.round(percent * (frameNum() - 1)), 0, frameNum() - 1))
    }

    function getNextFrameIndex(index: number) {
        return (index + 1) % frameNum()
    }

    function getPreFrameIndex(index: number) {
        return Math.max(index - 1, 0) % frameNum()
    }

    function nextFrame() {
        setFrameIndex(getNextFrameIndex(frameIndex()))
    }

    function preFrame() {
        setFrameIndex(getPreFrameIndex(frameIndex()))
    }

    function onFrameRateChange() {
        const animation = playAnimation()

        if (!animation) return

        const data = animation.data as Animation
        frameRate = data.frameRate
        frameDuration = 1000 / frameRate
    }

    function onFrameBorderChange(e: Event) {
        const { index, row } = (e as CustomEvent<{ index: number; row: RowData }>).detail
        const { x, y, w, h } = row.data as AnimFrame
        setFrameCollisions(produce(pre => (pre[index] = { x, y, w, h })))
    }

    function onColorCubeChange(e: Event) {
        colorCube = (e as CustomEvent<{ colorCube: string }>).detail.colorCube
        renderedcolorCubeFrames = []
        drawFrame(frameIndex())
    }

    function calculateFrameBorder(calculateWithBuild: boolean = true) {
        const animation = playAnimation()

        if (!animation || !animation.sub!) return

        if (calculateWithBuild) {
            frameTop = Infinity
            frameLeft = Infinity
        }
        let frameBottom = -Infinity
        let frameRight = -Infinity

        const frameCollisions: { x: number; y: number; w: number; h: number }[] = []

        for (const animFrame of animation.sub) {
            const { x, y, w, h } = animFrame.data as AnimFrame
            frameCollisions.push({ x, y, w, h })

            if (!calculateWithBuild || !animFrame.sub) continue

            for (let i = animFrame.sub.length - 1; i >= 0; i--) {
                const animElement = animFrame.sub[i]
                const { symbol, frameNum, m_a, m_b, m_c, m_d, m_tx, m_ty } = animElement.data as AnimElement

                const overSymbol = mapSymbol(symbol) || symbol
                const buildFrame = getBuildFrame(overSymbol, frameNum)

                if (!buildFrame) continue

                const { x, y, canvas } = buildFrame.data as BuildFrame

                if (!canvas) continue

                const borderX = [0, canvas.width * m_a, canvas.height * m_c, canvas.width * m_a + canvas.height * m_c]
                const borderY = [0, canvas.width * m_b, canvas.height * m_d, canvas.width * m_b + canvas.height * m_d]
                const transformedWidth = Math.round(Math.max(...borderX) - Math.min(...borderX))
                const transformedHeight = Math.round(Math.max(...borderY) - Math.min(...borderY))

                if (transformedWidth <= 0 || transformedHeight <= 0) continue

                const offsetX = m_tx + x * m_a + y * m_c
                const offsetY = m_ty + x * m_b + y * m_d

                const elementTop = offsetY - transformedHeight / 2
                const elementBottom = offsetY + transformedHeight / 2
                const elementLeft = offsetX - transformedWidth / 2
                const elementRight = offsetX + transformedWidth / 2

                frameTop = Math.min(frameTop, elementTop)
                frameBottom = Math.max(frameBottom, elementBottom)
                frameLeft = Math.min(frameLeft, elementLeft)
                frameRight = Math.max(frameRight, elementRight)
            }
        }

        const width = Math.round(frameRight - frameLeft)
        const height = Math.round(frameBottom - frameTop)
        if (width > 0 && height > 0) {
            animCanvas.width = width
            animCanvas.height = height
        }

        setFrameCollisions(frameCollisions)
    }

    function drawFrame(index: number) {
        const animation = playAnimation()
        if (!animation || !animation.sub || !animation.sub[index]) return

        const animFrame = animation.sub[index]

        if (!animCanvasContext) {
            if (!animCanvas) return
            animCanvasContext = animCanvas.getContext("2d", { willReadFrequently: true })!
        }

        animCanvasContext.clearRect(0, 0, animCanvas.width, animCanvas.height)

        let renderedFrame = renderedFrames[index]
        if (renderedFrame && animFrame.shown) {
            if (colorCube !== "") {
                if (renderedcolorCubeFrames[index]) renderedFrame = renderedcolorCubeFrames[index]!
                else {
                    const colorCubeKtex = colorCubes[colorCube]!
                    renderedFrame = applyColorCube(renderedFrame, colorCubeKtex)
                    renderedcolorCubeFrames[index] = renderedFrame
                }
            }

            animCanvasContext.drawImage(renderedFrame, 0, 0)
        }
    }

    function drawFrameCollisionBox(index: number) {
        if (!animCanvas) return
        if (!animCollisionBoxContext) if (!frameCollisionBoxCanvas) return
        animCollisionBoxContext = frameCollisionBoxCanvas.getContext("2d", { willReadFrequently: true })!
        animCollisionBoxContext.strokeStyle = "red"
        animCollisionBoxContext.lineWidth = 5

        animCollisionBoxContext.clearRect(0, 0, frameCollisionBoxCanvas.width, frameCollisionBoxCanvas.height)
        const frameCollisionBox = frameCollisions[index]
        if (frameCollisionBox) {
            const { x, y, w, h } = frameCollisionBox
            if (w >= frameCollisionBoxCanvas.width) frameCollisionBoxCanvas.width = w * 2
            if (h >= frameCollisionBoxCanvas.height) frameCollisionBoxCanvas.height = h * 2

            let boxX = x - w / 2 + frameCollisionBoxCanvas.width / 2 + (-animCanvas.width / 2 - frameLeft)
            let boxY = y - h / 2 + frameCollisionBoxCanvas.height / 2 + (-animCanvas.height / 2 - frameTop)

            animCollisionBoxContext.strokeRect(boxX, boxY, w, h)
        }
    }

    function isRendered(index: number) {
        return renderedFrames[index] !== undefined
    }

    async function renderFrame(index: number) {
        if (isRendered(index) || animCanvas.width <= 0 || animCanvas.height <= 0) return

        const animation = playAnimation()
        if (!animation || !animation.sub) return

        const animFrame = animation.sub[index]
        if (!animFrame.sub) return

        const renderedFrame = newCanvas(animCanvas.width, animCanvas.height)
        for (let i = animFrame.sub!.length - 1; i >= 0; i--) {
            const element = animFrame.sub![i]

            if (!element.shown) continue

            const { symbol, frameNum, layerName: layer, m_a, m_b, m_c, m_d, m_tx, m_ty } = element.data as AnimElement

            if (isHided(layer)) continue

            const overSymbol = mapSymbol(symbol) || symbol
            const buildFamre = getBuildFrame(overSymbol, frameNum)

            if (!buildFamre || !buildFamre.shown) continue

            let { x, y, w, h, canvas } = buildFamre.data as BuildFrame

            if (!canvas) continue

            const transfromed = transfromElement(canvas, m_a, m_b, m_c, m_d)
            if (!transfromed || transfromed.width <= 0 || transfromed.height <= 0) continue

            const offestX = m_tx + x * m_a + y * m_c
            const offestY = m_ty + x * m_b + y * m_d

            const elementTop = offestY - transfromed.height / 2
            // const elementBottom = offestY + transfromed.height / 2
            const elementLeft = offestX - transfromed.width / 2
            // const elementRight = offestX + transfromed.width / 2

            paste(renderedFrame, transfromed, elementLeft - frameLeft, elementTop - frameTop)
        }
        // paste(renderFrame, canvas, offestX - left, offestY - top)
        setRenderFrames(produce(pre => (pre[index] = renderedFrame)))
    }

    async function onUpdateAnimation() {
        renderedcolorCubeFrames = []
        setRenderFrames([])
        calculateFrameBorder()
        renderedIndex = 0
    }

    async function onDownloadAnim() {
        const animation = playAnimation()
        if (!animation) return
        encodeDownload((animation.data as Animation).name, animCanvas.width, animCanvas.height, frameDuration, renderedFrames)
    }

    createEffect(() => {
        const index = frameIndex()
        drawFrame(index)
    })

    createEffect(() => {
        if (showCollisionBox()) {
            drawFrameCollisionBox(frameIndex())
        }
    })

    createEffect(() => {
        setFrameIndex(playFrame())
    })

    createEffect(async () => {
        const animation = playAnimation()

        if (!animCanvas || !animation || !animation.sub) return

        const data = animation.data as Animation

        if (lastAnimation !== data.name) {
            setFrameIndex(0)
            lastAnimation = data.name
        }

        setFrameNum(animation.sub.length)
        frameRate = data.frameRate
        frameDuration = 1000 / frameRate
        onUpdateAnimation()
    })

    onMount(() => {
        addEventListener("frameRateChange", onFrameRateChange)
        addEventListener("frameBorderChange", onFrameBorderChange)
        addEventListener("colorCubeChange", onColorCubeChange)

        addEventListener("downloadAnim", onDownloadAnim)
        addEventListener("reRendering", onUpdateAnimation)
    })

    onCleanup(() => {
        removeEventListener("frameRateChange", onFrameRateChange)
        removeEventListener("frameBorderChange", onFrameBorderChange)
        removeEventListener("colorCubeChange", onColorCubeChange)

        removeEventListener("downloadAnim", onDownloadAnim)
        removeEventListener("reRendering", onUpdateAnimation)
    })

    let startTime: number | undefined = undefined
    async function playAnim(timeStamp: number) {
        startTime = startTime || timeStamp
        const elapsed = timeStamp - startTime
        if (elapsed >= frameDuration) {
            if (!isRendered(frameIndex())) {
                renderedIndex = frameIndex()
                await renderFrame(renderedIndex)
            }
            renderedIndex = getNextFrameIndex(renderedIndex)
            renderFrame(renderedIndex)

            if (!pause()) nextFrame()

            startTime = timeStamp
        }
        requestAnimationFrame(playAnim)
    }
    requestAnimationFrame(playAnim)

    return (
        <>
            <ZoomDragDiv dragable={true} zoomable={true} classList={{ [style.AnimationPlayer]: true }}>
                <canvas ref={animCanvas!} class={style.animCanvas}></canvas>
                <Show when={showCollisionBox()}>
                    <canvas ref={frameCollisionBoxCanvas!} class={style.frameCollisionBoxCanvas} width={1000} height={1000}></canvas>
                </Show>
            </ZoomDragDiv>
            <div class={style.AnimationPlayerBar}>
                <IconButton icon={Previous} classList={{ [style.controlButton]: true }} onClick={preFrame} />
                <Show // pause
                    when={pause()}
                    fallback={<IconButton icon={Pause} classList={{ [style.controlButton]: true }} onClick={() => setPause(true)} />}>
                    <IconButton icon={Play} classList={{ [style.controlButton]: true }} onClick={() => setPause(false)} />
                </Show>
                <IconButton icon={Next} classList={{ [style.controlButton]: true }} onClick={nextFrame} />
                <div>{`${frameIndex()}/${frameNum() - 1}`}</div>
                <ProgressBar onClickprogress={onClickprogress} progressValue={frameNum() === 0 ? 1 : (frameIndex() + 1) / frameNum()} />
            </div>
        </>
    )
}

export default function AnimationArea() {
    const [color, setColor] = createSignal<string>("#C8C8C8")

    function onClick() {
        dispatchEvent(new CustomEvent("downloadAnim"))
    }

    return (
        <div class={style.Animation}>
            <div class={style.animationContainer} style={{ "background-color": color() }}>
                <AnimationPlayer />
                <IconButton icon={DownloadIcon} classList={{ [style.downloadButton]: true }} onClick={onClick} />
                <input type="checkbox" />
            </div>
            <div class={style.toolMenu}>
                <ColorPicker defauleColor={color()} onChange={color => setColor(color)} />
                <div>
                    <TextButton
                        checkbox={true}
                        text={"CollisionBox"}
                        classList={{ [style.toolButton]: true }}
                        onClick={() => {
                            SetShowCollisionBox(pre => !pre)
                        }}></TextButton>
                </div>
                <div>
                    <SelectColorCube />
                </div>
                <div>
                    <Popup buttonText={"HideLayer"} buttonClassList={{ [style.toolButton]: true }} classList={{ [style.hideLayerPopup]: true }}>
                        <HideLayer />
                    </Popup>
                </div>
                <div>
                    <Popup
                        buttonText={"OverrideSymbol"}
                        buttonClassList={{ [style.toolButton]: true }}
                        classList={{ [style.overrideSymbolPopup]: true }}>
                        <OverrideSymbol />
                    </Popup>
                </div>
            </div>
        </div>
    )
}
