import Close from "~icons/mdi/close"
import { Show, JSX, Accessor, Setter } from "solid-js"

import IconButton from "./IconButton"
import ZoomDragDiv from "./ZoomDragDiv"

import style from "./Popup.module.css"

export default function Popup(
    props: JSX.ElementProp & {
        shown: Accessor<boolean>
        setShown: Setter<boolean>
    }
) {
    return (
        <Show when={props.shown()}>
            <ZoomDragDiv classList={{ [style.Popup]: true, ...props.classList }} dragable={true} style={props.style}>
                <IconButton classList={{ [style.closeButton]: true }} onClick={() => props.setShown(false)} icon={Close} />
                <div class={props.class}>{props.children}</div>
            </ZoomDragDiv>
        </Show>
    )
}
