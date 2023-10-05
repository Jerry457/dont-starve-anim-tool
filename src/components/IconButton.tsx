import type { ComponentProps, JSX } from "solid-js"

import style from "./IconButton.module.css"

export function IconButton(
    props: {
        icon: (props: ComponentProps<"svg">) => JSX.Element
    } & JSX.ElementProp
) {
    return (
        <button
            classList={{
                ...props.classList,
                [style["icon-button"]]: true,
            }}
            onClick={props.onClick}>
            <props.icon />
        </button>
    )
}
