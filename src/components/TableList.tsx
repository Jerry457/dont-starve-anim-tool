import { JSX, Index, createSignal, JSXElement, createEffect, Show } from "solid-js"

import style from "./TableList.module.css"

export default function TableList<T>(props: {
    list: T[]
    toRowCells: (data: T, index: number) => JSXElement

    initChonsen?: number
    titles?: JSX.Element
    ref?: HTMLTableSectionElement
    onSort?: (list: T[]) => void
    onChosen?: (data: T, index: number) => void
}) {
    const [chosen, setChosen] = createSignal(props.list.length - 1)

    function setChosenRow(index: number) {
        setChosen(index)
        props.onChosen?.(props.list[index], index)
    }

    createEffect(() => {
        if (!props.list.length) {
            return
        }
        if (props.initChonsen) {
            setChosenRow(props.list.length - 1)
        } else {
            setChosenRow(0)
        }
    })

    return (
        <div class={style.TableList} style={{ display: "grid", "grid-template-rows": "min-content auto" }}>
            <Show when={props.titles}>
                <div class={style.head}> {props.titles}</div>
            </Show>

            <div class={style.body} ref={props.ref}>
                <Index each={props.list}>
                    {(data, index) => {
                        return (
                            <div
                                class={style.row}
                                onMouseDown={[setChosenRow, index]}
                                onFocusIn={[setChosenRow, index]}
                                classList={{ [style.chosenRow]: chosen() === index }}>
                                {props.toRowCells(data(), index)}
                            </div>
                        )
                    }}
                </Index>
            </div>
        </div>
    )
}
