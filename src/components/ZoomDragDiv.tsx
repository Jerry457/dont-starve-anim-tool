import ReSzie from "~icons/mdi/restore"
import { onMount, onCleanup, JSX } from "solid-js"

import { IconButton } from "./IconButton"

import style from "./ZoomDragDiv.module.css"

const SCALE_FACTOR = 1.2

export default function ZoomDragDiv(props: JSX.ElementProp) {
    let container: HTMLDivElement
    let zoomDragDiv: HTMLDivElement

    let dragging = false
    let scale = 1
    let deltaX = 0
    let deltaY = 0

    onMount(() => {
        container.addEventListener("mousedown", onMouseDown, { passive: false })
        container.addEventListener("mousewheel", onWheel as EventListener, { passive: false })

        window.addEventListener("mouseup", onMouseUp)
        window.addEventListener("mousemove", onMouseMove)
    })

    onCleanup(() => {
        window.removeEventListener("mouseup", onMouseUp)
        window.removeEventListener("mousemove", onMouseMove)
    })

    function updateStyle() {
        zoomDragDiv.style.scale = String(scale)
        zoomDragDiv.style.translate = `${deltaX}px ${deltaY}px`
    }

    function onMouseDown(ev: MouseEvent) {
        dragging = true
        ev.preventDefault()
    }

    function onMouseUp(ev: MouseEvent) {
        dragging = false
    }

    function onMouseMove(ev: MouseEvent) {
        if (dragging) {
            deltaX += ev.movementX
            deltaY += ev.movementY

            updateStyle()
            ev.preventDefault()
        }
    }

    function onReszie(e: MouseEvent) {
        scale = 1
        deltaX = 0
        deltaY = 0
        updateStyle()
    }

    function onWheel(ev: WheelEvent) {
        const delta = ev.deltaX || ev.deltaY || ev.deltaZ
        if (delta === 0) {
            return
        }

        if (delta < 0) {
            scale *= SCALE_FACTOR
        } else {
            // isZoomIn
            scale /= SCALE_FACTOR
        }

        updateStyle()
        ev.preventDefault()
    }

    return (
        <div class={style.container} ref={container!}>
            <IconButton icon={ReSzie} onClick={onReszie} />
            <div class={style.ZoomDragDiv} ref={zoomDragDiv!} children={props.children} classList={{ ...props.classList }} />
        </div>
    )
}
