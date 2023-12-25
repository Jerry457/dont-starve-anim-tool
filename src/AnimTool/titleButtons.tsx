import AddIcon from "~icons/mdi/plus-box-outline"
import WrenchIcon from "~icons/mdi/wrench"
import DeleteIcon from "~icons/mdi/delete-outline"
import IconButton from "../components/IconButton"

import style from "./titleButtons.module.css"

export function AddButton(props: { onClick?: () => void }) {
    return <IconButton onClick={props.onClick} icon={AddIcon} classList={{ [style.titleButton]: true }}></IconButton>
}

export function DeleteButton(props: { onClick?: () => void }) {
    return <IconButton onClick={props.onClick} icon={DeleteIcon} classList={{ [style.titleButton]: true }}></IconButton>
}

export function WrenchButton(props: { onClick?: () => void; ref?: HTMLButtonElement }) {
    return <IconButton ref={props.ref} onClick={props.onClick} icon={WrenchIcon} classList={{ [style.titleButton]: true }}></IconButton>
}
