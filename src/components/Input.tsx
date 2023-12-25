import { JSX } from "solid-js"

import style from "./Input.module.css"

export default function Input(props: {
    value?: string | number
    type?: "text" | "checkbox"
    checked?: boolean
    readOnly?: boolean
    style?: JSX.ElementProp["style"]
    placeholder?: string
    id?: JSX.ElementProp["id"]
    classList?: JSX.ElementProp["classList"]
    onChange?: (value: string | number | boolean) => void
}) {
    const valueType = props.value !== undefined ? typeof props.value : typeof props.checked
    function onChange(e: JSX.InputChangeEvent) {
        let value: string | boolean | number = props.type === "checkbox" ? e.target.checked : e.target.value

        if (valueType == "number") {
            const number = Number(value)
            if (isNaN(number)) {
                alert("invalid number")
                e.target.value = String(props.value)
                return
            }
            value = number
        }
        props.onChange?.(value)
    }

    return (
        <input
            id={props.id}
            class={style.Input}
            classList={props.classList}
            style={props.style}
            type={props.type || "text"}
            value={props.value}
            onChange={onChange}
            placeholder={props.placeholder}
            readOnly={props.readOnly}
            checked={props.checked}
            data-cantdrag={true}
        />
    )
}
