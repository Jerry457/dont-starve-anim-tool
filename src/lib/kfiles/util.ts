export function strHash(str: string) {
    let hash = 0n
    for (const c of str) {
        const v = BigInt(c.toLowerCase().charCodeAt(0))
        hash = (v + (hash << 6n) + (hash << 16n) - hash) & 0xffffffffn
    }
    return Number(hash)
}
