import "file-drop-element"
import { FileDropEvent, FileDropElement } from "file-drop-element"

declare module "solid-js" {
    namespace JSX {
        interface FileDropProps extends JSX.HTMLAttributes<FileDropElement> {
            onfiledrop?: (e: FileDropEvent) => void
            multiple?: boolean
            accept?: string
        }
        interface IntrinsicElements {
            "file-drop": FileDropProps
        }
    }
}
