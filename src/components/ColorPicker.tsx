import { JSX, Show } from "solid-js"

import ColorPickerIcon from "~icons/mdi/palette"

import IconButton from "./IconButton"

import style from "./ColorPicker.module.css"

export default function ColorPicker(prop: JSX.ElementProp & { noIcon: boolean; defauleColor?: string; onChange: (color: string) => void }) {
    let colorInput: HTMLInputElement
    let colorDiv: HTMLDivElement

    function onPickColor(e: JSX.InputChangeEvent) {
        colorInput.value = e.target.value
        prop.onChange(e.target.value)
    }

    return (
        <div classList={{ [style.ColorPicker]: true, ...prop.classList }}>
            <Show when={!prop.noIcon}>
                <IconButton icon={ColorPickerIcon} onClick={() => colorInput.click()} classList={{ [style.colorPickerIcon]: true }} />
            </Show>
            <div ref={colorDiv!}></div>
            <input type="color" value={prop.defauleColor ?? "#000000"} onInput={onPickColor} ref={colorInput!} />
        </div>
    )
}
