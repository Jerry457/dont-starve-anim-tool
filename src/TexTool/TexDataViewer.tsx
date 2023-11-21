import { createSignal, onMount, createEffect } from "solid-js"
import { Select as SolidSelect } from "@thisbeyond/solid-select"
import "@thisbeyond/solid-select/style.css"

import { atlasName, setTextureInfo, texture, textureInfo, uvBBoxs } from "./data"

import ZoomDragDiv from "../components/ZoomDragDiv"
import Select from "../components/Select"

import { PixelFormat, Platform, TextureType } from "../lib/kfiles/ktex"
import { bbox, uvbbox, uvbboxTobbox } from "../lib/image-canvas/type"

import style from "./TexDataViewer.module.css"

function enumToArray(current: { name: string; value: string }[], [name, value]: [string, any]) {
    if (typeof value === "number") {
        current.push({ name, value: name })
    }
    return current
}

export default function TexDataViewer() {
    let texCanvas: HTMLCanvasElement
    let bboxCanvas: HTMLCanvasElement
    let texCtx: CanvasRenderingContext2D
    let bboxCtx: CanvasRenderingContext2D

    const bboxLineWidth = 2

    const [elementInfo, setElementInfo] = createSignal<bbox>({ x: 0, y: 0, h: 0, w: 0 })

    function onSelect(uvbbox: uvbbox) {
        const textureCanvas = texture()
        if (!textureCanvas) return

        const bbox = uvbboxTobbox(uvbbox, textureCanvas.width, textureCanvas.height)
        setElementInfo(bbox)

        bboxCtx.clearRect(0, 0, bboxCanvas.width, bboxCanvas.height)
        bboxCtx.strokeStyle = "red"
        bboxCtx.lineWidth = bboxLineWidth
        bboxCtx.strokeRect(bbox.x + bboxLineWidth, bbox.y + bboxLineWidth, bbox.w, bbox.h)
    }

    onMount(() => {
        texCtx = texCanvas.getContext("2d")!
        bboxCtx = bboxCanvas.getContext("2d")!
    })

    createEffect(() => {
        const textureCanvas = texture()
        if (!textureCanvas) return

        texCanvas.width = textureCanvas.width
        texCanvas.height = textureCanvas.height
        bboxCanvas.width = textureCanvas.width + bboxLineWidth * 2
        bboxCanvas.height = textureCanvas.height + bboxLineWidth * 2

        texCtx.clearRect(0, 0, texCanvas.width, texCanvas.height)
        texCtx.drawImage(textureCanvas, 0, 0)
    })

    return (
        <div class={style.TexDataViewer}>
            <div class={style.atlasInfo}>
                <div>
                    <label>Element:</label>
                    <SolidSelect
                        options={uvBBoxs() ? uvBBoxs()! : []}
                        class={style.elementSelect}
                        format={(data, type) => (type === "option" ? data.name : data.name)}
                        onChange={onSelect}
                    />
                </div>

                <div class={style.elementInfo}>
                    <div>
                        <label>X:</label>
                        <span>{elementInfo().x}</span>
                    </div>
                    <div>
                        <label>Y:</label>
                        <span>{elementInfo().y}</span>
                    </div>
                    <div>
                        <label>W:</label>
                        <span>{elementInfo().w}</span>
                    </div>
                    <div>
                        <label>H:</label>
                        <span>{elementInfo().h}</span>
                    </div>
                    <div class={style.elementNum}>
                        <label>Elements:</label>
                        <span>{uvBBoxs() ? uvBBoxs()!.length : 0}</span>
                    </div>
                </div>
            </div>
            <div class={style.texInfo}>
                <div class={style.atlasName}>
                    <label>AtlasName:</label>
                    <input type="text" placeholder="Atlas Name" onChange={e => {}} value={atlasName() ? atlasName()! : ""} />
                </div>
                <div>
                    <label>W:</label>
                    <span>{texture()?.width}</span>
                </div>
                <div>
                    <label>H:</label>
                    <span>{texture()?.height}</span>
                </div>
                <div>
                    <label>Platform:</label>
                    <Select
                        classList={{ [style.elementSelect]: true }}
                        options={Object.entries(Platform).reduce<{ name: string; value: string }[]>(enumToArray, [])}
                        default={textureInfo().platform}
                        onChange={e => setTextureInfo(pre => ({ ...pre, platform: e.target.value }))}
                    />
                </div>
                <div>
                    <label>PixelFormat:</label>
                    <Select
                        classList={{ [style.elementSelect]: true }}
                        options={Object.entries(PixelFormat).reduce<{ name: string; value: string }[]>(enumToArray, [])}
                        default={textureInfo().pixelFormat}
                        onChange={e => setTextureInfo(pre => ({ ...pre, pixelFormat: e.target.value }))}
                    />
                </div>
                <div>
                    <label>TextureType:</label>
                    <Select
                        classList={{ [style.elementSelect]: true }}
                        options={Object.entries(TextureType).reduce<{ name: string; value: string }[]>(enumToArray, [])}
                        default={textureInfo().textureType}
                        onChange={e => setTextureInfo(pre => ({ ...pre, textureType: e.target.value }))}
                    />
                </div>
                <div>
                    <label>Mipmaps:</label>
                    <span>{textureInfo().mipmapCount}</span>
                </div>
                <div>
                    <label>Flags:</label>
                    <span>{textureInfo().flags}</span>
                </div>
                <div>
                    <label>Fill:</label>
                    <span>{textureInfo().fill}</span>
                </div>
            </div>
            <ZoomDragDiv zoomable={true} dragable={true} classList={{ [style.texViewer]: true }} containerclassList={{ [style.background]: true }}>
                <div class={style.tex}>
                    <canvas ref={texCanvas!} class={style.texCanvas}></canvas>
                    <canvas ref={bboxCanvas!} class={style.bboxCanvas}></canvas>
                </div>
            </ZoomDragDiv>
        </div>
    )
}
