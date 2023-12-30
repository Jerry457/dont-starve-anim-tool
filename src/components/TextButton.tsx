import { JSX, Show, createEffect } from "solid-js"

import style from "./TextButton.module.css"

export default function TextButton(props: {
    text: string
    style?: JSX.ElementProp["style"]
    classList?: JSX.ElementProp["classList"]
    checkbox?: boolean
    check?: boolean
    indeterminate?: boolean
    onClick?: (checkBox?: HTMLInputElement) => void
}) {
    let checkBox: HTMLInputElement | undefined

    function onClick(e: MouseEvent) {
        e.stopPropagation()
        if (checkBox) {
            checkBox.checked = !checkBox?.checked
        }
        props.onClick?.(checkBox)
    }

    createEffect(() => {
        if (checkBox && props.indeterminate !== undefined) {
            checkBox.indeterminate = props.indeterminate
        }
    })

    return (
        <div class={style.TextButton} classList={props.classList} onClick={onClick} style={props.style} data-cantdrag={true}>
            <Show when={props.checkbox}>
                <input type="checkbox" ref={checkBox} class={style.checkBox} checked={props.check} data-cantdrag={true} />
            </Show>
            <div class={style.text} data-cantdrag={true}>
                {props.text}
            </div>
        </div>
    )
}
