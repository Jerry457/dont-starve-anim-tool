import { JSX, Show, For, createSignal, Setter } from "solid-js"
import AddIcon from "~icons/mdi/plus-box-outline"
import DeleteIcon from "~icons/mdi/delete-outline"

import { updateData } from "../data"
import { IconButton } from "./IconButton"
import { Bank, Animation, AnimFrame, AnimElement } from "../lib/kfiles/anim"
import { Build, Altas, BuildSymbol, BuildFrame } from "../lib/kfiles/build"

import style from "./DataViewer.module.css"

type TitleData = {
    title?: string
    hasButton?: boolean

    block?: boolean
    sub_titles?: string[]
}

export type RowData = {
    data: Bank | Animation | AnimFrame | AnimElement | Build | Altas | BuildSymbol | BuildFrame
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
            <Show when={props.title}>
                <tr>
                    <th colspan={(props.sub_titles ? props.sub_titles.length : 1) + Number(props.block)}>
                        <Title title={props.title!} hasButton={props.hasButton} />
                    </th>
                </tr>
            </Show>
            <tr>
                <Show when={props.block && props.sub_titles}>
                    <th>
                        <input type="checkbox" style="visibility: hidden;" />
                    </th>
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
    function onChange(e: JSX.InputChangeEvent) {
        const value = e.target.value

        if (value_type == "number") {
            const number = Number(value)
            if (isNaN(number)) {
                alert("invalid number")
                e.target.value = String(props.value)
            } else {
                props.setValue?.(number)
            }
        } else {
            props.setValue?.(value)
        }
    }

    return (
        <td>
            <input type="text" value={props.value} onChange={onChange} readOnly={!props.setValue} />
        </td>
    )
}

function DataViewerRow(props: {
    index: number
    row: RowData
    keys: { key: string; readOnly?: boolean }[]

    chosen: boolean
    onClick: (e: MouseEvent) => void
    checkable?: boolean
    checked?: boolean
    onDataChange?: (index: number, row: RowData, key: string, value: string | number) => void
    onCheckChange?: (index: number, row: RowData, checked: boolean) => void
}) {
    const data = props.row.data as { [key: string]: string | number }

    function onCheckChange(e: JSX.InputChangeEvent) {
        props.onCheckChange?.(props.index, props.row, e.target.checked)
    }

    function onDataChange(value: string | number, key: string) {
        data[key] = value
        props.onDataChange?.(props.index, props.row, key, value)
    }

    return (
        <tr class={props.chosen ? style.chosen_tr : ""} onClick={props.onClick}>
            <Show when={props.checkable}>
                <td>
                    <input type="checkbox" checked={props.checked} onChange={onCheckChange} />
                </td>
            </Show>

            <For each={props.keys}>
                {cell_data => {
                    return (
                        <DataViewerCell
                            value={data[cell_data.key]}
                            setValue={cell_data.readOnly ? undefined : value => onDataChange(value, cell_data.key)}
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
    titles?: TitleData

    checkable?: boolean
    subSignal?: Setter<RowData[]>
    rowChecked?: (row: RowData, index: number) => boolean | undefined
    onChosenRow?: (row: RowData, index: number) => void
    onRowDataChange?: (index: number, row: RowData, key: string, value: string | number) => void
    onRowCheckChange?: (index: number, row: RowData, checked: boolean) => void
}) {
    const [chosenRow, setChosenRow] = createSignal<number | undefined>()

    return (
        <div class={style.DataViewer}>
            <table>
                <DataViewerTitles {...props.titles} block={Boolean(props.checkable)} />
                <tbody>
                    <For each={props.rows}>
                        {(row, index) => {
                            const _index = index()
                            function onClickRow(e?: MouseEvent) {
                                setChosenRow(_index)

                                if (row.sub) {
                                    props.subSignal?.(pre => row.sub!)
                                }

                                if (props.onChosenRow) {
                                    props.onChosenRow(row, _index)
                                }
                            }
                            if (props.subSignal && _index === props.rows.length - 1) {
                                onClickRow()
                            }

                            return (
                                <DataViewerRow
                                    index={_index}
                                    row={row}
                                    keys={props.keys}
                                    checkable={props.checkable}
                                    checked={props.rowChecked?.(row, _index)}
                                    chosen={chosenRow() === _index}
                                    onClick={onClickRow}
                                    onDataChange={props.onRowDataChange}
                                    onCheckChange={props.onRowCheckChange}
                                />
                            )
                        }}
                    </For>
                </tbody>
            </table>
        </div>
    )
}
