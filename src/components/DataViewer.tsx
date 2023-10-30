import { JSX, Show, For, createSignal, Setter } from "solid-js"
import AddIcon from "~icons/mdi/plus-box-outline"
import DeleteIcon from "~icons/mdi/delete-forever-outline"

import { IconButton } from "./IconButton"
import { Bank, Animation, AnimFrame, AnimElement } from "../lib/kfiles/anim"
import { Build, BuildSymbol, BuildFrame } from "../lib/kfiles/build"

import style from "./DataViewer.module.css"

type TitleData = {
    title: string
    hasButton?: boolean

    block?: boolean
    sub_titles?: string[]
}

export const dataChangeEvent = new CustomEvent("dataChange")

export type RowData = {
    data: Bank | Animation | AnimFrame | AnimElement | Build | BuildSymbol | BuildFrame
    shown?: boolean
    sub?: RowData[]
}

export function toRowData(data: Bank | Animation | AnimFrame | AnimElement | Build | BuildSymbol | BuildFrame): RowData {
    return {
        shown: true,
        data: data,
        sub: data.getSubRow?.().map(subElement => toRowData(subElement)),
    }
}

function Title(props: { title: string; hasButton?: boolean }) {
    return (
        <div class={style.title}>
            <Show when={props.hasButton}>
                <IconButton icon={AddIcon} classList={{ [style.AddButton]: true }}></IconButton>
                <IconButton icon={DeleteIcon} classList={{ [style.AddButton]: true }}></IconButton>
            </Show>
            {props.title}
        </div>
    )
}

function DataViewerTitles(props: TitleData) {
    return (
        <thead>
            <tr>
                <th colspan={(props.sub_titles ? props.sub_titles.length : 1) + Number(props.block)}>
                    <Title title={props.title} hasButton={props.hasButton} />
                </th>
            </tr>
            <tr>
                <Show when={props.block && props.sub_titles}>
                    <th>{}</th>
                </Show>
                <For each={props.sub_titles}>
                    {title => (
                        <th>
                            <Title title={title} />
                        </th>
                    )}
                </For>
            </tr>
        </thead>
    )
}

function DataViewerCell(props: { value: string | number; setValue?: (value: string | number) => void }) {
    const value_type = typeof props.value
    function onTextChange(e: JSX.ChangeEvent) {
        if (e.target) {
            const target = e.target
            const value = target.value

            if (value_type == "number") {
                const number = Number(value)
                if (isNaN(number)) {
                    alert("invalid number")
                    target.value = String(props.value)
                } else {
                    props.setValue?.(number)
                }
            } else {
                props.setValue?.(value)
            }
        }
    }

    return (
        <td>
            <input type="text" value={props.value} onChange={onTextChange} readOnly={!props.setValue} />
        </td>
    )
}

function DataViewerRow(props: {
    row: RowData
    keys: { key: string; readOnly?: boolean }[]

    chosen: boolean
    checkable?: boolean
    onClick: (e: MouseEvent) => void
}) {
    function onCheckChange(e: JSX.ChangeEvent) {
        if (e.target) {
            props.row.shown = e.target.checked
            dispatchEvent(dataChangeEvent)
        }
    }

    const data = props.row.data as { [key: string]: string | number }

    return (
        <tr class={props.chosen ? style.chosen_tr : ""} onClick={props.onClick}>
            <Show when={props.checkable}>
                <td>
                    <input type="checkbox" checked={props.row.shown} onChange={onCheckChange} />
                </td>
            </Show>
            <For each={props.keys}>
                {cell_data => {
                    return (
                        <DataViewerCell
                            value={data[cell_data.key]}
                            setValue={
                                cell_data.readOnly
                                    ? undefined
                                    : (value: string | number) => {
                                          data[cell_data.key] = value
                                          dispatchEvent(dataChangeEvent)
                                      }
                            }
                        />
                    )
                }}
            </For>
        </tr>
    )
}

export function DataViewer(props: {
    rows: RowData[]
    keys: { key: string; readOnly?: boolean }[]
    titles: TitleData

    checkable?: boolean
    subSignal?: Setter<RowData[]>
    OnClickRow?: (row: RowData) => void
}) {
    const [chosenRow, setChosenRow] = createSignal<number | undefined>()

    return (
        <div class={style.DataViewer}>
            <table>
                <DataViewerTitles {...props.titles} block={Boolean(props.checkable)} />
                <tbody>
                    <For each={props.rows}>
                        {(row, index) => {
                            function onClickRow(e?: MouseEvent) {
                                setChosenRow(index())

                                if (row.sub) {
                                    props.subSignal?.(pre => row.sub!)
                                }

                                if (props.OnClickRow) {
                                    props.OnClickRow(row)
                                }
                            }
                            if (index() === props.rows.length - 1) {
                                onClickRow()
                            }

                            return (
                                <DataViewerRow
                                    checkable={props.checkable}
                                    chosen={chosenRow() === index()}
                                    keys={props.keys}
                                    row={row}
                                    onClick={onClickRow}
                                />
                            )
                        }}
                    </For>
                </tbody>
            </table>
        </div>
    )
}
