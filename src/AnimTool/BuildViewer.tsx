import { createStore, produce } from "solid-js/store"

import Input from "../components/Input"
import TableList from "../components/TableList"
import { refreshAnimation } from "./AnimationViewer"
import { AddButton, DeleteButton, WrenchButton } from "./titleButtons"
import { setShown, setBuildFrame, setXInput, setYInput, setWInput, setHInput } from "./BuildFrameViewer"

import { UiData, builds, setBuilds, toUiData } from "./data"
import { Build, BuildFrame, BuildSymbol } from "../lib/kfiles"

import style from "./titleButtons.module.css"

const [buildSymbols, setBuildSymbols] = createStore<UiData<BuildSymbol, BuildFrame, Build>[]>([])
const [buildFrames, setBuildFrames] = createStore<UiData<BuildFrame, undefined, BuildSymbol>[]>([])

let chosenBuild = -1
let chosenBuildSymbol = -1
let chosenBuildFrame = -1

function BuildsList() {
    const grid = { display: "grid", "grid-template-columns": "2rem 3fr 1fr" }

    function buildToRowCells(uiData: UiData<Build, BuildSymbol, undefined>, index: number) {
        const { data: build, use } = uiData
        return (
            <div style={grid}>
                <div class="center">
                    <Input type="checkbox" checked={use} onChange={value => setBuilds(produce(pre => (pre[index].use = value as boolean)))} />
                </div>
                <div>
                    <Input
                        value={build.name}
                        onChange={value => {
                            build.name = value as string
                            refreshAnimation()
                        }}
                    />
                </div>
                <div>
                    <Input
                        value={build.scale}
                        onChange={value => {
                            build.scale = value as number
                            refreshAnimation()
                        }}
                    />
                </div>
            </div>
        )
    }

    function onChosenBuild(uiData: UiData<Build, BuildSymbol, undefined>, index: number) {
        chosenBuild = index
        setBuildSymbols(uiData.sub)
        if (!uiData.sub.length) {
            setBuildFrames([])
        }
    }

    function onAddBuild() {
        const build = new Build()
        setBuilds(pre => [...pre, toUiData(build)])
    }

    function onDeleteBuild() {
        if (chosenBuild < 0) return

        setBuilds(produce(pre => pre.splice(chosenBuild, 1)))
        if (builds.length) {
            setBuildSymbols(builds[builds.length - 1].sub)
        } else {
            setBuildSymbols([])
            setBuildFrames([])
        }
    }

    return (
        <TableList<UiData<Build, BuildSymbol, undefined>>
            titles={
                <div>
                    <div class="center" classList={{ [style.mainTitle]: true }}>
                        <text class={style.titleButton}>Build</text>
                        <AddButton onClick={onAddBuild} />
                        <DeleteButton onClick={onDeleteBuild} />
                    </div>
                    <div style={grid} class={style.subTitle}>
                        <div class="center">
                            <Input type="checkbox" style={{ visibility: "hidden" }} />
                        </div>
                        <div>name</div>
                        <div>scale</div>
                    </div>
                </div>
            }
            list={builds}
            initChonsen={builds.length - 1}
            toRowCells={buildToRowCells}
            onChosen={onChosenBuild}></TableList>
    )
}

function BuildSymbolsList() {
    function buildSymbolToRows(uiData: UiData<BuildSymbol, BuildFrame, Build>, index: number) {
        const { data: symbol, use } = uiData

        return (
            <div style={{ display: "grid", "grid-template-columns": "2rem auto" }}>
                <div class="center">
                    <Input type="checkbox" checked={use} onChange={value => setBuildSymbols(produce(pre => (pre[index].use = value as boolean)))} />
                </div>
                <div>
                    <Input
                        value={symbol.name}
                        onChange={value => {
                            symbol.name = value as string
                            refreshAnimation()
                        }}
                    />
                </div>
            </div>
        )
    }

    function onChosen(data: UiData<BuildSymbol, BuildFrame, Build>, index: number) {
        chosenBuildSymbol = index
        setBuildFrames(data.sub)
    }

    function onAddBuildSymbol() {
        const symbol = new BuildSymbol()
        const build = builds[chosenBuild].data
        build.symbols.push(symbol)
        setBuilds(
            produce(pre => {
                const symbols = pre[chosenBuild].sub
                symbols.push(toUiData(symbol))
            })
        )
        setBuildSymbols(builds[chosenBuild].sub)
    }

    function onDeleteBuildSymbol() {
        if (chosenBuildSymbol < 0) return

        const build = builds[chosenBuild].data
        build.symbols.splice(chosenBuildSymbol, 1)
        setBuilds(
            produce(pre => {
                const symbols = pre[chosenBuild].sub
                symbols.splice(chosenBuildSymbol, 1)
            })
        )
        setBuildSymbols(builds[chosenBuild].sub)
    }

    return (
        <TableList<UiData<BuildSymbol, BuildFrame, Build>>
            titles={
                <div class="center" classList={{ [style.mainTitle]: true }}>
                    <text class={style.titleButton}>Symbol</text>
                    <AddButton onClick={onAddBuildSymbol} />
                    <DeleteButton onClick={onDeleteBuildSymbol} />
                </div>
            }
            list={buildSymbols}
            toRowCells={buildSymbolToRows}
            onChosen={onChosen}></TableList>
    )
}

function BuildFramesList() {
    const grid = { display: "grid", "grid-template-columns": "2rem 7fr 10fr 10fr 10fr 10fr 10fr" }

    let tbody: HTMLTableSectionElement

    function buildFrameToRows(uiData: UiData<BuildFrame, undefined, BuildSymbol>, index: number) {
        const { data: frame, parent: symbolUiData, use } = uiData
        function onFrameNumChange(value: number) {
            frame.frameNum = value
            symbolUiData?.data.sort()
            setBuilds(produce(pre => pre[chosenBuild].sub[chosenBuildSymbol].sub.sort((a, b) => a.data.frameNum - b.data.frameNum)))
            setBuildFrames(builds[chosenBuild].sub[chosenBuildSymbol].sub)
        }

        return (
            <div style={grid}>
                <div class="center">
                    <Input type="checkbox" checked={use} onChange={value => setBuildFrames(produce(pre => (pre[index].use = value as boolean)))} />
                </div>
                <div>
                    <Input value={frame.frameNum} onChange={value => onFrameNumChange(value as number)} />
                </div>
                <div>
                    <Input
                        value={frame.duration}
                        onChange={value => {
                            frame.duration = value as number
                            refreshAnimation()
                        }}
                    />
                </div>
                <div class={`frameX${index}`}>
                    <Input
                        value={frame.x}
                        onChange={value => {
                            frame.x = value as number
                            refreshAnimation()
                        }}
                    />
                </div>
                <div class={`frameY${index}`}>
                    <Input
                        value={frame.y}
                        onChange={value => {
                            frame.y = value as number
                            refreshAnimation()
                        }}
                    />
                </div>
                <div class={`frameW${index}`}>
                    <Input value={frame.w} readOnly={true} />
                </div>
                <div class={`frameH${index}`}>
                    <Input value={frame.h} readOnly={true} />
                </div>
            </div>
        )
    }

    function onChosen(uiData: UiData<BuildFrame, undefined, BuildSymbol>, index: number) {
        chosenBuildFrame = index
        setBuildFrame(uiData.data)

        setXInput(tbody.getElementsByClassName(`frameX${index}`)[0].getElementsByTagName("input")[0])
        setYInput(tbody.getElementsByClassName(`frameY${index}`)[0].getElementsByTagName("input")[0])
        setWInput(tbody.getElementsByClassName(`frameW${index}`)[0].getElementsByTagName("input")[0])
        setHInput(tbody.getElementsByClassName(`frameH${index}`)[0].getElementsByTagName("input")[0])
    }

    function onAddBuildFrame() {
        if (!builds[chosenBuild]) return
        if (!builds[chosenBuild].sub[chosenBuildSymbol]) return

        const buildSymbol = builds[chosenBuild].sub[chosenBuildSymbol].data
        const buildFrame = buildSymbol.addNewFrame()

        setBuilds(
            produce(pre => {
                const buildFrames = pre[chosenBuild].sub[chosenBuildSymbol].sub
                buildFrames.push(toUiData(buildFrame))
            })
        )
        setBuildFrames(builds[chosenBuild].sub[chosenBuildSymbol].sub)
    }

    function onDeleteBuildFrame() {
        if (!builds[chosenBuild]) return
        if (!builds[chosenBuild].sub[chosenBuildSymbol]) return

        const symbol = builds[chosenBuild].sub[chosenBuildSymbol].data
        symbol.frames.splice(chosenBuildFrame, 1)
        setBuilds(
            produce(pre => {
                const buildFrames = pre[chosenBuild].sub[chosenBuildSymbol].sub
                buildFrames.splice(chosenBuildFrame, 1)
            })
        )
        const buildFrames = builds[chosenBuild].sub[chosenBuildSymbol].sub
        setBuildFrames(buildFrames)
    }

    function onClickWrench() {
        if (!builds[chosenBuild]) return
        if (!builds[chosenBuild].sub[chosenBuildSymbol]) return
        if (!builds[chosenBuild].sub[chosenBuildSymbol].sub[chosenBuildFrame]) return

        setShown(pre => !pre)
        const buildFrame = builds[chosenBuild].sub[chosenBuildSymbol].sub[chosenBuildFrame].data as BuildFrame
        setBuildFrame(buildFrame)
    }

    return (
        <TableList<UiData<BuildFrame, undefined, BuildSymbol>>
            titles={
                <div>
                    <div class="center" style={{ position: "relative" }} classList={{ [style.mainTitle]: true }}>
                        <text class={style.titleButton}>Frame</text>
                        <AddButton onClick={onAddBuildFrame} />
                        <DeleteButton onClick={onDeleteBuildFrame} />
                        <WrenchButton onClick={onClickWrench} />
                    </div>
                    <div style={grid} class={style.subTitle}>
                        <div class="center">
                            <Input type="checkbox" style={{ visibility: "hidden" }} />
                        </div>
                        <div>num</div>
                        <div>druation</div>
                        <div>x</div>
                        <div>y</div>
                        <div>w</div>
                        <div>h</div>
                    </div>
                </div>
            }
            ref={tbody!}
            list={buildFrames}
            onChosen={onChosen}
            toRowCells={buildFrameToRows}></TableList>
    )
}

export default function BuildViewer() {
    return (
        <div style={{ height: "100%", overflow: "hidden", display: "grid", "grid-template-columns": "5fr 5fr 12fr" }}>
            <BuildsList />
            <BuildSymbolsList />
            <BuildFramesList />
        </div>
    )
}
