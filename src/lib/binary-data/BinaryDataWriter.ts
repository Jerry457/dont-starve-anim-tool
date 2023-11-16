export default class BinaryDataWriter {
    uint8Arrays: Uint8Array[]
    length: number

    textEncoder = new TextEncoder()

    constructor() {
        this.uint8Arrays = []
        this.length = 0
    }

    getBuffer() {
        const mergeUint8Array = new Uint8Array(this.length)
        let offset = 0
        for (const uint8Array of this.uint8Arrays) {
            mergeUint8Array.set(uint8Array, offset)
            offset += uint8Array.length
        }

        return mergeUint8Array.buffer
    }

    writeByte(value: number) {
        const uint8Array = new Uint8Array(1)
        uint8Array[0] = value
        this.uint8Arrays.push(uint8Array)
        this.length += 1
    }

    writeInt32(value: number) {
        const uint8Array = new Uint8Array(4)
        const dataView = new DataView(uint8Array.buffer)
        dataView.setInt32(0, value, true)
        this.uint8Arrays.push(uint8Array)
        this.length += 4
    }

    writeUint32(value: number) {
        const uint8Array = new Uint8Array(4)
        const dataView = new DataView(uint8Array.buffer)
        dataView.setUint32(0, value, true)
        this.uint8Arrays.push(uint8Array)
        this.length += 4
    }

    writeHex(value: number) {
        const uint8Array = new Uint8Array(2)
        const dataView = new DataView(uint8Array.buffer)
        dataView.setUint16(0, value, true)
        this.uint8Arrays.push(uint8Array)
        this.length += 2
    }

    writeFloat32(value: number) {
        const uint8Array = new Uint8Array(4)
        const dataView = new DataView(uint8Array.buffer)
        dataView.setFloat32(0, value, true)
        this.uint8Arrays.push(uint8Array)
        this.length += 4
    }

    writeString(value: string) {
        this.writeBytes(this.textEncoder.encode(value))
    }

    writeBytes(value: Uint8Array) {
        this.uint8Arrays.push(value)
        this.length += value.length
    }
}
