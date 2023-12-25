import { JSX } from "solid-js"

import Input from "./Input"

import style from "./LabelInput.module.css"

export default function TextInput(props: {
    labelStyle?: JSX.ElementProp["style"]
    title: string
    placeholder?: string
    value?: string | number
    readonly?: boolean
    onChange?: (value: string | number | boolean) => void
}) {
    return (
        <div class="center" style={{ width: "20rem" }}>
            <label style={props.labelStyle}>{props.title}</label>
            <Input
                readOnly={props.readonly}
                placeholder={props.placeholder}
                value={props.value}
                classList={{ [style.LabelInput]: true }}
                onChange={props.onChange}
            />
        </div>
    )
}
