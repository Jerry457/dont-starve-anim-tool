import JSZip from "jszip"
import Image from "image-js"
import struct from "python-struct"
import { onMount } from "solid-js";

import { Buffer } from "buffer"
import { FileDropEvent } from "file-drop-element"

import { setBanks, setBuilds } from "./data/data"
import { Ktex } from "./kfiles/tex"
import { UnpackAnim } from "./kfiles/anim"
import { UnpackBuild } from "./kfiles/build"

import { toRowData } from "./components/DataViewer"
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
            const [file_name, file_type] = file.name.split(".")

            switch (file_type) {
                case "zip":
                    JSZip.loadAsync(file).then(async zip => {
                        if ("build.bin" in zip.files) {
                            const atlases: { [name: string]: Image } = {}
                            for (const name in zip.files) {
                                if (name.includes(".tex")) {
                                    const buff = Buffer.from(await zip.files[name].async("array"))
                                    const ktex = new Ktex(name)
                                    ktex.read_tex(buff)
                                    atlases[name] = await ktex.to_image()
                                }
                            }

                            const build = UnpackBuild(Buffer.from(await zip.files["build.bin"].async("array")), atlases)
                            setBuilds(pre => [...pre, toRowData(build)])
                        }
                        if ("anim.bin" in zip.files) {
                            const anim = UnpackAnim(Buffer.from(await zip.files["anim.bin"].async("array")))
                            setBanks(pre => [...pre, ...anim.banks.map(bank => toRowData(bank))])
                        }
                    })
                    break
                case "png":
                    const ktex = new Ktex(file_name)
                    const image = await Image.load(await file.arrayBuffer())
                    ktex.from_image(image)
                    await ktex.to_image()
                    break
                case "tex":
                case "bin":
                    const buff = Buffer.from(await file.arrayBuffer())
                    const head = struct.unpack("<cccc", buff.subarray(0, 4)).toString()
                    switch (head) {
                        case "A,N,I,M":
                            const anim = UnpackAnim(buff)
                            setBanks(pre => [...pre, ...anim.banks.map(bank => toRowData(bank))])
                            break
                        case "B,I,L,D":
                            const build = UnpackBuild(buff)
                            setBuilds(pre => [...pre, toRowData(build)])
                            break
                        case "K,T,E,X":
                            const ktex = new Ktex(file_name)
                            ktex.read_tex(buff)
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

    onMount(()=>{
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
