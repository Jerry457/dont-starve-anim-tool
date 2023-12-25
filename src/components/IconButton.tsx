import type { ComponentProps, JSX } from "solid-js"

import style from "./IconButton.module.css"

export default function IconButton(
    props: {
        ref?: HTMLButtonElement
        icon: (props: ComponentProps<"svg">) => JSX.Element
    } & JSX.ElementProp
) {
    return (
        <button
            ref={props.ref}
            classList={{
                ...props.classList,
                [style.IconButton]: true,
            }}
            style={props.style}
            onClick={props.onClick}>
            <props.icon />
        </button>
    )
}
