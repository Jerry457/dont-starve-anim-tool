import { createSignal } from "solid-js"

import { builds } from "./data/ui_data"
import { RowData, DataViewer } from "./components/DataViewer"

import style from "./BuildViewer.module.css"

export default function BuildViewer() {
    const [symbols, setSymbols] = createSignal<RowData[]>([])
    const [buildFrames, setBuildFrames] = createSignal<RowData[]>([])

    return (
        <div class={style.BuildViewer}>
            <DataViewer
                rows={builds()}
                keys={[{ key: "name" }, { key: "scale", readOnly: true }]}
                titles={{ title: "Build", hasButton: true, sub_titles: ["Name", "Scale"] }}
                checkable={true}
                subSignal={setSymbols}
            />
            <DataViewer
                rows={symbols()}
                keys={[{ key: "name" }]}
                titles={{ title: "Symbol", hasButton: true }}
                checkable={true}
                subSignal={setBuildFrames}
            />
            <DataViewer
                rows={buildFrames()}
                keys={[
                    { key: "frame_num" },
                    { key: "duration" },
                    { key: "x" },
                    { key: "y" },
                    { key: "w", readOnly: true },
                    { key: "h", readOnly: true },
                    { key: "vert_idx", readOnly: true },
                    { key: "vert_count", readOnly: true },
                ]}
                titles={{
                    title: "Frame",
                    sub_titles: ["Num", "Druation", "X", "Y", "W", "H", "Vidx", "Vcont"],
                    hasButton: true,
                }}
                checkable={true}
            />
        </div>
    )
}
