import ReSzie from "~icons/mdi/restore"
import { onMount, onCleanup, JSX, Show, createSignal, createEffect } from "solid-js"

import IconButton from "./IconButton"

import style from "./ZoomDragDiv.module.css"

const SCALE_FACTOR = 1.2

export default function ZoomDragDiv(
    props: JSX.ElementProp & {
        zoomable?: boolean
        dragable?: boolean
        customResize?: (zoomDragDiv: HTMLDivElement) => void
        customDrag?: (deltaX: number, deltaY: number, zoomDragDiv: HTMLDivElement) => void
        customZoom?: (scale: number, zoomDragDiv: HTMLDivElement) => void
        containerStyle?: JSX.ElementProp["style"]
        containerclassList?: JSX.ElementProp["classList"]
    }
) {
    let container: HTMLDivElement
    let zoomDragDiv: HTMLDivElement

    const [dragging, setDragging] = createSignal(false)
    let scale = 1
    let deltaX = 0
    let deltaY = 0

    let _alert = window.alert
    window.alert = function (...args) {
        setDragging(false)
        _alert(...args)
    }

    createEffect(() => {
        dragging() ? document.documentElement.classList.add(style.dragging) : document.documentElement.classList.remove(style.dragging)
    })

    onMount(() => {
        if (props.zoomable) {
            container.addEventListener("mousewheel", onWheel as EventListener, { passive: false })
        }

        if (props.dragable) {
            window.removeEventListener("alert", onMouseUp)
            window.addEventListener("mouseup", onMouseUp)
            window.addEventListener("mousemove", onMouseMove)
        }
    })

    onCleanup(() => {
        if (props.zoomable) {
            container.removeEventListener("mousewheel", onWheel as EventListener)
        }

        if (props.dragable) {
            window.removeEventListener("alert", onMouseUp)
            window.removeEventListener("mouseup", onMouseUp)
            window.removeEventListener("mousemove", onMouseMove)
            setDragging(false)
        }
    })

    function updateStyle() {
        zoomDragDiv.style.scale = String(scale)
        zoomDragDiv.style.translate = `${deltaX}px ${deltaY}px`
    }

    function onMouseDown(ev: MouseEvent) {
        if (!props.dragable) {
            return
        }
        if (!(ev.target as HTMLElement).dataset.cantdrag) {
            setDragging(true)
        }
    }

    function onMouseUp() {
        setDragging(false)
    }

    function onMouseMove(ev: MouseEvent) {
        if (dragging()) {
            deltaX += ev.movementX
            deltaY += ev.movementY

            if (props.customDrag) props.customDrag(deltaX, deltaY, zoomDragDiv)
            else updateStyle()

            ev.preventDefault()
        }
    }

    function onReszie(e: MouseEvent) {
        scale = 1
        deltaX = 0
        deltaY = 0

        if (props.customResize) {
            props.customResize(zoomDragDiv)
        } else {
            updateStyle()
        }
    }

    function onWheel(ev: WheelEvent) {
        const delta = ev.deltaX || ev.deltaY || ev.deltaZ
        if (delta === 0) return

        if (delta < 0) scale *= SCALE_FACTOR // isZoomIn
        else scale /= SCALE_FACTOR

        if (props.customZoom) props.customZoom(scale, zoomDragDiv)
        else updateStyle()

        ev.preventDefault()
    }

    return (
        <div
            style={props.containerStyle}
            classList={{ [style.container]: true, ...props.containerclassList }}
            ref={container!}
            onMouseDown={onMouseDown}>
            <Show when={props.zoomable}>
                <IconButton icon={ReSzie} onClick={onReszie} classList={{ [style.reSstIcon]: true }} />
            </Show>
            <div style={props.style} class={style.ZoomDragDiv} ref={zoomDragDiv!} classList={{ ...props.classList }}>
                {props.children}
            </div>
        </div>
    )
}
