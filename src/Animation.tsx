import { JSX, createSignal, createMemo, createEffect, onMount, onCleanup, Show, For } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { Animation, AnimElement } from "./lib/kfiles/anim"
import { BuildFrame, BuildSymbol } from "./lib/kfiles/build"
import { newCanvas, applyColourCube, transform, paste } from "./lib/image-canvas"
import { encodeDownload } from "./lib/gif"
import { clamp } from "./lib/math"

import Pause from "~icons/mdi/pause"
import Play from "~icons/mdi/play"
import Previous from "~icons/mdi/skip-previous"
import Next from "~icons/mdi/skip-next"
import ColorPickerIcon from "~icons/mdi/palette"
import DownloadIcon from "~icons/mdi/download"

import { Popup } from "./components/Popup"
import { IconButton } from "./components/IconButton"
import ZoomDragDiv from "./components/ZoomDragDiv"

import { builds, playAnimation, colourCube } from "./data"
import { colourCubes } from "./data/colour_cubes"
import { SelectColourCube } from "./AnimTool/colour_cube"
import { isHided, HideLayer } from "./AnimTool/HideLayer"
import { OverrideSymbol, mapSymbol } from "./AnimTool/OverrideSymbol"

import style from "./Animation.module.css"

function getBuildFrame(symbol_name: string, frame_num: number) {
    for (const build of builds) {
        if (!build.sub || !build.shown) {
            continue
        }

        for (const symbol of build.sub!) {
            if (!symbol.sub || !symbol.shown || (symbol.data as BuildSymbol).name !== symbol_name) {
                continue
            }

            for (const frame of symbol.sub) {
                const frameData = frame.data as BuildFrame
                const duration = frameData.duration
                const _frame_num = frameData.frame_num
                if (_frame_num <= frame_num && frame_num < _frame_num + duration) {
                    return frame
                }
            }
        }
    }
}

function AnimationPlayer() {
    let animCanvas: HTMLCanvasElement
    let animCanvascontext: CanvasRenderingContext2D
    let progress: HTMLDivElement

    let renderedIndex = 0
    let frameRate = 30
    let frameDuration = 1000 / frameRate
    let frameTop = Infinity
    let frameLeft = Infinity

    let [frameIndex, setFrameIndex] = createSignal(0)
    let [frameNum, setFrameNum] = createSignal(1)
    let [renderedFrames, setRenderFrames] = createStore<(HTMLCanvasElement | undefined)[]>([])

    const [pause, setPause] = createSignal(true)

    function onClickprogress(e: MouseEvent) {
        const progressBoundingClientRect = progress.getBoundingClientRect()

        const offsetX = e.clientX - progressBoundingClientRect.left
        const percent = offsetX / progressBoundingClientRect.width

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

    function calculateFrameBorder() {
        const animation = playAnimation()

        if (!animation || !animation.sub) {
            return
        }

        frameTop = Infinity
        frameLeft = Infinity
        let frameBottom = -Infinity
        let frameRight = -Infinity

        for (const animFrame of animation.sub) {
            if (!animFrame.sub) {
                continue
            }

            for (let i = animFrame.sub.length - 1; i >= 0; i--) {
                const animElement = animFrame.sub[i]
                const { symbol, frame, m_a, m_b, m_c, m_d, m_tx, m_ty } = animElement.data as AnimElement

                const overSymbol = mapSymbol(symbol) || symbol
                const buildFamre = getBuildFrame(overSymbol, frame)

                if (!buildFamre) {
                    continue
                }

                let { x, y, canvas } = buildFamre.data as BuildFrame

                if (!canvas) {
                    continue
                }

                const borderX = [0, canvas.width * m_a, canvas.height * m_c, canvas.width * m_a + canvas.height * m_c]
                const borderY = [0, canvas.width * m_b, canvas.height * m_d, canvas.width * m_b + canvas.height * m_d]
                const transformedWidth = Math.round(Math.max(...borderX) - Math.min(...borderX))
                const transformedHeight = Math.round(Math.max(...borderY) - Math.min(...borderY))

                if (transformedWidth <= 0 || transformedHeight <= 0) {
                    continue
                }

                const offestX = m_tx + x * m_a + y * m_c
                const offestY = m_ty + x * m_b + y * m_d

                const elementTop = offestY - transformedHeight / 2
                const elementBottom = offestY + transformedHeight / 2
                const elementLeft = offestX - transformedWidth / 2
                const elementRight = offestX + transformedWidth / 2

                frameTop = Math.min(frameTop, elementTop)
                frameBottom = Math.max(frameBottom, elementBottom)
                frameLeft = Math.min(frameLeft, elementLeft)
                frameRight = Math.max(frameRight, elementRight)
            }
        }

        animCanvas.width = Math.round(frameRight - frameLeft)
        animCanvas.height = Math.round(frameBottom - frameTop)
    }

    function isRendered(index: number) {
        return renderedFrames[index] !== undefined
    }

    async function renderFrame(index: number) {
        if (isRendered(index) || animCanvas.width <= 0 || animCanvas.height <= 0) {
            return
        }

        const animation = playAnimation()
        if (!animation || !animation.sub) {
            return
        }

        const animFrame = animation.sub[index]
        if (!animFrame.shown || !animFrame.sub) {
            return
        }

        const renderedFrame = newCanvas(animCanvas.width, animCanvas.height)
        for (let i = animFrame.sub!.length - 1; i >= 0; i--) {
            const element = animFrame.sub![i]

            if (!element.shown) {
                continue
            }

            const { symbol, frame, layer_name: layer, m_a, m_b, m_c, m_d, m_tx, m_ty } = element.data as AnimElement

            if (isHided(layer)) {
                continue
            }

            const overSymbol = mapSymbol(symbol) || symbol
            const buildFamre = getBuildFrame(overSymbol, frame)

            if (!buildFamre || !buildFamre.shown) {
                continue
            }

            let { x, y, w, h, canvas } = buildFamre.data as BuildFrame

            if (!canvas) {
                continue
            }
            const colourCubeKtex = colourCubes[colourCube()]
            if (colourCubeKtex) {
                canvas = applyColourCube(canvas, colourCubeKtex)
            }

            const transfromed = transform(canvas, m_a, m_b, m_c, m_d, 0, 0)
            if (!transfromed || transfromed.width <= 0 || transfromed.height <= 0) {
                continue
            }

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
        if (!animCanvas) {
            return
        }

        if (!animCanvascontext) {
            animCanvascontext = animCanvas.getContext("2d", { willReadFrequently: true })!
        }
        const renderedFrame = renderedFrames[frameIndex()]
        animCanvascontext.clearRect(0, 0, animCanvas.width, animCanvas.height)
        if (renderedFrame) {
            animCanvascontext.drawImage(renderedFrame, 0, 0)
        }
    })

    createMemo(async () => {
        const animation = playAnimation()

        if (!animCanvas || !animation || !animation.sub) {
            return
        }

        setFrameIndex(0)
        setFrameNum(animation.sub.length)
        frameRate = (animation.data as Animation).frameRate
        frameDuration = 1000 / frameRate
        await onUpdateAnimation()
    })

    onMount(() => {
        addEventListener("downloadAnim", onDownloadAnim)
        addEventListener("updateColourCube", onUpdateAnimation)
        addEventListener("updateAnimation", onUpdateAnimation)
    })

    onCleanup(() => {
        removeEventListener("downloadAnim", onDownloadAnim)
        removeEventListener("updateColourCube", onUpdateAnimation)
        removeEventListener("updateAnimation", onUpdateAnimation)
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

            if (!pause()) {
                nextFrame()
            }

            startTime = timeStamp
        }
        requestAnimationFrame(playAnim)
    }
    requestAnimationFrame(playAnim)

    return (
        <>
            <ZoomDragDiv dragable={true} zoomable={true} classList={{ [style.AnimationPlayer]: true }}>
                <canvas ref={animCanvas!}></canvas>
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
                <div class={style.progress} onClick={onClickprogress} ref={progress!}>
                    <div class={style.progressValue} style={`width: ${frameNum() === 0 ? 1 : ((frameIndex() + 1) / frameNum()) * 100}%`}></div>
                </div>
            </div>
        </>
    )
}

export default function AnimationArea() {
    let colorInput: HTMLInputElement

    const [color, setColor] = createSignal<string>("#C8C8C8")

    function onPickColor(e: JSX.InputChangeEvent) {
        setColor(e.target.value)
    }

    function onClick() {
        dispatchEvent(new CustomEvent("downloadAnim"))
    }

    return (
        <div class={style.Animation}>
            <div class={style.animationContainer} style={{ "background-color": color() }}>
                <AnimationPlayer />
                <IconButton icon={DownloadIcon} classList={{ [style.downloadButton]: true }} onClick={onClick} />
            </div>
            <div class={style.toolMenu}>
                <div class={style.colorPicker}>
                    <IconButton icon={ColorPickerIcon} onClick={() => colorInput.click()} classList={{ [style.colorPickerIcon]: true }} />
                    <input type="color" value={color()} onInput={onPickColor} ref={colorInput!} />
                </div>
                <div>
                    <SelectColourCube />
                </div>
                <div>
                    <Popup buttonText={"OverrideSymbol"} buttonClassList={{ [style.toolButton]: true }} classList={{ [style.Popup]: true }}>
                        <OverrideSymbol />
                    </Popup>
                </div>
                <div>
                    <Popup buttonText={"HideLayer"} buttonClassList={{ [style.toolButton]: true }} classList={{ [style.Popup]: true }}>
                        <HideLayer />
                    </Popup>
                </div>
            </div>
        </div>
    )
}
