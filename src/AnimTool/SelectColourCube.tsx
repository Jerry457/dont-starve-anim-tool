import { JSX, For } from "solid-js"

import Select from "../components/Select"

import { setColourCube, updateData } from "./data"
import { colourCubeNames } from "./data/colourCubes"

export function SelectColourCube() {
    function onChange(e: JSX.SelectChangeEvent) {
        setColourCube(e.target.value)
        updateData()
    }

    return (
        <Select onChange={onChange}>
            <option value="">ColourCube</option>
            <For each={colourCubeNames}>{([name, fileName]) => <option value={fileName}>{name}</option>}</For>
        </Select>
    )
}
