import { JSX, For, Show, createSignal } from "solid-js"
import { produce } from "solid-js/store"

import TriangleIcon from "~icons/mdi/triangle"
import DeleteIcon from "~icons/mdi/delete-outline"
import GitHub from "~icons/mdi/github"

import IconButton from "../components/IconButton"
import TextButton from "../components/TextButton"
import { symbolMaps, setSymbolMaps } from "./data"

import style from "./OverrideSymbol.module.css"

export function mapSymbol(symbol_name: string) {
    const symbolMapData = symbolMaps[symbol_name] && symbolMaps[symbol_name.toLowerCase()]

    if (!symbolMapData || !symbolMapData.used) return

    for (const [overSymbol, used] of Object.entries(symbolMapData.overSymbols)) {
        if (used) return overSymbol
    }

    return
}

export function OverrideSymbol() {
    function onOverSymbolCheck(data: string[], e: JSX.InputChangeEvent) {
        const [symbol, overSymbol] = data

        setSymbolMaps(produce(pre => (pre[symbol]!.overSymbols[overSymbol] = e.target.checked)))
    }

    function onChangeOverSymbol(data: string[], e: JSX.InputChangeEvent) {
        const [symbol, overSymbol] = data

        if (symbolMaps[symbol]!.overSymbols[e.target.value]) {
            alert(`${e.target.value} already exists in ${symbol}`)
            e.target.value = overSymbol
            return
        }

        setSymbolMaps(
            produce(pre => {
                pre[symbol]!.overSymbols[e.target.value] = pre[symbol]!.overSymbols[overSymbol]
                pre[symbol]!.overSymbols[overSymbol] = undefined
            })
        )
    }

    function addOverSymbol(symbol: string) {
        setSymbolMaps(
            produce(pre => {
                pre[symbol]!.overSymbols[""] = true
            })
        )
    }

    function deleteOverSymbol(data: string[]) {
        const [symbol, overSymbol] = data

        setSymbolMaps(
            produce(pre => {
                pre[symbol]!.overSymbols[overSymbol] = undefined
            })
        )
    }

    function onSymbolMapCheck(symbol: string, e: JSX.InputChangeEvent) {
        setSymbolMaps(
            produce(pre => {
                pre[symbol]!.used = e.target.checked
            })
        )
    }

    function onChangeSymbolMap(symbol: string, e: JSX.InputChangeEvent) {
        if (symbolMaps[e.target.value]) {
            alert(`${e.target.value} already exists`)
            e.target.value = symbol
            return
        }

        setSymbolMaps(
            produce(pre => {
                pre[e.target.value] = pre[symbol]
                pre[symbol] = undefined
            })
        )
    }

    function addSymbolMaps() {
        setSymbolMaps(
            produce(pre => {
                pre[""] = { used: true, overSymbols: {} }
            })
        )
    }

    function deleteSymbolMaps(symbol: string, e: MouseEvent) {
        setSymbolMaps(
            produce(pre => {
                pre[symbol] = undefined
            })
        )
    }

    function onClickGitHub() {
        window.open("https://github.com/Jerry457/dont-starve-anim-tool/blob/main/src/data/symbolMaps.ts")
    }

    return (
        <div class={style.OverrideSymbolPopup}>
            <div>
                <IconButton icon={GitHub} classList={{ [style.githubButton]: true }} onClick={onClickGitHub} />
            </div>
            <h2> Override Symbol </h2>
            <div class={style.list}>
                <For each={Object.entries(symbolMaps)}>
                    {([symbol, data]) => {
                        const [expand, setExpand] = createSignal(false)

                        return (
                            <div classList={{ [style.unUsed]: !data!.used }}>
                                <div class={style.listLi}>
                                    <IconButton
                                        icon={TriangleIcon}
                                        classList={{ [expand() ? style.expandButtion : style.collapseButtion]: true }}
                                        onClick={() => {
                                            setExpand(pre => !pre)
                                        }}
                                        data-cantdrag={true}
                                    />
                                    <input type="checkbox" checked={data!.used} onChange={[onSymbolMapCheck, symbol]} data-cantdrag={true} />
                                    <input type="text" value={symbol} onChange={[onChangeSymbolMap, symbol]} data-cantdrag={true} />
                                    <IconButton icon={DeleteIcon} onClick={[deleteSymbolMaps, symbol]} data-cantdrag={true} />
                                </div>
                                <Show when={expand()}>
                                    <For each={Object.entries(data!.overSymbols)}>
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
    )
}
