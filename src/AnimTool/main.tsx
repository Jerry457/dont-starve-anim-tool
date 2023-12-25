import { createSignal, onMount } from "solid-js"
import ResizeBar from "../components/ResizeBar"

import AnimViewer from "./AnimViewer"
import BuildViewer from "./BuildViewer"
import AnimationViewer from "./AnimationViewer"
import { ExportFile } from "./ExportFile"
import { BuildFrameViewer } from "./BuildFrameViewer"
import { HideLayerViewer } from "./HideLayerViewer"
import { SymbolMapViewer } from "./SymbolMapViewer"

import { clamp } from "../lib/math"


export default function Main() {
    let maxWidth: number
    let maxHeight: number
    let leftPartWidth: number
    let rightPartWidth: number
    let topPartHeight: number
    let bottomPartHeight: number
    let leftPart: HTMLDivElement
    let topPart: HTMLDivElement
    let rightPart: HTMLDivElement
    let bottomPart: HTMLDivElement

    const [leftProportion, setLeftProportion] = createSignal(1)
    const [topProportion, setTopProportion] = createSignal(1)

    function onDragVertical(dx: number, dy: number) {
        topPartHeight = clamp(topPartHeight + dy, 10, maxHeight - 10)
        bottomPartHeight = clamp(bottomPartHeight - dy, 10, maxHeight - 10)
        setTopProportion(topPartHeight / bottomPartHeight)
    }

    function onDragHorizontal(dx: number, dy: number) {
        leftPartWidth = clamp(leftPartWidth + dx, 10, maxWidth - 10)
        rightPartWidth = clamp(rightPartWidth - dx, 10, maxWidth - 10)
        setLeftProportion(leftPartWidth / rightPartWidth)
    }

    function onInitLeftRight() {
        setLeftProportion(1)
        leftPartWidth = leftPart.getBoundingClientRect().width
        rightPartWidth = rightPart.getBoundingClientRect().width
        maxWidth = leftPartWidth + rightPartWidth
    }

    function onInitTopBottom() {
        setTopProportion(1)
        topPartHeight = topPart.getBoundingClientRect().height
        bottomPartHeight = bottomPart.getBoundingClientRect().height
        maxHeight = topPartHeight + bottomPartHeight
    }

    onMount(() => {
        leftPartWidth = leftPart.getBoundingClientRect().width
        rightPartWidth = rightPart.getBoundingClientRect().width
        topPartHeight = topPart.getBoundingClientRect().height
        bottomPartHeight = bottomPart.getBoundingClientRect().height
        maxWidth = leftPartWidth + rightPartWidth
        maxHeight = topPartHeight + bottomPartHeight
    })

    return (
        <div style={{ overflow: "hidden", display: "grid", "grid-template-rows": `${topProportion()}fr 1fr` }}>
            <div ref={topPart!} style={{ overflow: "hidden", display: "grid", "grid-template-columns": `${leftProportion()}fr 1fr` }}>
                <div ref={leftPart!} style={{ overflow: "hidden", position: "relative" }}>
                    <ResizeBar onDrag={onDragHorizontal} onDblClick={onInitLeftRight} resizeDirection="horizontal" />
                    <BuildViewer />
                </div>
                <div ref={rightPart!} style={{ overflow: "hidden" }}>
                    <AnimationViewer />
                </div>
            </div>
            <div ref={bottomPart!} style={{ overflow: "hidden", position: "relative" }}>
                <ResizeBar onDrag={onDragVertical} onDblClick={onInitTopBottom} resizeDirection="vertical" />
                <AnimViewer />
            </div>
            {/* Popup */}

            <ExportFile />
            <BuildFrameViewer />
            <HideLayerViewer />
            <SymbolMapViewer />
        </div>
    )
}
