import { For, createSignal } from "solid-js"
import { createStore, produce } from "solid-js/store"

import Input from "../components/Input"
import Popup from "../components/Popup"
import Select from "../components/Select"
import TableList from "../components/TableList"
import TextButton from "../components/TextButton"

import { downloadFile } from "../lib/util"
import { Anim, AnimFrame, Animation, Bank, Build, BuildFrame, BuildSymbol, MergeBiuld, compileAnim, compileBuild, convertDyn } from "../lib/kfiles"

import { UiData, banks, builds, setBanks, setBuilds } from "./data"

import style from "./ExportFile.module.css"
import JSZip from "jszip"

const textEncoder = new TextEncoder()

const outputTypes = ["bin", "json", "spine"]
const grid = { display: "grid", "grid-template-columns": "2rem auto" }

export const [shown, setShown] = createSignal(false)

const [outputType, setOutputType] = createSignal<string>("bin")
const [buildName, setBuildName] = createSignal("")
const [useZip, setUseZip] = createSignal(true)
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
                <Input
                    value={buildName()}
                    placeholder="Merge Build Name"
                    classList={{ [style.Input]: true }}
                    onChange={value => setBuildName(value as string)}
                />
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
    function getExportAnim() {
        if (!hasAnim()) return

        const useBanks: Bank[] = []
        for (const { data, use, sub } of banks) {
            if (!use) continue

            const bank = new Bank(data.name)
            for (const { data: animation, use } of sub) {
                if (use) bank.animations.push(animation)
            }
            useBanks.push(bank)
        }

        if (!useBanks.length) return

        return new Anim(useBanks)
    }

    function getExportBuild() {
        if (!hasBuild()) return

        const useBuilds: Build[] = []
        for (const { use, data } of builds) {
            if (use) useBuilds.push(data)
        }

        const build = useBuilds.length === 1 ? useBuilds[0] : MergeBiuld(useBuilds, buildName())
        if (repackAtlas() || !build.hasAtlas()) build.packAtlas()

        return build
    }

    async function downDyn(build: Build) {
        const zipFile = new JSZip()
        for (const atlas of build.atlases) {
            if (atlas.ktex) zipFile.file(atlas.name, atlas.ktex.compile(), { binary: true })
        }
        const arrayBuffer = await zipFile.generateInternalStream({ type: "arraybuffer" }).accumulate()
        const uint8Array = await convertDyn(arrayBuffer, true)
        downloadFile(new Blob([uint8Array]), `${build!.name}.dyn`)
    }

    async function onDownLoad() {
        const files: { data: Uint8Array | Blob; name: string; path?: string }[] = []
        const anim = getExportAnim()
        const build = getExportBuild()

        if (outputType() === "spine") {
            if (!anim || !build) {
                alert("Please Choosen Anim and Build")
                return
            }

            return
        }

        if (anim) {
            if (recalculate() && build) anim.calculateCollisionBox(build)

            if (outputType() === "json") {
                const animJson = anim.jsonStringify()
                textEncoder.encode(animJson)
                files.push({ data: textEncoder.encode(animJson), name: "anim.json" })
            } else if (outputType() === "bin") {
                const animBin = await compileAnim(anim)
                files.push({ data: animBin, name: "anim.bin" })
            }
        }

        if (build) {
            if (hasAtlas()) {
                if (splitAtlas()) {
                    const splitedAtlas = await build.getSplitAtlas()
                    files.push(...splitedAtlas)
                } else {
                    if (dynFormat()) await downDyn(build)
                    else {
                        for (const atlas of build.atlases) {
                            if (atlas.ktex) files.push({ data: atlas.ktex.compile(), name: atlas.name })
                        }
                    }
                }
            }

            if (outputType() === "json") {
                const buildJson = build.jsonStringify()
                files.push({ data: textEncoder.encode(buildJson), name: "build.json" })
            } else if (outputType() === "bin") {
                const buildBin = await compileBuild(build)
                files.push({ data: buildBin, name: "build.bin" })
            }
        }

        if (useZip()) {
            let fileName = build ? build.name : "pack"
            if (zipFileName() !== "") fileName = zipFileName()

            const zipFile = new JSZip()
            for (const { name, data, path } of files) {
                const targetFolder = path ? zipFile.folder(path)! : zipFile
                targetFolder.file(name, data, { binary: true })
            }
            zipFile.generateAsync({ type: "blob", compression: "DEFLATE" }).then(blob => downloadFile(blob, `${fileName}.zip`))
        } else {
            for (const { name, data } of files) {
                downloadFile(data instanceof Blob ? data : new Blob([data]), name)
            }
        }
    }

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
                        <Input
                            type="text"
                            placeholder="File Name"
                            value={zipFileName()}
                            classList={{ [style.Input]: true }}
                            onChange={value => setZipFileName(value as string)}
                        />
                    </div>
                    <div data-cantdrag={true}>
                        <TextButton text="zip" checkbox={true} check={useZip()} onClick={() => setUseZip(pre => !pre)} />
                    </div>
                </div>
            </div>
        </Popup>
    )
}
