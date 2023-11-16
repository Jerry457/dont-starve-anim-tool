import JSZip from "jszip"
import { onMount } from "solid-js"
import { FileDropEvent } from "file-drop-element"

import { BinaryDataReader } from "./lib/binary-data"
import { Ktex } from "./lib/kfiles/ktex"
import { decompileAnim } from "./lib/kfiles/anim"
import { Build, decompileBuild } from "./lib/kfiles/build"

import { banks, builds } from "./data"
import ResizeBar from "./components/ResizeBar"
import { toRowData } from "./components/DataViewer"
import { TextButton } from "./components/TextButton"
import { Popup } from "./components/Popup"

import AnimDataViewer from "./AnimDataViewer"
import BuildViewer from "./BuildViewer"
import AnimPlayer from "./Animation"
import ExportFile from "./ExportFile"

import style from "./App.module.css"

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
        if (e instanceof FileDropEvent) {
            files = e.files
        } else if (e instanceof Event) {
            files = e.target.files
        }
        if (!files) {
            return
        }

        for (const file of files) {
            const [fileName, fileType] = file.name.split(".")

            switch (fileType) {
                case "zip":
                    JSZip.loadAsync(file).then(zip => {
                        if ("anim.bin" in zip.files) {
                            zip.files["anim.bin"].async("arraybuffer").then(arrayBuffer =>
                                decompileAnim(arrayBuffer).then(anim => {
                                    banks.push(...anim.banks.map(bank => toRowData(bank)))
                                })
                            )
                        }

                        if ("build.bin" in zip.files) {
                            zip.files["build.bin"].async("arraybuffer").then(arrayBuffer => {
                                const promises = []

                                promises.push(decompileBuild(arrayBuffer))

                                const atlases: { [fileName: string]: Ktex } = {}
                                for (const name in zip.files) {
                                    if (name.includes(".tex")) {
                                        atlases[name] = new Ktex(name)
                                        promises.push(
                                            zip.files[name].async("arraybuffer").then(ktexArrayBuffer => {
                                                atlases[name].readKtex(ktexArrayBuffer)
                                            })
                                        )
                                    }
                                }
                                Promise.all(promises).then(results => {
                                    const build = results[0] as Build
                                    build.splitAtlas(atlases).then(() => {
                                        builds.push(toRowData(build))
                                    })
                                })
                            })
                        }
                    })
                    break
                case "png":
                    const ktex = new Ktex(fileName)
                    const fileReader = new FileReader()
                    fileReader.onload = async e => {
                        const image = new Image()
                        image.onload = () => {
                            // ktex.from_image(newCanvas(image.width, image.height, image))
                            // ktex.to_image().then(canvas => document.body.appendChild(canvas))
                        }
                        image.src = e.target!.result as string
                    }
                    fileReader.readAsDataURL(file)
                    break
                case "tex":
                // const _ktex = new Ktex(fileName)
                // const _fileReader = new FileReader()
                // _fileReader.onload = async e => {
                //     _ktex.read_tex(e.target!.result as ArrayBuffer)
                //     // document.body.appendChild(_ktex.to_image())
                // }
                // _fileReader.readAsArrayBuffer(file)
                case "bin":
                    file.arrayBuffer().then(arrayBuffer => {
                        const reader = new BinaryDataReader(arrayBuffer)
                        const head = reader.readString(4)
                        switch (head) {
                            case "ANIM":
                                decompileAnim(reader).then(anim => {
                                    banks.push(...anim.banks.map(bank => toRowData(bank)))
                                })
                                break
                            case "BILD":
                                decompileBuild(reader).then(build => {
                                    builds.push(toRowData(build))
                                })
                                break
                            case "KTEX":
                                const ktex = new Ktex(fileName)
                                ktex.readKtex(reader)
                                ktex.toImage()
                                break
                            default:
                                alert("Unknown file")
                        }
                    })
                    break
                case "json":
                    file.text().then(text => {
                        const result = JSON.parse(text)
                        switch (result.type) {
                            case "Anim":
                                break
                            case "Build":
                                break
                            default:
                                throw Error("Unknown file")
                        }
                    })
                    break
            }
        }
    }

    return (
        <file-drop class={style.App} multiple={true} onfiledrop={handleFiles}>
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
