import { For, createSignal } from "solid-js"
import { createStore, produce } from "solid-js/store"

import Input from "../components/Input"
import Popup from "../components/Popup"
import TableList from "../components/TableList"
import TextButton from "../components/TextButton"

import { AnimFrame, Animation, Atlas, Bank, Build, BuildFrame, BuildSymbol } from "../lib/kfiles"

import { UiData, banks, builds, setBanks, setBuilds } from "./data"

import style from "./ExportFile.module.css"

export const [shown, setShown] = createSignal(false)

const outputTypes = ["bin", "json", "spine"]
const grid = { display: "grid", "grid-template-columns": "2rem auto" }

const [outputType, setOutputType] = createSignal<string>("bin")
const [buildName, setBuildName] = createSignal("")
const [zipFileName, setZipFileName] = createSignal("")
const [recalculate, setRecalculate] = createSignal(false)
const [hasAnim, setHasAnim] = createSignal(true)
const [hasBuild, setHasBuild] = createSignal(true)
const [hasAtlas, setHasAtlas] = createSignal(true)
const [splitAtlas, setSplitAtlas] = createSignal(false)
const [repackAtlas, setRepackAtlas] = createSignal(false)
const [dynFormat, setDynFormat] = createSignal(false)

const [animations, setAnimations] = createStore<UiData<Animation, AnimFrame, Bank>[]>([])
const [buildSymbols, setBuildSymbols] = createStore<UiData<BuildSymbol, BuildFrame, Build>[]>([])

let chosenBank = -1

function TypeSelect() {
    return (
        <fieldset classList={{ [style.fieldset]: true, [style.typeFieldset]: true }}>
            <legend>Type</legend>
            <For each={outputTypes}>
                {type => (
                    <div>
                        <TextButton
                            text={type}
                            checkbox={true}
                            check={type === outputType()}
                            onClick={checkBox => {
                                if (type === outputType() && checkBox) checkBox.checked = true
                                setOutputType(type)
                            }}
                        />
                    </div>
                )}
            </For>
        </fieldset>
    )
}

function BanksList() {
    function onChosenBank(uiData: UiData<Bank, Animation, undefined>, index: number) {
        chosenBank = index
        setAnimations(uiData.sub)
    }

    function bankToRowCells(uiData: UiData<Bank, Animation, undefined>, index: number) {
        const { data: bank, use } = uiData
        return (
            <div style={grid}>
                <div class="center">
                    <Input type="checkbox" checked={use} onChange={value => setBanks(produce(pre => (pre[index].use = value as boolean)))} />
                </div>
                <div>
                    <Input value={bank.name} readOnly={true} />
                </div>
            </div>
        )
    }

    return <TableList<UiData<Bank, Animation, undefined>> list={banks} toRowCells={bankToRowCells} onChosen={onChosenBank}></TableList>
}

function AnimationsList() {
    function animationToRowCells(uiData: UiData<Animation, AnimFrame, undefined>, index: number) {
        const { data: animation, use } = uiData
        return (
            <div style={grid}>
                <div class="center">
                    <Input
                        type="checkbox"
                        checked={use}
                        onChange={value => setBanks(produce(pre => (pre[chosenBank].sub[index].use = value as boolean)))}
                    />
                </div>
                <div>
                    <Input value={animation.name} readOnly />
                </div>
            </div>
        )
    }

    return <TableList<UiData<Animation, AnimFrame, undefined>> list={animations} toRowCells={animationToRowCells}></TableList>
}

function BuildList() {
    function buildToRowCells(uiData: UiData<Build, BuildSymbol, undefined>, index: number) {
        const { data: build, use } = uiData
        return (
            <div style={grid}>
                <div class="center">
                    <Input type="checkbox" checked={use} onChange={value => setBuilds(produce(pre => (pre[index].use = value as boolean)))} />
                </div>
                <div>
                    <Input value={build.name} readOnly={true} />
                </div>
            </div>
        )
    }

    function onChosenBuild(uiData: UiData<Build, BuildSymbol, undefined>, index: number) {
        setBuildSymbols(uiData.sub)
    }

    return <TableList<UiData<Build, BuildSymbol, undefined>> list={builds} toRowCells={buildToRowCells} onChosen={onChosenBuild}></TableList>
}

function BuildSymbolsList() {
    function buildSymbolToRows(uiData: UiData<BuildSymbol, BuildFrame, Build>, index: number) {
        const { data: symbol } = uiData

        return (
            <div>
                <div>
                    <Input value={symbol.name} readOnly={true} />
                </div>
            </div>
        )
    }

    return <TableList<UiData<BuildSymbol, BuildFrame, Build>> list={buildSymbols} toRowCells={buildSymbolToRows}></TableList>
}

function AnimViewer() {
    return (
        <fieldset classList={{ [style.fieldset]: true }} style={{ display: "grid" }}>
            <legend>
                <TextButton text="Anim" checkbox={true} check={hasAnim()} onClick={() => setHasAnim(pre => !pre)} />
            </legend>
            <div style={{ display: "grid", "grid-template-rows": "1fr 1fr", overflow: "hidden" }} classList={{ [style.unSelect]: !hasAnim() }}>
                <fieldset class={style.fieldset}>
                    <legend class={style.withButtonLegend}>
                        <div>Banks</div>
                        <TextButton
                            text="recalculate collision"
                            checkbox={true}
                            check={recalculate()}
                            classList={{ [style.unSelect]: !hasBuild() || outputType() === "spine" }}
                            onClick={() => setRecalculate(pre => !pre)}
                        />
                    </legend>
                    <BanksList />
                </fieldset>
                <fieldset class={style.fieldset}>
                    <legend>Animation</legend>
                    <AnimationsList />
                </fieldset>
            </div>
        </fieldset>
    )
}

function BuildViewer() {
    return (
        <fieldset classList={{ [style.fieldset]: true }} style={{ display: "grid" }}>
            <legend>
                <TextButton text="Build" checkbox={true} check={hasBuild()} onClick={() => setHasBuild(pre => !pre)} />
            </legend>
            <div
                style={{ display: "grid", "grid-template-rows": "min-content min-content 4fr 3fr", overflow: "hidden" }}
                classList={{ [style.unSelect]: !hasBuild() }}>
                <div class="center" classList={{ [style.unSelect]: outputType() === "spine", center: true }}>
                    <TextButton text="Atlas" checkbox={true} check={hasAtlas()} onClick={() => setHasAtlas(pre => !pre)} />
                    <div classList={{ [style.unSelect]: !hasAtlas(), center: true }}>
                        <TextButton text="split" checkbox={true} check={splitAtlas()} onClick={() => setSplitAtlas(pre => !pre)} />
                        <div classList={{ [style.unSelect]: splitAtlas(), center: true }}>
                            <TextButton text="repack" checkbox={true} check={repackAtlas()} onClick={() => setRepackAtlas(pre => !pre)} />
                            <TextButton text="dyn" checkbox={true} check={dynFormat()} onClick={() => setDynFormat(pre => !pre)} />
                        </div>
                    </div>
                </div>
                <Input value={buildName()} placeholder="Merge Build Name" classList={{ [style.Input]: true }} />
                <fieldset class={style.fieldset}>
                    <legend>Builds</legend>
                    <BuildList />
                </fieldset>
                <fieldset class={style.fieldset}>
                    <legend>Symbols</legend>
                    <BuildSymbolsList />
                </fieldset>
            </div>
        </fieldset>
    )
}

export function ExportFile() {
    function onDownLoad() {}

    return (
        <Popup shown={shown} setShown={setShown} style={{ position: "absolute", top: "5rem", left: "30rem" }}>
            <div
                style={{
                    width: "700px",
                    height: "700px",
                    "padding-top": "2rem",
                    display: "grid",
                    "grid-template-rows": "min-content auto min-content",
                }}>
                <TypeSelect />
                <div style={{ display: "grid", "grid-template-columns": "1fr 1fr", overflow: "hidden" }}>
                    <AnimViewer />
                    <BuildViewer />
                </div>
                <div class={style.download} data-cantdrag={true}>
                    <TextButton text="DownLoad" classList={{ normalTextButton: true }} onClick={onDownLoad} />
                    <div>
                        <Input type="text" placeholder="File Name" value={zipFileName()} classList={{ [style.Input]: true }} />
                    </div>
                    <div data-cantdrag={true}>
                        <TextButton text="zip" checkbox={true} check={true} />
                    </div>
                </div>
            </div>
        </Popup>
    )
}
