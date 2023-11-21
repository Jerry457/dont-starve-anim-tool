import { JSX, For } from "solid-js"
import style from "./select.module.css"

export default function Select(
    prop: JSX.ElementProp & {
        onChange?: (e: JSX.SelectChangeEvent) => void
        options: { name: string; value?: string | number | string[] }[]
        default?: string | number | string[]
    }
) {
    return (
        <select classList={{ [style.Select]: true, ...prop.classList }} onChange={prop.onChange}>
            <For each={prop.options}>
                {({ name, value }) => (
                    <option value={value} selected={prop.default === name}>
                        {name}
                    </option>
                )}
            </For>
        </select>
    )
}
