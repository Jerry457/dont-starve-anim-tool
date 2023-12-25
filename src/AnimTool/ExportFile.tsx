import { For, createSignal } from "solid-js"
import { createStore, produce } from "solid-js/store"

import Input from "../components/Input"
import Popup from "../components/Popup"
import TableList from "../components/TableList"
import TextButton from "../components/TextButton"

import { AnimFrame, Animation, Bank } from "../lib/kfiles"

import { UiData, banks, setBanks } from "./data"

import style from "./ExportFile.module.css"

export const [shown, setShown] = createSignal(false)

const outputTypes = ["bin", "json", "spine"]
const grid = { display: "grid", "grid-template-columns": "2rem auto" }

const [outputType, setOutputType] = createSignal<string>("bin")
const [hasAnim, setHasAnim] = createSignal(true)
const [hasBuild, setHasBuild] = createSignal(true)
const [recalculate, setRecalculate] = createSignal(false)

const [animations, setAnimations] = createStore<UiData<Animation, AnimFrame, Bank>[]>([])

let chosenBank = -1

function TypeSelect() {
    return (
        <fieldset classList={{ [style.fieldset]: true, [style.typeFieldset]: true }}>
            <legend>Type</legend>
            <For each={outputTypes}>
                {type => (
                    <div>
                        <TextButton text={type} checkbox={true} check={type === outputType()} onClick={() => setOutputType(type)} />
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
                            classList={{ [style.unSelect]: !hasBuild() }}
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
            <div style={{ display: "grid", "grid-template-rows": "1fr 1fr", overflow: "hidden" }} classList={{ [style.unSelect]: !hasBuild() }}></div>
        </fieldset>
    )
}

export function ExportFile() {
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
                <div
                    style={{
                        display: "grid",
                        "grid-template-columns": "1fr 1fr",
                        overflow: "hidden",
                    }}>
                    <AnimViewer />
                    <BuildViewer />
                </div>
            </div>
        </Popup>
    )
}
