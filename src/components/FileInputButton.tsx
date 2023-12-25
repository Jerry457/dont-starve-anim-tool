import { JSX } from "solid-js"
import TextButton from "./TextButton"

export default function FileInputButton(props: {
    text: string
    style?: JSX.ElementProp["style"]
    classList?: JSX.ElementProp["classList"]
    accept?: string
    multiple?: boolean
    onChange?: (e: Event) => void
}) {
    let inputFile: HTMLInputElement
    function OnClickOpen() {
        inputFile.click()
    }

    return (
        <>
            <input
                type="file"
                multiple={props.multiple}
                onChange={props.onChange}
                ref={inputFile!}
                accept={props.accept}
                style={{ display: "none" }}
            />
            <TextButton text={props.text} onClick={OnClickOpen} style={props.style} classList={props.classList} />
        </>
    )
}
