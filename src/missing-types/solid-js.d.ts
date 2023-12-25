import { JSX } from "solid-js"

declare module "solid-js" {
    namespace JSX {
        interface ElementProp {
            class?: string
            classList?: { [k: string]: boolean | undefined }
            id?: string
            children?: JSX.Element
            onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>
            style?: string | JSX.CSSProperties
        }

        interface InputChangeEvent extends Event {
            target: HTMLInputElement
        }

        interface SelectChangeEvent extends Event {
            target: HTMLSelectElement
        }
    }
}
