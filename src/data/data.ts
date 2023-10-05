import { createSignal } from "solid-js"
import { createStore } from "solid-js/store";
import { SymbolMap } from "./symbol_map"
import { RowData }from "../components/DataViewer"

export const [banks, setBanks] = createSignal<RowData[]>([])
export const [builds, setBuilds] = createSignal<RowData[]>([])
export const [animations, setAnimations] = createSignal<RowData[]>([])

export const [playAnimation, setPlayAnimation] = createSignal<RowData>()

export const [symbolMap, setSymbolMap] = createStore(Object.entries(SymbolMap).map((symbol) => {
    return {
        symbol: symbol[0],
        used: true,
        maps: symbol[1].map(overSymbol => ({overSymbol: overSymbol, used: true})),
    }
}))
