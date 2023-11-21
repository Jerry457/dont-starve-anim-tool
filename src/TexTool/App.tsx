import { FileDropEvent } from "file-drop-element"

import TextButton from "../components/TextButton"
import Navigation from "../components/Navigation"

import TexViewer from "./TexDataViewer"

import { atlases } from "./data"
import { Ktex } from "../lib/kfiles/ktex"

import style from "./App.module.css"

export default function App() {
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

            if (fileType === "png") {
                // const ktex = new Ktex(fileName)
                // const fileReader = new FileReader()
                // fileReader.onload = async e => {
                //     const image = new Image()
                //     image.onload = () => {
                //         ktex.from_image(newCanvas(image.width, image.height, image))
                //         ktex.to_image().then(canvas => document.body.appendChild(canvas))
                //     }
                //     image.src = e.target!.result as string
                // }
                // fileReader.readAsDataURL(file)
            } else if (fileType === "tex") {
                const fileReader = new FileReader()
                fileReader.onload = e => {
                    const ktex = new Ktex(fileName)
                    ktex.readKtex(e.target!.result as ArrayBuffer)
                    const canvas = ktex.toImage()
                    atlases.push({ name: file.name, atlas: { canvas, ktex } })
                }
                fileReader.readAsArrayBuffer(file)
            } else if (fileType === "xml") {
            }
        }
    }

    function OnClickExport() {}

    return (
        <div class={style.App}>
            <Navigation current="TexTool" />
            <file-drop multiple={true} class={style.ioBar} onfiledrop={handleFiles}>
                <input type="file" multiple={true} class={style.inputFile} onChange={handleFiles} ref={inputFile!} accept=".xml, .png, .tex" />
                <TextButton text={"Open"} classList={{ [style.ioButton]: true }} onClick={OnClickOpen} />
                <TextButton text={"Export"} classList={{ [style.ioButton]: true }} onClick={OnClickExport} />
            </file-drop>
            <TexViewer />
        </div>
    )
}
