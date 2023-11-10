import { createSignal } from "solid-js"

import { banks, setPlayAnimation, setPlayFrame, updateData } from "./data"
import { RowData, DataViewer } from "./components/DataViewer"

import style from "./AnimDataViewer.module.css"

function rowChecked(row: RowData, index: number) {
    return row.shown
}

function onCheckChange(index: number, row: RowData, checked: boolean) {
    row.shown = checked
    updateData()
}

function onRowDataChange(index: number, row: RowData, key: string, value: string | number) {
    const data = row.data as { [key: string]: string | number }
    data[key] = value
    updateData()
}

export default function AnimDataViewer() {
    const [animations, setAnimations] = createSignal<RowData[]>([])
    const [animFrames, setAnimFrames] = createSignal<RowData[]>([])
    const [animElements, setAnimElements] = createSignal<RowData[]>([])

    return (
        <div class={style.AnimDataViewer}>
            <DataViewer rows={banks} keys={[{ key: "name" }]} titles={{ title: "Bank", hasButton: true }} subSignal={setAnimations} />
            <DataViewer
                rows={animations()}
                keys={[{ key: "name" }, { key: "frameRate" }]}
                titles={{ title: "Animation", sub_titles: ["Name", "Rate"], hasButton: true }}
                subSignal={setAnimFrames}
                onRowDataChange={onRowDataChange}
                onChosenRow={row => setPlayAnimation(row)}
            />
            <DataViewer
                rows={animFrames()}
                keys={[{ key: "idx", readOnly: true }, { key: "x" }, { key: "y" }, { key: "w" }, { key: "h" }]}
                titles={{
                    title: "Frame",
                    sub_titles: ["idx", "X", "Y", "W", "H"],
                    hasButton: true,
                }}
                checkable={true}
                rowChecked={rowChecked}
                onRowCheckChange={onCheckChange}
                onRowDataChange={onRowDataChange}
                subSignal={setAnimElements}
                onChosenRow={(row, index) => setPlayFrame(index)}
            />
            <DataViewer
                rows={animElements()}
                keys={[
                    { key: "z_index", readOnly: true },
                    { key: "symbol" },
                    { key: "frame" },
                    { key: "layer_name" },
                    { key: "m_a" },
                    { key: "m_b" },
                    { key: "m_c" },
                    { key: "m_d" },
                    { key: "m_tx" },
                    { key: "m_ty" },
                ]}
                titles={{
                    title: "Element",
                    sub_titles: ["z_index", "symbol", "frame", "layer_name", "m_a", "m_b", "m_c", "m_d", "m_tx", "m_ty"],
                    hasButton: true,
                }}
                checkable={true}
                rowChecked={rowChecked}
                onRowCheckChange={onCheckChange}
                onRowDataChange={onRowDataChange}
            />
        </div>
    )
}
