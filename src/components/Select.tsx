import { JSX, Show } from "solid-js"
import style from "./select.module.css"

export default function Select(prop: JSX.ElementProp & { onChange?: (e: JSX.SelectChangeEvent) => void }) {
    return (
        <select classList={{ [style.Select]: true, ...prop.classList }} onChange={prop.onChange}>
            <Show when={prop.children}>{prop.children}</Show>
        </select>
    )
}
