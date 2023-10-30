export default class BinaryDataReader {
    dataView: DataView
    // Current byte offset
    cursor: number

    constructor(public buffer: ArrayBuffer, starting_cursor?: number) {
        this.dataView = new DataView(buffer)
        this.cursor = starting_cursor ?? 0
    }

    readByte(offset?: number) {
        if (!offset) {
            offset = this.cursor
        }
        this.cursor = offset + 1

        return this.dataView.getUint8(offset)
    }

    readInt32(offset?: number) {
        if (!offset) {
            offset = this.cursor
        }
        this.cursor = offset + 4

        return this.dataView.getInt32(offset, true)
    }

    readUint32(offset?: number) {
        if (!offset) {
            offset = this.cursor
        }
        this.cursor = offset + 4

        return this.dataView.getUint32(offset, true)
    }

    readtHex(offset?: number) {
        if (!offset) {
            offset = this.cursor
        }
        this.cursor = offset + 2

        return this.dataView.getUint16(offset, true)
    }

    readFloat32(offset?: number) {
        if (!offset) {
            offset = this.cursor
        }
        this.cursor = offset + 4

        return this.dataView.getFloat32(offset, true)
    }

    readString(length: number): string
    readString(offset: number, length?: number): string
    readString(offset: number, length?: number) {
        return new TextDecoder("ascii").decode(this.readBytes(offset, length))
    }

    readBytes(length: number): Uint8Array
    readBytes(offset: number, length?: number): Uint8Array
    readBytes(offset: number, length?: number) {
        if (!length) {
            length = offset
            offset = this.cursor
        }
        this.cursor = offset + length

        const array: number[] = []
        for (let index = 0; index < length; index++) {
            array.push(this.dataView.getUint8(offset + index))
        }
        return new Uint8Array(array)
    }
}
