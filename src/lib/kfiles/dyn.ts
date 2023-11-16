//https://github.com/UNOWEN-OwO/dyn_decrypt

import { BinaryDataReader, BinaryDataWriter } from "../binary-data"

const textDecoder = new TextDecoder()
const chunkSize = 8
const key = new Uint8Array(chunkSize)
for (let i = 0; i < chunkSize; i++) {
    key[i] = 0x8d + i
}
const indices = [5, 3, 6, 7, 4, 2, 0, 1]

function processChunk(chunk: Uint8Array, isEncrypt?: boolean) {
    if (chunk.length > chunkSize) {
        const uint8Array = new Uint8Array(chunkSize)
        for (let i = 0; i < chunkSize; i++) {
            const index = indices[i]
            uint8Array[isEncrypt ? index : i] = chunk[isEncrypt ? i : index] ^ key[i]
        }
        return uint8Array
    } else {
        return chunk
    }
}

export async function convertDyn(buffer: ArrayBuffer, isEncrypt?: boolean) {
    const reader = new BinaryDataReader(buffer)
    const dynWriter = new BinaryDataWriter()

    let chunk = reader.readBytes(chunkSize * 2)

    if (!isEncrypt && textDecoder.decode(chunk.slice(0, 2)) === "PK") {
        dynWriter.writeBytes(chunk)
        dynWriter.writeBytes(reader.readBytes())
        return dynWriter.getBuffer()
    }

    dynWriter.writeBytes(processChunk(chunk, isEncrypt))

    while (true) {
        const writer = new BinaryDataWriter()
        writer.writeBytes(chunk.slice(chunkSize))
        let readLength = buffer.byteLength - reader.cursor
        if (readLength > 0) writer.writeBytes(reader.readBytes(Math.min(chunkSize, readLength)))

        chunk = writer.getBuffer()

        if (chunk.length === 0) return dynWriter.getBuffer()

        dynWriter.writeBytes(processChunk(chunk, isEncrypt))
    }
}
