export default class BinaryDataReader {
    dataView: DataView
    cursor: number // Current byte offset

    asciiTextDecoder = new TextDecoder("ascii")

    constructor(public buffer: ArrayBuffer, starting_cursor?: number) {
        this.dataView = new DataView(buffer)
        this.cursor = starting_cursor ?? 0
    }

    readByte(offset: number = this.cursor) {
        this.cursor = offset + 1

        return this.dataView.getUint8(offset)
    }

    readInt32(offset: number = this.cursor) {
        this.cursor = offset + 4

        return this.dataView.getInt32(offset, true)
    }

    readUint32(offset: number = this.cursor) {
        this.cursor = offset + 4

        return this.dataView.getUint32(offset, true)
    }

    readtHex(offset: number = this.cursor) {
        this.cursor = offset + 2

        return this.dataView.getUint16(offset, true)
    }

    readFloat32(offset: number = this.cursor) {
        this.cursor = offset + 4

        return this.dataView.getFloat32(offset, true)
    }

    readString(length: number, offset?: number) {
        return this.asciiTextDecoder.decode(this.readBytes(length, offset))
    }

    readBytes(length?: number, offset: number = this.cursor): Uint8Array {
        if (length === undefined) length = this.buffer.byteLength - offset

        this.cursor = offset + length
        const result = new Uint8Array(length)

        for (let index = 0; index < length; index++) {
            result[index] = this.dataView.getUint8(offset + index)
        }

        return result
    }
}
