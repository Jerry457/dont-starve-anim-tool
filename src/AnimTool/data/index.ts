import { createSignal } from "solid-js"
import { createStore, createMutable } from "solid-js/store"
import { SymbolMaps } from "./symbolMaps"
import { RowData } from "../../components/DataViewer"

import { Ktex } from "../../lib/kfiles/ktex"
import { Build } from "../../lib/kfiles/build"

export function updateData() {
    dispatchEvent(new CustomEvent("updateData"))
}

export const banks = createMutable<RowData[]>([])
export const builds = createMutable<RowData[]>([])

export const [playAnimation, setPlayAnimation] = createSignal<RowData>()
export const [playFrame, setPlayFrame] = createSignal<number>(0)

export const [colorCube, setColorCube] = createSignal("")
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

type buildAtlas = {
    buildName: string
    atlases: { [atlasName: string]: Ktex }
}

const buildAtlases: buildAtlas[] = []

function linkBuildAtlases(buildAtlas: buildAtlas, build: Build) {
    const { buildName, atlases } = buildAtlas
    if (build.name === buildName) {
        build.splitAtlas(atlases)
        updateData()

        return true
    }

    return false
}

export function findRelevantAtlases(build: Build) {
    for (const [idx, buildAtlas] of buildAtlases.entries()) {
        if (linkBuildAtlases(buildAtlas, build)) {
            buildAtlases.splice(idx, 1)
            return
        }
    }
}

export function addbuildAtlas(buildAtlas: buildAtlas) {
    for (const rowData of builds) {
        const build = rowData.data as Build
        if (linkBuildAtlases(buildAtlas, build)) return
    }
    buildAtlases.push(buildAtlas)
}
