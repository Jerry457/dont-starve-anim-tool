import { JSX, For } from "solid-js"
import { produce } from "solid-js/store"

import DeleteIcon from "~icons/mdi/delete-outline"

import { IconButton } from "../components/IconButton"
import { TextButton } from "../components/TextButton"
import { hideLayers, setHideLayers } from "../data/ui_data"
import { dataChangeEvent } from "../components/DataViewer"

import style from "./HideLayer.module.css"

export function isHided(layer: string) {
    return hideLayers[layer]
}

export function HideLayer() {
    function onChecked(layer: string, e: JSX.ChangeEvent) {
        setHideLayers(
            produce(pre => {
                pre[layer] = e.target.checked
            })
        )
        dispatchEvent(dataChangeEvent)
    }

    function onChange(layer: string, e: JSX.ChangeEvent) {
        if (hideLayers[e.target.value]) {
            alert(`${e.target.value} already exists`)
            e.target.value = layer
            return
        }

        setHideLayers(
            produce(pre => {
                pre[e.target.value] = pre[layer]
                pre[layer] = undefined
            })
        )
        dispatchEvent(dataChangeEvent)
    }

    function onAdd() {
        setHideLayers(
            produce(pre => {
                pre[""] = true
            })
        )
        dispatchEvent(dataChangeEvent)
    }

    function onDelete(layer: string) {
        setHideLayers(
            produce(pre => {
                pre[layer] = undefined
            })
        )
        dispatchEvent(dataChangeEvent)
    }

    return (
        <div class={style.HideLayerPopup}>
            <h2> Hide Layer </h2>
            <div class={style.list}>
                <For each={Object.entries(hideLayers)}>
                    {([layer, used]) => {
                        return (
                            <li classList={{ [style.list_li]: true, [style.unUsed]: !used }}>
                                <input type="checkbox" checked={used!} onChange={[onChecked, layer]} data-cantdrag={true} />
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
    )
}
