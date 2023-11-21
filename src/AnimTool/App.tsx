import JSZip from "jszip"
import { onMount } from "solid-js"
import { FileDropEvent } from "file-drop-element"

import { BinaryDataReader } from "../lib/binary-data"
import { Ktex } from "../lib/kfiles/ktex"
import { decompileAnim, Anim } from "../lib/kfiles/anim"
import { decompileBuild, Build } from "../lib/kfiles/build"
import { convertDyn } from "../lib/kfiles/dyn"
import { loadImage, newCanvas } from "../lib/image-canvas"

import { banks, builds, addbuildAtlas, findRelevantAtlases } from "./data"

import { toRowData } from "../components/DataViewer"

import TextButton from "../components/TextButton"
import Popup from "../components/Popup"
import ResizeBar from "../components/ResizeBar"
import Navigation from "../components/Navigation"

import AnimDataViewer from "./AnimDataViewer"
import BuildViewer from "./BuildViewer"
import AnimPlayer from "./Animation"
import ExportFile from "./ExportFile"

import style from "./App.module.css"

function handBuild(
    build: Build,
    atlases?: { [atlasName: string]: Ktex },
    framesData?: { symbolName: string; frameName: string; canvas: HTMLCanvasElement }[]
) {
    if (atlases) build.splitAtlas(atlases)
    if (!build.hasAtlas()) findRelevantAtlases(build)
    if (framesData) {
        for (const { symbolName, frameName, canvas } of framesData) {
            const frame = build.getSymbol(symbolName)?.getFrameByName(frameName)
            if (frame && !frame.canvas) frame.canvas = canvas
        }
    }
    builds.push(toRowData(build))
}

function handAnim(anim: Anim) {
    banks.push(...anim.banks.map(bank => toRowData(bank)))
}

function handleString(
    text: string,
    atlases?: { [atlasName: string]: Ktex },
    framesData?: { symbolName: string; frameName: string; canvas: HTMLCanvasElement }[]
) {
    const result = JSON.parse(text)
    if (result.type === "Anim") {
        const anim = new Anim()
        anim.parseJson(result)
        handAnim(anim)
    } else if (result.type === "Build") {
        const build = new Build()
        build.parseJson(result)
        handBuild(build, atlases, framesData)
    } else {
        alert("Unknown file")
    }
}

function handleBin(
    arrayBuffer: ArrayBuffer,
    atlases?: { [atlasName: string]: Ktex },
    frames?: { symbolName: string; frameName: string; canvas: HTMLCanvasElement }[]
) {
    const reader = new BinaryDataReader(arrayBuffer)
    const head = reader.readString(4)

    if (head === "ANIM") decompileAnim(reader).then(anim => handAnim(anim))
    else if (head === "BILD") decompileBuild(reader).then(build => handBuild(build, atlases, frames))
    else alert("Unknown file")
}

async function handleZip(file: File, fileName: string) {
    JSZip.loadAsync(file).then(zip => {
        if ("anim.bin" in zip.files) {
            zip.files["anim.bin"].async("arraybuffer").then(arrayBuffer => handleBin(arrayBuffer))
        } else if ("anim.json" in zip.files) {
            zip.files["anim.json"].async("text").then(text => handleString(text))
        }

        const promises = []
        const atlases: { [atlasName: string]: Ktex } = {}
        const framesData: { symbolName: string; frameName: string; canvas: HTMLCanvasElement }[] = []
        for (const name in zip.files) {
            if (name.endsWith(".tex")) {
                atlases[name] = new Ktex(name)
                promises.push(
                    zip.files[name].async("arraybuffer").then(ktexArrayBuffer => {
                        atlases[name].readKtex(ktexArrayBuffer)
                    })
                )
            }
        }
        for (const name in zip.files) {
            let [symbolName, frameName] = name.split("/")
            if (name.endsWith(".png") && frameName) {
                frameName = frameName.split(".")[0]
                promises.push(
                    zip.files[name].async("blob").then(async blob => {
                        const url = URL.createObjectURL(blob)
                        const img = await loadImage(url)
                        const canvas = newCanvas(img.width, img.height, img)
                        framesData.push({ symbolName, frameName, canvas })
                    })
                )
            }
        }

        Promise.all(promises).then(() => {
            if ("build.bin" in zip.files) {
                zip.files["build.bin"].async("arraybuffer").then(arrayBuffer => handleBin(arrayBuffer, atlases, framesData))
            } else if ("build.json" in zip.files) {
                zip.files["build.json"].async("text").then(text => handleString(text, atlases, framesData))
            }
        })
    })
}

function handleDyn(file: File, fileName: string) {
    file.arrayBuffer().then(arrayBuffer => {
        const buildAtlas: {
            buildName: string
            atlases: { [atlasName: string]: Ktex }
        } = { buildName: fileName, atlases: {} }

        convertDyn(arrayBuffer).then(buffer =>
            JSZip.loadAsync(buffer).then(zip => {
                const promises = []
                for (const atlasName in zip.files) {
                    promises.push(
                        zip.files[atlasName].async("arraybuffer").then(arrayBuffer => {
                            buildAtlas.atlases[atlasName] = new Ktex(atlasName)
                            buildAtlas.atlases[atlasName].readKtex(arrayBuffer)
                        })
                    )
                }
                Promise.all(promises).then(() => addbuildAtlas(buildAtlas))
            })
        )
    })
}

export default function App() {
    let topPart: HTMLDivElement
    let topPartHeight: number
    function onDragVertical(dx: number, dy: number) {
        topPartHeight = Math.max(0, topPartHeight + dy)
        topPart.style.height = `${topPartHeight}px`
    }

    let leftPart: HTMLDivElement
    let leftPartWidth: number
    function onDragHorizontal(dx: number, dy: number) {
        leftPartWidth = Math.max(0, leftPartWidth + dx)
        leftPart.style.width = `${leftPartWidth}px`
    }

    onMount(() => {
        topPartHeight = topPart.getBoundingClientRect().height
        leftPartWidth = leftPart.getBoundingClientRect().width
    })

    let inputFile: HTMLInputElement
    function OnClickOpen() {
        inputFile.click()
    }

    async function handleFiles(e: FileDropEvent | (Event & { currentTarget: HTMLInputElement; target: HTMLInputElement })) {
        let files: FileList | File[] | null = null
        if (e instanceof FileDropEvent) files = e.files
        else if (e instanceof Event) files = e.target.files

        if (!files) return

        for (const file of files) {
            const [fileName, fileType] = file.name.split(".")

            if (fileType === "zip") handleZip(file, fileName)
            else if (fileType === "dyn") handleDyn(file, fileName)
            else if (fileType === "bin") file.arrayBuffer().then(arrayBuffer => handleBin(arrayBuffer))
            else if (fileType === "json") file.text().then(text => handleString(text))
        }
    }

    return (
        <file-drop class={style.App} multiple={true} onfiledrop={handleFiles}>
            <Navigation current="AnimTool" />
            <div class={style.ioBar}>
                <input type="file" multiple={true} class={style.inputFile} onChange={handleFiles} ref={inputFile!} accept=".zip, .json, .bin, .dyn" />
                <TextButton text={"Open"} classList={{ [style.ioButton]: true }} onClick={OnClickOpen} />
                <Popup buttonText={"Export"} buttonClassList={{ [style.ioButton]: true }} classList={{ [style.exportPopup]: true }}>
                    <ExportFile />
                </Popup>
            </div>
            <div classList={{ [style.main]: true }}>
                <div class={style.top} ref={topPart!}>
                    <div class={style.left} ref={leftPart!}>
                        <ResizeBar onDrag={onDragHorizontal} resizeDirection="horizontal" />
                        <BuildViewer />
                    </div>
                    <div class={style.right}>
                        <AnimPlayer />
                    </div>
                </div>
                <div class={style.bottom}>
                    <ResizeBar onDrag={onDragVertical} resizeDirection="vertical" />
                    <AnimDataViewer />
                </div>
            </div>
        </file-drop>
    )
}
