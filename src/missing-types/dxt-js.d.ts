declare module "dxt-js" {
    type flags = {
        // Use DXT1 compression.
        DXT1: 1 // 1 << 0

        // Use DXT3 compression.
        DXT3: 2 // 1 << 1

        // Use DXT5 compression.
        DXT5: 4 // 1 << 2

        // Use a very slow but very high quality colour compressor.
        ColourIterativeClusterFit: 256 // 1 << 8

        //! Use a slow but high quality colour compressor (the default).
        ColourClusterFit: 8 // 1 << 3

        //! Use a fast but low quality colour compressor.
        ColourRangeFit: 16 // 1 << 4

        //! Use a perceptual metric for colour error (the default).
        ColourMetricPerceptual: 32 // 1 << 5

        //! Use a uniform metric for colour error.
        ColourMetricUniform: 64 // 1 << 6

        //! Weight the colour by alpha during cluster fit (disabled by default).
        WeightColourByAlpha: 128 // 1 << 7
    }
    export const flags: flags

    export function compress(inputData: Uint8Array, width: number, height: number, flags: flags[keyof flags]): Uint8Array
    export function decompress(data: Uint8Array, width: number, height: number, flags: flags[keyof flags]): Uint8Array
}
