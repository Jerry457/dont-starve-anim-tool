import ReSzie from "~icons/mdi/restore"
import { onMount, onCleanup, JSX, Show } from "solid-js"

import { IconButton } from "./IconButton"

import style from "./ZoomDragDiv.module.css"

const SCALE_FACTOR = 1.2

export default function ZoomDragDiv(props: JSX.ElementProp & { zoomable?: boolean; dragable?: boolean }) {
    let container: HTMLDivElement
    let zoomDragDiv: HTMLDivElement

    let dragging = false
    let scale = 1
    let deltaX = 0
    let deltaY = 0

    let _alert = window.alert
    window.alert = function (...args) {
        dragging = false
        _alert(...args)
    }

    onMount(() => {
        if (props.zoomable) {
            container.addEventListener("mousewheel", onWheel as EventListener, { passive: false })
        }

        if (props.dragable) {
            container.addEventListener("mousedown", onMouseDown, { passive: false })
            removeEventListener("alert", onMouseUp)
            addEventListener("mouseup", onMouseUp)
            addEventListener("mousemove", onMouseMove)
        }
    })

    onCleanup(() => {
        if (props.zoomable) {
            container.removeEventListener("mousewheel", onWheel as EventListener)
        }

        if (props.dragable) {
            container.removeEventListener("mousedown", onMouseDown)
            removeEventListener("alert", onMouseUp)
            removeEventListener("mouseup", onMouseUp)
            removeEventListener("mousemove", onMouseMove)
        }
    })

    function updateStyle() {
        zoomDragDiv.style.scale = String(scale)
        zoomDragDiv.style.translate = `${deltaX}px ${deltaY}px`
    }

    function onMouseDown(ev: MouseEvent) {
        if (!(ev.target as HTMLElement).dataset.cantdrag) {
            dragging = true
        }

        // ev.preventDefault()
    }

    function onMouseUp() {
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
            <Show when={props.zoomable}>
                <IconButton icon={ReSzie} onClick={onReszie} classList={{ [style.reSstIcon]: true }} />
            </Show>
            <div class={style.ZoomDragDiv} ref={zoomDragDiv!} classList={{ ...props.classList }}>
                {props.children}
            </div>
        </div>
    )
}
