import { For, createSignal } from "solid-js"

import Popup from "../components/Popup"
import TextButton from "../components/TextButton"

import style from "./ExportFile.module.css"

export const [shown, setShown] = createSignal(false)

const outputTypes = ["bin", "json", "spine"]

const [outputType, setOutputType] = createSignal<string>("bin")
const [hasAnim, setHasAnim] = createSignal(true)

function TypeSelect() {
    return (
        <fieldset classList={{ [style.fieldset]: true, [style.typeFieldset]: true }}>
            <legend>Type</legend>
            <For each={outputTypes}>
                {type => (
                    <div>
                        <TextButton text={type} checkbox={true} check={type === outputType()} onClick={() => setOutputType(type)} />
                    </div>
                )}
            </For>
        </fieldset>
    )
}

function AnimViewer() {
    return (
        <fieldset classList={{ [style.fieldset]: true }}>
            <legend>
                <TextButton text="Anim" checkbox={true} check={hasAnim()} onClick={() => setHasAnim(pre => !pre)} />
            </legend>
        </fieldset>
    )
}

export function ExportFile() {
    return (
        <Popup shown={shown} setShown={setShown} style={{ position: "absolute", top: "5rem", left: "30rem" }}>
            <div
                style={{
                    width: "700px",
                    height: "700px",
                    "padding-top": "2rem",
                    display: "grid",
                    "grid-template-rows": "min-content auto min-content",
                }}>
                <TypeSelect />
                <div
                    style={{
                        display: "grid",
                        "grid-template-columns": "1fr 1fr",
                    }}>
                    <AnimViewer />
                </div>
            </div>
        </Popup>
    )
}
