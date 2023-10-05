import style from "./TextButton.module.css"

export function TextButton(props: { text: string; classList?: { [k: string]: boolean | undefined }; onClick?: (e: MouseEvent) => void }) {
    return (
        <button
            type="button"
            classList={{
                [style.TextButton]: true,
                ...props.classList,
            }}
            onClick={props.onClick}>
            {props.text}
        </button>
    )
}
