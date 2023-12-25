import { JSX, For, Show, createSignal } from "solid-js"
import { createStore, produce } from "solid-js/store"

import { symbolMapData } from "./data/symbolMap"

import TriangleIcon from "~icons/mdi/triangle"
import DeleteIcon from "~icons/mdi/delete-outline"
import GitHub from "~icons/mdi/github"

import Popup from "../components/Popup"
import IconButton from "../components/IconButton"
import TextButton from "../components/TextButton"

import style from "./SymbolMapViewer.module.css"

type symbolMapUiData = {
    [symbol: string]: {
        mapSymbols: { [mapSymbol: string]: boolean }
        used: boolean
    }
}

const symbolMapUi: symbolMapUiData = {}
for (const symbol in symbolMapData) {
    const mapSymbols: symbolMapUiData[string]["mapSymbols"] = {}

    for (const mapSymbol of symbolMapData[symbol]) {
        mapSymbols[mapSymbol] = true
    }
    symbolMapUi[symbol] = { used: true, mapSymbols }
}

export const [shown, setShown] = createSignal(false)
export const [symbolMap, setSymbolMap] = createStore(symbolMapUi)

export function getMapSymbol(symbolName: string) {
    const symbolMapData = symbolMap[symbolName] && symbolMap[symbolName.toLowerCase()]

    if (!symbolMapData || !symbolMapData.used) return

    for (const mapSymbol in symbolMapData.mapSymbols) {
        if (symbolMapData.mapSymbols[mapSymbol]) return mapSymbol
    }
}

export function SymbolMapViewer() {
    function onOverSymbolCheck(data: string[], e: JSX.InputChangeEvent) {
        const [symbol, mapSymbol] = data

        setSymbolMap(produce(pre => (pre[symbol].mapSymbols[mapSymbol] = e.target.checked)))
    }

    function onChangeOverSymbol(data: string[], e: JSX.InputChangeEvent) {
        const [symbol, mapSymbol] = data

        if (symbolMap[symbol].mapSymbols[e.target.value]) {
            alert(`${e.target.value} already exists in ${symbol}`)
            e.target.value = mapSymbol
            return
        }

        setSymbolMap(
            produce(pre => {
                pre[symbol].mapSymbols[e.target.value] = pre[symbol].mapSymbols[mapSymbol]
                delete pre[symbol].mapSymbols[mapSymbol]
            })
        )
    }

    function addOverSymbol(symbol: string) {
        setSymbolMap(produce(pre => (pre[symbol].mapSymbols[""] = true)))
    }

    function deleteOverSymbol(data: string[]) {
        const [symbol, mapSymbol] = data

        setSymbolMap(produce(pre => delete pre[symbol].mapSymbols[mapSymbol]))
    }

    function onSymbolMapCheck(symbol: string, e: JSX.InputChangeEvent) {
        setSymbolMap(produce(pre => (pre[symbol].used = e.target.checked)))
    }

    function onChangeSymbolMap(symbol: string, e: JSX.InputChangeEvent) {
        if (symbolMap[e.target.value]) {
            alert(`${e.target.value} already exists`)
            e.target.value = symbol
            return
        }

        setSymbolMap(
            produce(pre => {
                pre[e.target.value] = pre[symbol]
                delete pre[symbol]
            })
        )
    }

    function addSymbolMaps() {
        setSymbolMap(produce(pre => (pre[""] = { used: true, mapSymbols: {} })))
    }

    function deleteSymbolMaps(symbol: string, e: MouseEvent) {
        setSymbolMap(produce(pre => delete pre[symbol]))
    }

    function onClickGitHub() {
        window.open("https://github.com/Jerry457/dont-starve-anim-tool/blob/main/src/AnimTool/data/symbolMap.ts")
    }

    return (
        <Popup shown={shown} setShown={setShown} style={{ position: "absolute", top: "30rem", left: "30rem" }}>
            <div class={style.SymbolMapViewer}>
                <div>
                    <IconButton icon={GitHub} classList={{ [style.githubButton]: true }} onClick={onClickGitHub} />
                </div>
                <h2> Override Symbol </h2>
                <div class={style.list}>
                    <For each={Object.entries(symbolMap)}>
                        {([symbol, data]) => {
                            const [expand, setExpand] = createSignal(false)

                            return (
                                <div classList={{ [style.unUsed]: !data.used }}>
                                    <div class={style.listLi}>
                                        <IconButton
                                            icon={TriangleIcon}
                                            classList={{ [expand() ? style.expandButtion : style.collapseButtion]: true }}
                                            onClick={() => setExpand(pre => !pre)}
                                            data-cantdrag={true}
                                        />
                                        <input type="checkbox" checked={data.used} onChange={[onSymbolMapCheck, symbol]} data-cantdrag={true} />
                                        <input type="text" value={symbol} onChange={[onChangeSymbolMap, symbol]} data-cantdrag={true} />
                                        <IconButton icon={DeleteIcon} onClick={[deleteSymbolMaps, symbol]} data-cantdrag={true} />
                                    </div>
                                    <Show when={expand()}>
                                        <For each={Object.entries(data.mapSymbols)}>
                                            {([overSymbol, used]) => (
                                                <div classList={{ [style.subMenu]: true, [style.listLi]: true, [style.unUsed]: !used }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={used}
                                                        onChange={[onOverSymbolCheck, [symbol, overSymbol]]}
                                                        data-cantdrag={true}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={overSymbol}
                                                        onChange={[onChangeOverSymbol, [symbol, overSymbol]]}
                                                        data-cantdrag={true}
                                                    />
                                                    <IconButton
                                                        icon={DeleteIcon}
                                                        onClick={[deleteOverSymbol, [symbol, overSymbol]]}
                                                        data-cantdrag={true}
                                                    />
                                                </div>
                                            )}
                                        </For>
                                        <TextButton text={"Add Item"} classList={{ [style.addButton]: true }} onClick={() => addOverSymbol(symbol)} />
                                    </Show>
                                </div>
                            )
                        }}
                    </For>
                </div>
                <TextButton text={"Add Item"} classList={{ [style.addButton]: true }} onClick={addSymbolMaps} data-cantdrag={true} />
            </div>
        </Popup>
    )
}
