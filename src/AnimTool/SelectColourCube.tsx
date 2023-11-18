import { JSX, For } from "solid-js"

import { setColourCube, updateData } from "./data"
import { colourCubeNames } from "./data/colourCubes"

import style from "./SelectColourCube.module.css"

export function SelectColourCube() {
    function onChange(e: JSX.SelectChangeEvent) {
        setColourCube(e.target.value)
        updateData()
    }

    return (
        <select class={style.SelectColourCube} onChange={onChange}>
            <option value="">ColourCube</option>
            <For each={colourCubeNames}>{([name, fileName]) => <option value={fileName}>{name}</option>}</For>
        </select>
    )
}
