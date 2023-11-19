import type { ComponentProps, JSX } from "solid-js"

import style from "./IconButton.module.css"

export default function IconButton(
    props: {
        icon: (props: ComponentProps<"svg">) => JSX.Element
    } & JSX.ElementProp
) {
    return (
        <button
            classList={{
                ...props.classList,
                [style["IconButton"]]: true,
            }}
            onClick={props.onClick}>
            <props.icon />
        </button>
    )
}
