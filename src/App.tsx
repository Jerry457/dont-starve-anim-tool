import JSZip from "jszip"
import { onMount } from "solid-js"
import { FileDropEvent } from "file-drop-element"

import BinaryDataReader from "./lib/binary-data/BinaryDataReader"
import { Ktex } from "./lib/kfiles/tex"
import { UnpackAnim } from "./lib/kfiles/anim"
import { UnpackBuild } from "./lib/kfiles/build"
import { newCanvas } from "./lib/image-canvas"

import { banks, builds } from "./data/ui_data"
import { dataChangeEvent, toRowData } from "./components/DataViewer"
import ResizeBar from "./components/ResizeBar"
import AnimViewer from "./AnimViewer"
import BuildViewer from "./BuildViewer"
import AnimPlayer from "./Animation"

import styles from "./App.module.css"

export default function App() {
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
                    const zip = await JSZip.loadAsync(file)
                    if ("anim.bin" in zip.files) {
                        const anim = UnpackAnim(await zip.files["anim.bin"].async("arraybuffer"))
                        banks.push(...anim.banks.map(bank => toRowData(bank)))
                    }

                    if ("build.bin" in zip.files) {
                        const build = UnpackBuild(await zip.files["build.bin"].async("arraybuffer"))
                        builds.push(toRowData(build))
                        const atlases: { [fileName: string]: HTMLCanvasElement } = {}
                        for (const name in zip.files) {
                            if (name.includes(".tex")) {
                                const ktex = new Ktex(name)
                                ktex.read_tex(await zip.files[name].async("arraybuffer"))
                                atlases[name] = ktex.to_image()
                            }
                        }
                        build.splitAltas(atlases)
                        dispatchEvent(dataChangeEvent)
                    }
                    break
                case "png":
                    const ktex = new Ktex(fileName)
                    const fileReader = new FileReader()
                    fileReader.onload = async e => {
                        const image = new Image()
                        image.onload = () => {
                            ktex.from_image(newCanvas(image.width, image.height, image))
                            ktex.to_image()
                        }
                        image.src = e.target!.result as string
                    }
                    fileReader.readAsDataURL(file)
                    break
                case "tex":
                case "bin":
                    const reader = new BinaryDataReader(await file.arrayBuffer())
                    const head = reader.readString(4)
                    switch (head) {
                        case "ANIM":
                            const anim = UnpackAnim(reader)
                            banks.push(...anim.banks.map(bank => toRowData(bank)))
                            break
                        case "BILD":
                            const build = UnpackBuild(reader)
                            builds.push(toRowData(build))
                            break
                        case "KTEX":
                            const ktex = new Ktex(fileName)
                            ktex.read_tex(reader)
                            ktex.to_image()
                            break
                        default:
                            alert("Unknown file")
                    }
                    break
                case "json":
                    const result = JSON.parse(await file.text())
                    switch (result.type) {
                        case "Anim":
                            break
                        case "Build":
                            break
                        default:
                            throw Error("")
                    }
                    break
            }
        }
    }

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

    return (
        <file-drop class={styles.App} multiple={true} onfiledrop={handleFiles}>
            <div>
                <input type="file" multiple={true} onChange={handleFiles} accept=".zip, .json, .bin, .png, .tex .dyn" />
            </div>
            <div classList={{ [styles.main]: true }}>
                <div class={styles.top} ref={topPart!}>
                    <div class={styles.left} ref={leftPart!}>
                        <ResizeBar onDrag={onDragHorizontal} resizeDirection="horizontal" />
                        <BuildViewer />
                    </div>
                    <div class={styles.right}>
                        <AnimPlayer />
                    </div>
                </div>
                <div class={styles.bottom}>
                    <ResizeBar onDrag={onDragVertical} resizeDirection="vertical" />
                    <AnimViewer />
                </div>
            </div>
        </file-drop>
    )
}
