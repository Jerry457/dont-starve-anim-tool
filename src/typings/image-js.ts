import Image from "image-js"

declare module "image-js" {
    interface Image {
        insert(
            toInsert: Image,
            options?: {
                x?: number
                y?: number
                inPlace?: boolean
            }
        ): this
        show(image: Image): void
    }
}
