import { JSX, Show, createSignal } from "solid-js"

import ColorPickerIcon from "~icons/mdi/palette"

import IconButton from "./IconButton"

import style from "./ColorPicker.module.css"

export default function ColorPicker(prop: JSX.ElementProp & { noIcon?: boolean; defauleColor?: string; onChange: (color: string) => void }) {
    let colorInput: HTMLInputElement
    let colorDiv: HTMLDivElement

    const [color, setColor] = createSignal(prop.defauleColor ?? "#000000")

    function onPickColor(e: JSX.InputChangeEvent) {
        setColor(e.target.value)
        prop.onChange(e.target.value)
    }

    return (
        <div classList={{ [style.ColorPicker]: true }}>
            <Show when={!prop.noIcon}>
                <IconButton icon={ColorPickerIcon} onClick={() => colorInput.click()} classList={{ [style.colorPickerIcon]: true }} />
            </Show>
            <div ref={colorDiv!} style={`background: ${color()}`} classList={{ [style.colorDiv]: true, ...prop.classList }}></div>
            <input type="color" value={color()} onInput={onPickColor} ref={colorInput!} />
        </div>
    )
}
