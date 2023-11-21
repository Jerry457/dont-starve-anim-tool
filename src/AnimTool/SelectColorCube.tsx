import { JSX, For } from "solid-js"

import Select from "../components/Select"

import { setColorCube, updateData } from "./data"
import { colorCubeNames } from "./data/colorCubes"

export function SelectColorCube() {
    function onChange(e: JSX.SelectChangeEvent) {
        setColorCube(e.target.value)
        updateData()
    }

    return <Select onChange={onChange} options={[{ name: "ColorCube", value: "" }, ...colorCubeNames]}></Select>
}
