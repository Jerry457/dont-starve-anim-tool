import { createSignal } from "solid-js"
import { createStore, createMutable } from "solid-js/store"
import { SymbolMaps } from "./symbol_maps"
import { RowData } from "../components/DataViewer"

export const updateAnimationEvent = new CustomEvent("updateAnimation")

export const banks = createMutable<RowData[]>([])
export const builds = createMutable<RowData[]>([])

export const [playAnimation, setPlayAnimation] = createSignal<RowData>()
export const [colourCube, setColourCube] = createSignal("")
export const [hideLayers, setHideLayers] = createStore<{ [layer: string]: boolean | undefined }>({})
export const [symbolMaps, setSymbolMaps] = createStore(
    Object.entries(SymbolMaps).reduce(
        (
            newMaps: {
                [symbol: string]: { used: boolean; overSymbols: { [symbol: string]: boolean | undefined } } | undefined
            },
            [symbol, OverSymbols]
        ) => {
            newMaps[symbol] = {
                used: true,
                overSymbols: OverSymbols.reduce((newOverSymbols: { [layer: string]: boolean | undefined }, symbol) => {
                    newOverSymbols[symbol] = true
                    return newOverSymbols
                }, {}),
            }
            return newMaps
        },
        {}
    )
)
