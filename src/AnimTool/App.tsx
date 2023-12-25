import JSZip from "jszip"
import { For, createEffect, createSignal } from "solid-js"
import { FileDropEvent } from "../lib/file-drop-element/filedrop"

import Main from "./main"
import Navigation from "../components/Navigation"
import FileInputButton from "../components/FileInputButton"
import { setShown } from "./ExportFile"

import { banks, builds, setBanks, setBuilds, toUiData } from "./data"
import { BinaryDataReader } from "../lib/binary-data"
import { loadImage, newCanvas, transform } from "../lib/image-canvas"
import { Ktex, Build, Anim, decompileAnim, decompileBuild, AnimFrame, AnimElement, Animation } from "../lib/kfiles"
import TextButton from "../components/TextButton"

async function handleZip(file: File, fileName: string) {
    JSZip.loadAsync(file).then(async zip => {
        if ("build.bin" in zip.files) {
            const buildBuffer = await zip.files["build.bin"].async("arraybuffer")
            const build = await decompileBuild(buildBuffer)
            const atlases: { [atlasName: string]: Ktex } = {}
            for (const name in zip.files) {
                if (name.endsWith(".tex")) {
                    atlases[name] = new Ktex(name)
                    const ktexBuffer = await zip.files[name].async("arraybuffer")
                    atlases[name].readKtex(ktexBuffer)
                }
            }
            build.splitAtlas(atlases)
            setBuilds(pre => [...pre, toUiData(build)])
        }
        if ("anim.bin" in zip.files) {
            const animBuffer = await zip.files["anim.bin"].async("arraybuffer")
            const anim = await decompileAnim(animBuffer)
            setBanks(pre => [...pre, ...anim.banks.map(bank => toUiData(bank))])
        }
    })
}

async function handleFiles(e: FileDropEvent | Event) {
    let files: FileList | File[] | null | undefined = null
    if (e instanceof FileDropEvent) files = e.files
    else if (e instanceof Event) files = (e.target as HTMLInputElement | undefined)?.files

    if (!files) return

    for (const file of files) {
        const [fileName, fileType] = file.name.split(".")

        if (fileType === "zip") await handleZip(file, fileName)
        // else if (fileType === "dyn") handleDyn(file, fileName)
        // else if (fileType === "bin") file.arrayBuffer().then(arrayBuffer => handleBin(arrayBuffer))
        // else if (fileType === "json") file.text().then(text => handleString(text))
    }
}

export default function App() {
    return (
        <file-drop multiple={true} onfiledrop={handleFiles}>
            <div style={{ height: "100vh", overflow: "hidden", display: "grid", "grid-template-rows": "min-content min-content auto" }}>
                <Navigation current="AnimTool" />
                <div style={{ display: "flex", "align-items": "center" }}>
                    <FileInputButton
                        multiple={true}
                        text="Open"
                        onChange={handleFiles}
                        accept=".zip, .json, .bin, .dyn"
                        classList={{ normalTextButton: true }}
                    />
                    <TextButton text="Export" onClick={() => setShown(pre => !pre)} classList={{ normalTextButton: true }} />
                </div>
                <Main></Main>
            </div>
        </file-drop>
    )
}
