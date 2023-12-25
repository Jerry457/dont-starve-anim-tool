import { JSX, onMount, onCleanup } from "solid-js"

import style from "./ResizeBar.module.css"

export default function ResizeBar(
    props: {
        onDrag: (dx: number, dy: number) => void
        onDblClick?: () => void
        resizeDirection: "vertical" | "horizontal"
    } & JSX.ElementProp
) {
    let resizeBar: HTMLDivElement
    let dragging = false

    function onMouseUp() {
        dragging = false
    }

    function onMouseMove(ev: MouseEvent) {
        if (dragging) {
            props.onDrag(ev.movementX, ev.movementY)
        }
    }

    onMount(() => {
        window.addEventListener("mouseup", onMouseUp)
        window.addEventListener("mousemove", onMouseMove)
    })

    onCleanup(() => {
        window.removeEventListener("mouseup", onMouseUp)
        window.removeEventListener("mousemove", onMouseMove)
    })

    return (
        <div
            onMouseDown={e => {
                e.preventDefault()
                dragging = true
            }}
            onDblClick={props.onDblClick}
            ref={resizeBar!}
            classList={{
                ...props.classList,
                [style.resizeBar]: true,
                [style[props.resizeDirection]]: true,
            }}></div>
    )
}
