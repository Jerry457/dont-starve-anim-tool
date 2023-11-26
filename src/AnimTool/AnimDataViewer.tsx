import { createSignal } from "solid-js"

import { banks, setPlayAnimation, setPlayFrame, reRendering } from "./data"
import { RowData, DataViewer } from "../components/DataViewer"

import style from "./AnimDataViewer.module.css"

export default function AnimDataViewer() {
    const [animations, setAnimations] = createSignal<RowData[]>([])
    const [animFrames, setAnimFrames] = createSignal<RowData[]>([])
    const [animElements, setAnimElements] = createSignal<RowData[]>([])

    function rowChecked(row: RowData, index: number) {
        return row.shown
    }

    function onCheckChange(index: number, row: RowData, checked: boolean) {
        row.shown = checked
        reRendering()
    }

    function onAnimationChange(index: number, row: RowData, key: string) {
        if (key === "frameRate") dispatchEvent(new CustomEvent("frameRateChange"))
    }

    function onAnimFrameChange(index: number, row: RowData, key: string) {
        if (key !== "idx") dispatchEvent(new CustomEvent("frameBorderChange", { detail: { index, row } }))
    }

    function onAnimElementChange(index: number, row: RowData, key: string) {
        reRendering()
    }

    return (
        <div class={style.AnimDataViewer}>
            <DataViewer rows={banks} keys={[{ key: "name" }]} titles={{ title: "Bank", hasButton: true }} subSignal={setAnimations} />
            <DataViewer
                rows={animations()}
                keys={[{ key: "name" }, { key: "frameRate" }]}
                titles={{ title: "Animation", subTitles: ["Name", "Rate"], hasButton: true }}
                subSignal={setAnimFrames}
                onRowDataChange={onAnimationChange}
                onChosenRow={row => setPlayAnimation(row)}
            />
            <DataViewer
                rows={animFrames()}
                keys={[{ key: "idx", readOnly: true }, { key: "x" }, { key: "y" }, { key: "w" }, { key: "h" }]}
                titles={{
                    title: "Frame",
                    subTitles: ["idx", "X", "Y", "W", "H"],
                    hasButton: true,
                }}
                checkable={true}
                rowChecked={rowChecked}
                onRowCheckChange={onCheckChange}
                onRowDataChange={onAnimFrameChange}
                subSignal={setAnimElements}
                onChosenRow={(row, index) => setPlayFrame(index)}
            />
            <DataViewer
                rows={animElements()}
                keys={[
                    { key: "zIndex", readOnly: true },
                    { key: "symbol" },
                    { key: "frame" },
                    { key: "layerName" },
                    { key: "m_a" },
                    { key: "m_b" },
                    { key: "m_c" },
                    { key: "m_d" },
                    { key: "m_tx" },
                    { key: "m_ty" },
                ]}
                titles={{
                    title: "Element",
                    subTitles: ["zIndex", "symbol", "frame", "layerName", "m_a", "m_b", "m_c", "m_d", "m_tx", "m_ty"],
                    hasButton: true,
                }}
                checkable={true}
                rowChecked={rowChecked}
                onRowCheckChange={onCheckChange}
                onRowDataChange={onAnimElementChange}
            />
        </div>
    )
}
