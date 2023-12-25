import { JSX, Index, createSignal, JSXElement, createEffect } from "solid-js"

import style from "./TableList.module.css"

export default function TableList<T>(props: {
    titles: JSX.Element
    list: T[]
    ref?: HTMLTableSectionElement
    toRowCells: (data: T, index: number) => JSXElement
    initChonsen?: number
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
            <div class={style.head}> {props.titles}</div>
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
