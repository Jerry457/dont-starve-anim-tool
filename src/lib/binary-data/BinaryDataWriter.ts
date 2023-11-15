export default class BinaryDataWriter {
    uint8Array: Uint8Array
    dataView: DataView
    private _cursor: number // Current byte offset

    textEncoder = new TextEncoder()

    private _expandArrayBuffer(length: number) {
        const uint8Array = new Uint8Array(this.uint8Array.length + length)
        uint8Array.set(this.uint8Array, 0)
        this.uint8Array = uint8Array
        this.dataView = new DataView(this.uint8Array.buffer)
    }

    constructor() {
        this.uint8Array = new Uint8Array(0)
        this.dataView = new DataView(this.uint8Array.buffer)
        this._cursor = 0
    }

    getBuffer() {
        return this.uint8Array.buffer
    }

    writeByte(value: number) {
        this._expandArrayBuffer(1)
        this.dataView.setUint8(this._cursor, value)
        this._cursor += 1
    }

    writeInt32(value: number) {
        this._expandArrayBuffer(4)
        this.dataView.setInt32(this._cursor, value, true)
        this._cursor += 4
    }

    writeUint32(value: number) {
        this._expandArrayBuffer(4)
        this.dataView.setUint32(this._cursor, value, true)
        this._cursor += 4
    }

    writeHex(value: number) {
        this._expandArrayBuffer(2)
        this.dataView.setUint16(this._cursor, value, true)
        this._cursor += 2
    }

    writeFloat32(value: number) {
        this._expandArrayBuffer(4)
        this.dataView.setFloat32(this._cursor, value, true)
        this._cursor += 4
    }

    writeString(value: string) {
        this.writeBytes(this.textEncoder.encode(value))
    }

    writeBytes(value: Uint8Array) {
        this._expandArrayBuffer(value.length)
        this.uint8Array.set(value, this._cursor)
        this._cursor += value.length
    }
}
