import { JSX, createSignal, createMemo, onMount, onCleanup, Show, For } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { Animation, AnimElement } from "./lib/kfiles/anim"
import { Build, BuildFrame, BuildSymbol } from "./lib/kfiles/build"
import { clamp } from "./lib/math"

import Pause from "~icons/mdi/pause"
import Play from "~icons/mdi/play"
import Previous from "~icons/mdi/skip-previous"
import Next from "~icons/mdi/skip-next"
import ColorPickerIcon from "~icons/mdi/palette"

import { Popup } from "./components/Popup"
import { IconButton } from "./components/IconButton"
import { playAnimation, builds, hideLayers } from "./data/ui_data"
import { isHided, HideLayer } from "./AnimTool/HideLayer"
import { OverrideSymbol, mapSymbol } from "./AnimTool/OverrideSymbol"
import ZoomDragDiv from "./components/ZoomDragDiv"

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
    const [pause, setPause] = createSignal(true)

    let div: HTMLDivElement
    let progress: HTMLDivElement

    let [frameIndex, setFrameIndex] = createSignal(0)
    let [frameNum, setFrameNum] = createSignal(1)
    let frameRate: number = 30
    let frameDuration: number = 1000 / frameRate
    let [frames, setFrames] = createStore<HTMLImageElement[][]>([])

    function onClickprogress(e: MouseEvent) {
        const progressBoundingClientRect = progress.getBoundingClientRect()

        const offsetX = e.clientX - progressBoundingClientRect.left
        const percent = offsetX / progressBoundingClientRect.width

        setFrameIndex(clamp(Math.round(percent * (frameNum() - 1)), 0, frameNum() - 1))
    }

    function nextFrame() {
        setFrameIndex((frameIndex() + 1) % frameNum())
    }

    function previousFrame() {
        setFrameIndex(Math.max(frameIndex() - 1, 0) % frameNum())
    }

    async function renderFrame(frameIndex: number) {
        const animation = playAnimation()
        if (frames[frameIndex] || !animation || !animation.sub) {
            return
        }

        const animFrame = animation.sub[frameIndex]
        if (!animFrame || !animFrame.shown || !animFrame.sub) {
            return
        }

        const animElements = animFrame.sub
        let renderFrames: HTMLImageElement[] = []
        for (const [indxex, element] of animElements.entries()) {
            const { symbol, frame, layer_name: layer, m_a, m_b, m_c, m_d, m_tx, m_ty } = element.data as AnimElement

            if (isHided(layer)) {
                continue
            }

            const overSymbol = mapSymbol(symbol) || symbol
            const buildFamre = getBuildFrame(overSymbol, frame)

            if (!buildFamre || !buildFamre.shown) {
                continue
            }

            const { x, y, w, h, imageURL } = buildFamre.data as BuildFrame

            const img = document.createElement("img")
            img.src = imageURL!
            img.style.position = "absolute"
            img.style.transformOrigin = `${w / 2 - x}px ${h / 2 - y}px`
            img.style.transform = `matrix(${m_a}, ${m_b}, ${m_c}, ${m_d}, ${m_tx + x}, ${m_ty + y})`
            img.style.zIndex = `${animElements.length - indxex}`
            renderFrames.push(img)
            // const transfromed = transform(canvas!, m_a, m_b, m_c, m_d, 0, 0)
            // const offestX = m_tx + x * m_a + y * m_c
            // const offestY = m_ty + x * m_b + y * m_d

            // const elementTop = offestY - transfromed.height / 2
            // const elementBottom = offestY + transfromed.height / 2
            // const elementLeft = offestX - transfromed.width / 2
            // const elementRight = offestX + transfromed.width / 2

            // elementDatas.push({ canvas: transfromed, offestX: elementLeft, offestY: elementTop })

            // top = Math.min(top, elementTop)
            // bottom = Math.max(bottom, elementBottom)
            // left = Math.min(left, elementLeft)
            // right = Math.max(right, elementRight)
        }

        setFrames(
            produce(pre => {
                pre[frameIndex] = renderFrames
            })
        )
    }

    function onUpdate() {
        setFrames([])
    }

    createMemo(() => {
        const animation = playAnimation()

        if (!animation || !animation.sub) {
            return
        }

        setFrameIndex(0)
        setFrameNum(animation.sub.length)
        frameRate = (animation.data as Animation).frameRate
        frameDuration = 1000 / frameRate
        onUpdate()
    })

    onMount(() => {
        addEventListener("dataChange", onUpdate)
    })

    onCleanup(() => {
        removeEventListener("dataChange", onUpdate)
    })

    let startTime: number | undefined = undefined
    function playAnim(timeStamp: number) {
        startTime = startTime || timeStamp
        const elapsed = timeStamp - startTime
        if (elapsed >= frameDuration) {
            renderFrame((frameIndex() - 1) % frameNum())
            renderFrame(frameIndex())
            renderFrame((frameIndex() + 1) % frameNum())
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
            <ZoomDragDiv dragable={true} zoomable={true}>
                <div class={style.AnimationPlayer} ref={div!}>
                    {...frames[frameIndex()]}
                </div>
            </ZoomDragDiv>
            <div class={style.AnimationPlayerBar}>
                <IconButton icon={Previous} classList={{ [style.control_button]: true }} onClick={previousFrame} />
                <Show // pause
                    when={pause()}
                    fallback={<IconButton icon={Pause} classList={{ [style.control_button]: true }} onClick={() => setPause(true)} />}>
                    <IconButton icon={Play} classList={{ [style.control_button]: true }} onClick={() => setPause(false)} />
                </Show>
                <IconButton icon={Next} classList={{ [style.control_button]: true }} onClick={nextFrame} />
                <div>{`${frameIndex()}/${frameNum() - 1}`}</div>
                <div class={style.progress} onClick={onClickprogress} ref={progress!}>
                    <div class={style.progress_value} style={`width: ${frameNum() === 0 ? 1 : ((frameIndex() + 1) / frameNum()) * 100}%`}></div>
                </div>
            </div>
        </>
    )
}

export default function AnimationArea() {
    const [color, setColor] = createSignal<string>("#C8C8C8")

    function onPickColor(e: JSX.ChangeEvent) {
        setColor(e.target.value)
    }

    let colorInput: HTMLInputElement

    return (
        <div class={style.Animation}>
            <div class={style.animation_container} style={{ "background-color": color() }}>
                <AnimationPlayer />
            </div>
            <div class={style.tool_menu}>
                <div class={style.color_picker}>
                    <IconButton icon={ColorPickerIcon} onClick={() => colorInput.click()} classList={{ [style.color_picker_icon]: true }} />
                    <input type="color" value={color()} onInput={onPickColor} ref={colorInput!} />
                </div>
                <div>
                    <Popup buttonText={"OverrideSymbol"} buttonClassList={{ [style.tool_button]: true }}>
                        <OverrideSymbol />
                    </Popup>
                </div>
                <div>
                    <Popup buttonText={"HideLayer"} buttonClassList={{ [style.tool_button]: true }}>
                        <HideLayer />
                    </Popup>
                </div>
            </div>
        </div>
    )
}
