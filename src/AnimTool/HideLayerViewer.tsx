import { JSX, For, createSignal } from "solid-js"
import { createStore, produce } from "solid-js/store"

import DeleteIcon from "~icons/mdi/delete-outline"

import Popup from "../components/Popup"
import IconButton from "../components/IconButton"
import TextButton from "../components/TextButton"

import style from "./HideLayerViewer.module.css"

export const [hideLayers, setHideLayers] = createStore<{ [layer: string]: boolean }>({})
export const [shown, setShown] = createSignal(false)

export function isHided(layer: string) {
    return hideLayers[layer] || hideLayers[layer.toLocaleLowerCase()]
}

export function HideLayerViewer() {
    function onChecked(layer: string, e: JSX.InputChangeEvent) {
        setHideLayers(
            produce(pre => {
                pre[layer] = e.target.checked
            })
        )
    }

    function onChange(layer: string, e: JSX.InputChangeEvent) {
        if (hideLayers[e.target.value]) {
            alert(`${e.target.value} already exists`)
            e.target.value = layer
            return
        }

        setHideLayers(
            produce(pre => {
                pre[e.target.value] = pre[layer]
                delete pre[layer]
            })
        )
    }

    function onAdd() {
        setHideLayers(produce(pre => (pre[""] = true)))
    }

    function onDelete(layer: string) {
        setHideLayers(produce(pre => delete pre[layer]))
    }

    return (
        <Popup shown={shown} setShown={setShown} style={{ position: "absolute", top: "5rem", left: "30rem" }}>
            <div class={style.HideLayerViewer}>
                <h2> Hide Layer </h2>
                <div class={style.list}>
                    <For each={Object.entries(hideLayers)}>
                        {([layer, used]) => {
                            return (
                                <li classList={{ [style.listLi]: true, [style.unUsed]: !used }}>
                                    <input type="checkbox" checked={used} onChange={[onChecked, layer]} data-cantdrag={true} />
                                    <input type="text" value={layer} onChange={[onChange, layer]} data-cantdrag={true} />
                                    <IconButton
                                        classList={{ [style.buttion]: true }}
                                        icon={DeleteIcon}
                                        onClick={[onDelete, layer]}
                                        data-cantdrag={true}
                                    />
                                </li>
                            )
                        }}
                    </For>
                </div>
                <TextButton text={"Add Item"} classList={{ [style.addButton]: true }} onClick={onAdd} data-cantdrag={true} />
            </div>
        </Popup>
    )
}
