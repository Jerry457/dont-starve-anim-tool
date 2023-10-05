import Close from "~icons/mdi/close-circle-outline"
import { createSignal, Show, JSX } from "solid-js"

import { TextButton } from "./TextButton"
import { IconButton } from "./IconButton"

import style from "./Popup.module.css"


export function Popup(props: { buttonText: string; buttonClassList?: { [k: string]: boolean | undefined } } & JSX.ElementProp) {
    const [shown, setShown] = createSignal(false)
    return (
        <>
            <TextButton text={props.buttonText} onClick={() => setShown(!shown())} classList={{ ...props.buttonClassList }} />
            <Show when={shown()}>
                <div classList={{ [style.Popup]: true, ...props.classList }}>
                    <IconButton classList={{ [style.close_button]: true }} onClick={() => setShown(false)} icon={Close} />
                    <div children={props.children} />
                </div>
            </Show>
        </>
    )
}
