import { createSignal } from "solid-js"
import { createStore, createMutable } from "solid-js/store"
import { SymbolMaps } from "./symbol_map"
import { RowData } from "../components/DataViewer"
import { OverrideSymbol } from "../AnimTool/OverrideSymbol"

export const banks = createMutable<RowData[]>([])
export const builds = createMutable<RowData[]>([])

export const [playAnimation, setPlayAnimation] = createSignal<RowData>()

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

export const [hideLayers, setHideLayers] = createStore<{ [layer: string]: boolean | undefined }>({})
