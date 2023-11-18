import { createSignal } from "solid-js"

import { builds, updateData } from "./data"
import { RowData, DataViewer } from "../components/DataViewer"

import style from "./BuildViewer.module.css"

function rowChecked(row: RowData, index: number) {
    return row.shown
}

function onCheckChange(index: number, row: RowData, checked: boolean) {
    row.shown = checked
    updateData()
}

function onRowDataChange(index: number, row: RowData, key: string, value: string | number) {
    const data = row.data as any as { [key: string]: string | number }
    data[key] = value
    updateData()
}

export default function BuildViewer() {
    const [symbols, setSymbols] = createSignal<RowData[]>([])
    const [buildFrames, setBuildFrames] = createSignal<RowData[]>([])

    return (
        <div class={style.BuildViewer}>
            <DataViewer
                rows={builds}
                keys={[{ key: "name" }, { key: "scale" }]}
                titles={{ title: "Build", hasButton: true, subTitles: ["Name", "Scale"] }}
                checkable={true}
                rowChecked={rowChecked}
                onRowCheckChange={onCheckChange}
                onRowDataChange={onRowDataChange}
                subSignal={setSymbols}
            />
            <DataViewer
                rows={symbols()}
                keys={[{ key: "name" }]}
                titles={{ title: "Symbol", hasButton: true }}
                checkable={true}
                rowChecked={rowChecked}
                onRowCheckChange={onCheckChange}
                onRowDataChange={onRowDataChange}
                subSignal={setBuildFrames}
            />
            <DataViewer
                rows={buildFrames()}
                keys={[
                    { key: "frameNum" },
                    { key: "duration" },
                    { key: "x", readOnly: true },
                    { key: "y", readOnly: true },
                    { key: "w", readOnly: true },
                    { key: "h", readOnly: true },
                ]}
                titles={{
                    title: "Frame",
                    subTitles: ["Num", "Druation", "X", "Y", "W", "H"],
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
