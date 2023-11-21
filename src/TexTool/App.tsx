import { createSignal } from "solid-js"
import { FileDropEvent } from "file-drop-element"
import xmlFormat from "xml-formatter"

import TextButton from "../components/TextButton"
import Navigation from "../components/Navigation"

import TexViewer from "./TexDataViewer"

import { addAtlasBboxs, addTexture, addAtlasImages, texture, uvBBoxs, atlasName, textureInfo } from "./data"
import { crop, loadImage, newCanvas, toBlob } from "../lib/image-canvas"
import { uvbboxTobbox } from "../lib/image-canvas/type"
import { Ktex, PixelFormat, Platform, TextureType } from "../lib/kfiles/ktex"
import { downloadFile } from "../lib/util"

import style from "./App.module.css"

function asyncLoadFile(file: File, read: "readAsText" | "readAsDataURL" | "readAsArrayBuffer"): Promise<string | ArrayBuffer | null> {
    return new Promise(resolve => {
        const fileReader = new FileReader()
        fileReader.onload = e => resolve(e.target!.result)

        fileReader[read](file)
    })
}

export default function App() {
    let inputFile: HTMLInputElement
    function OnClickOpen() {
        inputFile.click()
    }

    let xmlName: string | undefined
    const [withXml, setWithXml] = createSignal(true)
    const [split, setSplit] = createSignal(false)
    const [pngAtlas, setPngAtlas] = createSignal(false)

    async function handleFiles(e: FileDropEvent | (Event & { currentTarget: HTMLInputElement; target: HTMLInputElement })) {
        let files: FileList | File[] | null = null
        if (e instanceof FileDropEvent) files = e.files
        else if (e instanceof Event) files = e.target.files

        if (!files) return

        const blocks = []

        for (const file of files) {
            const [fileName, fileType] = file.name.split(".")
            if (fileType === "xml") {
                const resule = (await asyncLoadFile(file, "readAsText")) as string
                const xmlDoc = new DOMParser().parseFromString(resule, "text/xml")
                const texture = xmlDoc.getElementsByTagName("Texture")[0]
                const bboxElements = Array.from(xmlDoc.getElementsByTagName("Element")).map(element => ({
                    name: element.getAttribute("name")!,
                    u1: Number(element.getAttribute("u1")!),
                    u2: Number(element.getAttribute("u2")!),
                    v1: Number(element.getAttribute("v1")!),
                    v2: Number(element.getAttribute("v2")!),
                }))
                if (texture) addAtlasBboxs(texture.getAttribute("filename")!, bboxElements)
            }
        }

        for (const file of files) {
            const [fileName, fileType] = file.name.split(".")

            if (fileType === "png") {
                const url = (await asyncLoadFile(file, "readAsDataURL")) as string
                const image = await loadImage(url)
                const canvas = newCanvas(image.width, image.height, image)
                blocks.push({ canvas, name: `${fileName}.tex` })
            } else if (fileType === "tex") {
                const arrayBuffer = await asyncLoadFile(file, "readAsArrayBuffer")
                const ktex = new Ktex(file.name)
                ktex.readKtex(arrayBuffer as ArrayBuffer)
                addTexture(file.name, ktex)
            }
        }

        addAtlasImages(blocks)
    }

    async function OnClickExport() {
        const textureCanvas = texture()
        const uvbboxs = uvBBoxs()

        if (split()) {
            if (!uvbboxs || !textureCanvas) return
            for (const uvbbox of uvbboxs) {
                const { x, y, w, h, name } = uvbboxTobbox(uvbbox, textureCanvas.width, textureCanvas.height)
                const croped = crop(textureCanvas, x, y, w, h)
                const blob = await toBlob(croped)
                // downloadFile(blob!, name!.replace(".tex", ".png"))
            }
            return
        }

        if (textureCanvas) {
            if (pngAtlas()) {
                const blob = await toBlob(textureCanvas)
                downloadFile(blob!, atlasName()!)
            } else if (atlasName()) {
                const ktex = new Ktex()
                if (textureInfo()) {
                    const { platform, pixelFormat, textureType, flags, fill } = textureInfo()
                    ktex.header.setSpecification(
                        Platform[platform as keyof typeof Platform]!,
                        PixelFormat[pixelFormat as keyof typeof PixelFormat],
                        TextureType[textureType as keyof typeof TextureType],
                        flags,
                        fill
                    )
                }
                ktex.fromImage(textureCanvas)
                downloadFile(new Blob([ktex.compile()]), atlasName()!)
            }
        }
        if (withXml() && uvbboxs && atlasName()) {
            const xmlDoc = document.implementation.createDocument(null, "Atlas")
            const textureElement = xmlDoc.createElement("Texture")
            const elements = xmlDoc.createElement("Elements")

            textureElement.setAttribute("filename", atlasName()!)
            xmlDoc.documentElement.appendChild(textureElement)

            for (const { u1, u2, v1, v2, name } of uvbboxs) {
                const element = xmlDoc.createElement("Element")
                element.setAttribute("name", name!)
                element.setAttribute("u1", String(u1))
                element.setAttribute("u2", String(u2))
                element.setAttribute("v1", String(v1))
                element.setAttribute("v2", String(v2))
                elements.appendChild(element)
            }
            xmlDoc.documentElement.appendChild(elements)

            const xmlString = xmlFormat(new XMLSerializer().serializeToString(xmlDoc))
            let name = atlasName()!.replace(".tex", "")
            if (xmlName) name = xmlName + !xmlName.endsWith(".xml") ? ".xml" : ""
            downloadFile(new Blob([xmlString], { type: "text/xml" }), name)
        }
    }

    return (
        <file-drop class={style.App} multiple={true} onfiledrop={handleFiles}>
            <Navigation current="TexTool" />
            <div class={style.ioBar}>
                <input type="file" multiple={true} class={style.inputFile} onChange={handleFiles} ref={inputFile!} accept=".xml, .png, .tex" />
                <TextButton text={"Open"} classList={{ [style.ioButton]: true }} onClick={OnClickOpen} />
                <TextButton text={"Export"} classList={{ [style.ioButton]: true }} onClick={OnClickExport} />
                <TextButton
                    text="split"
                    checkbox={true}
                    check={split()}
                    classList={{ [style.normalButton]: true }}
                    onClick={() => setSplit(pre => !pre)}
                />
                <TextButton
                    text="png atlas"
                    checkbox={true}
                    check={pngAtlas()}
                    classList={{ [style.normalButton]: true, [style.unUse]: split() }}
                    onClick={() => setPngAtlas(pre => !pre)}
                />
                <TextButton
                    text="xml"
                    checkbox={true}
                    check={withXml()}
                    classList={{ [style.normalButton]: true, [style.unUse]: split() }}
                    onClick={() => setWithXml(pre => !pre)}
                />
                <div classList={{ [style.xmlName]: true, [style.unUse]: split() || !withXml() }}>
                    <input type="text" placeholder="xml Name" onChange={e => (xmlName = e.target.value !== "" ? e.target.value : undefined)} />
                </div>
            </div>
            <TexViewer />
        </file-drop>
    )
}
