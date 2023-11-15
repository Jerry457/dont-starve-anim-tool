export function clamp(num: number, min: number, max: number) {
    return Math.min(Math.max(num, min), max)
}

export function nextTwoPower(x: number) {
    return 2 ** Math.ceil(Math.log2(x))
}
