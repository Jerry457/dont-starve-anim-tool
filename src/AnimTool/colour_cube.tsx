import { JSX, For } from "solid-js"

import { setColourCube, updateAnimationEvent } from "../data"
import { colourCubeNames } from "../data/colour_cubes"

import style from "./colour_cube.module.css"

export function SelectColourCube() {
    function onChange(e: JSX.SelectChangeEvent) {
        setColourCube(e.target.value)
        dispatchEvent(updateAnimationEvent)
    }

    return (
        <select class={style.SelectColourCube} onChange={onChange}>
            <option value="">ColourCube</option>
            <For each={colourCubeNames}>{([name, fileName]) => <option value={fileName}>{name}</option>}</For>
        </select>
    )
}