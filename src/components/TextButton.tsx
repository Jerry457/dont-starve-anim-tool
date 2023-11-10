import { Show } from "solid-js"

import style from "./TextButton.module.css"

export function TextButton(props: {
    text: string
    classList?: { [k: string]: boolean | undefined }
    textClassList?: { [k: string]: boolean | undefined }
    checkbox?: boolean
    check?: boolean
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

    return (
        <div
            classList={{
                [style.TextButton]: true,
                ...props.classList,
            }}
            onClick={onClick}>
            <Show when={props.checkbox}>
                <input type="checkbox" ref={checkBox} class={style.checkBox} checked={props.check} />
            </Show>
            <div class={style.text}>{props.text}</div>
        </div>
    )
}
