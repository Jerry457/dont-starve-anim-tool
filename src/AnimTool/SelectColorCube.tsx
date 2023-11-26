import { JSX, For } from "solid-js"

import Select from "../components/Select"

import { colorCubeNames } from "./data/colorCubes"

export function SelectColorCube() {
    function onChange(e: JSX.SelectChangeEvent) {
        dispatchEvent(
            new CustomEvent("colorCubeChange", {
                detail: { colorCube: e.target.value },
            })
        )
    }

    return <Select onChange={onChange} options={[{ name: "ColorCube", value: "" }, ...colorCubeNames]}></Select>
}
