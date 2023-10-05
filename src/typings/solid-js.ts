import { JSX } from "solid-js"

declare module "solid-js" {
    namespace JSX {
        interface ElementProp {
            classList?: {
                [k: string]: boolean | undefined
            }
            children?: JSX.Element
            onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>
        }

        interface ChangeEvent extends Event {
            target: HTMLInputElement
        }
    }
}
