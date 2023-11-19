import Close from "~icons/mdi/close"
import { createSignal, Show, JSX } from "solid-js"

import TextButton from "./TextButton"
import IconButton from "./IconButton"
import ZoomDragDiv from "./ZoomDragDiv"

import style from "./Popup.module.css"

export default function Popup(props: { buttonText: string; buttonClassList?: { [k: string]: boolean | undefined } } & JSX.ElementProp) {
    const [shown, setShown] = createSignal(false)
    return (
        <>
            <TextButton text={props.buttonText} onClick={() => setShown(!shown())} classList={{ ...props.buttonClassList }} />
            <Show when={shown()}>
                <ZoomDragDiv classList={{ [style.Popup]: true, ...props.classList }} dragable={true}>
                    <IconButton classList={{ [style.closeButton]: true }} onClick={() => setShown(false)} icon={Close} />
                    <div children={props.children} />
                </ZoomDragDiv>
            </Show>
        </>
    )
}
