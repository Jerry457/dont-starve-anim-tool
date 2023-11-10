import { Accessor, For, createSignal } from "solid-js"

import { TextButton } from "./components/TextButton"
import { RowData, DataViewer } from "./components/DataViewer"

import { banks, builds } from "./data"
import { Build } from "./lib/kfiles/build"

import style from "./ExportFile.module.css"

const outputTypes = ["bin", "json", "scml"]
const [hasAnim, setHasAnim] = createSignal(true)
const [hasBuild, setHasBuild] = createSignal(true)
const [hasAtlas, setHasAtlas] = createSignal(true)
const [mergeAtlas, setMergeAtlas] = createSignal(true)
const selectedBuild: boolean[] = []
const selectedBanks: boolean[] = []
let mergeBuilds: boolean = false
let reAltas: boolean = true
let dynFormat: boolean = false
let zip: boolean = true
const [outputType, setOutputType] = createSignal<(typeof outputTypes)[number]>("bin")

function AnimViewer() {
    const [animations, setAnimations] = createSignal<RowData[]>([])

    function onRowCheckChange(index: number, _: RowData, checked: boolean) {
        selectedBanks[index] = checked
    }

    function rowChecked(row: RowData, index: number) {
        if (selectedBanks[index] === undefined) selectedBanks[index] = true
        return selectedBanks[index]
    }

    return (
        <fieldset classList={{ [style.fieldset]: true, [style.anim]: true, [style.unUse]: !hasAnim() }}>
            <legend classList={{ [style.buttonLegend]: true, [style.useControl]: true }}>
                <TextButton
                    text="Anim"
                    checkbox={true}
                    classList={{ [style.normalButton]: true }}
                    check={hasAnim()}
                    onClick={() => setHasAnim(pre => !pre)}
                />
            </legend>
            <fieldset class={style.fieldset}>
                <legend class={style.buttonLegend}>
                    <div>Banks</div>
                    <TextButton text="recalculate collision" checkbox={true} classList={{ [style.normalButton]: true }} check={true} />
                </legend>
                <DataViewer
                    rows={banks}
                    keys={[{ key: "name", readOnly: true }]}
                    checkable={true}
                    rowChecked={rowChecked}
                    subSignal={setAnimations}
                    onRowCheckChange={onRowCheckChange}
                />
            </fieldset>
            <fieldset class={style.fieldset}>
                <legend>Animation</legend>
                <DataViewer rows={animations()} keys={[{ key: "name", readOnly: true }]} />
            </fieldset>
        </fieldset>
    )
}

function AltasViewer(props: { atlasSignal: Accessor<RowData[]> }) {
    return (
        <fieldset class={style.fieldset}>
            <legend classList={{ [style.buttonLegend]: true, [style.unUse]: !hasAtlas() }}>
                <TextButton
                    text="Altas"
                    checkbox={true}
                    check={hasAtlas()}
                    classList={{ [style.normalButton]: true, [style.useControl]: true }}
                    onClick={() => setHasAtlas(pre => !pre)}
                />
                <div classList={{ [style.buttonLegend]: true, [style.unUse]: !mergeAtlas() }}>
                    <TextButton
                        text="merge"
                        checkbox={true}
                        check={mergeAtlas()}
                        classList={{ [style.normalButton]: true, [style.useControl]: true }}
                        onClick={() => setMergeAtlas(pre => !pre)}
                    />
                    <TextButton
                        text="realtas"
                        checkbox={true}
                        check={reAltas}
                        classList={{ [style.normalButton]: true }}
                        onClick={checkBox => (reAltas = checkBox!.checked)}
                    />
                    <TextButton
                        text="dyn"
                        checkbox={true}
                        classList={{ [style.normalButton]: true }}
                        check={dynFormat}
                        onClick={checkBox => (dynFormat = checkBox!.checked)}
                    />
                </div>
            </legend>
            <DataViewer rows={props.atlasSignal()} keys={[{ key: "name", readOnly: true }]} />
        </fieldset>
    )
}

function BuildViewer() {
    const [symbols, setSymbols] = createSignal<RowData[]>([])
    const [atlas, setAtlas] = createSignal<RowData[]>([])

    function onChosenRow(row: RowData) {
        const build = row.data as Build
        setAtlas(build.getAltasSubRow())
    }

    function onRowCheckChange(index: number, _: RowData, checked: boolean) {
        selectedBuild[index] = checked
    }

    function rowChecked(row: RowData, index: number) {
        if (selectedBuild[index] === undefined) selectedBuild[index] = true
        return selectedBuild[index]
    }

    return (
        <fieldset classList={{ [style.fieldset]: true, [style.build]: true, [style.unUse]: !hasBuild() }}>
            <legend classList={{ [style.buttonLegend]: true, [style.useControl]: true }}>
                <TextButton
                    text="Build"
                    checkbox={true}
                    check={hasBuild()}
                    classList={{ [style.normalButton]: true }}
                    onClick={() => setHasBuild(pre => !pre)}
                />
            </legend>
            <fieldset class={style.fieldset}>
                <legend class={style.buttonLegend}>
                    <div>Builds</div>
                    <TextButton
                        text={"merge"}
                        checkbox={true}
                        check={mergeBuilds}
                        classList={{ [style.normalButton]: true, [style.useControl]: true }}
                        onClick={checkBox => (mergeBuilds = checkBox!.checked)}
                    />
                </legend>
                <DataViewer
                    rows={builds}
                    keys={[
                        { key: "name", readOnly: true },
                        { key: "scale", readOnly: true },
                    ]}
                    checkable={true}
                    rowChecked={rowChecked}
                    subSignal={setSymbols}
                    onChosenRow={onChosenRow}
                    onRowCheckChange={onRowCheckChange}
                />
            </fieldset>
            <fieldset class={style.fieldset}>
                <legend>Symbol</legend>
                <DataViewer rows={symbols()} keys={[{ key: "name", readOnly: true }]} />
            </fieldset>
            <AltasViewer atlasSignal={atlas} />
        </fieldset>
    )
}

export default function ExportFile() {
    async function onDownLoad() {}

    return (
        <div class={style.ExportFile}>
            <fieldset classList={{ [style.fileTypeFieldset]: true, [style.fieldset]: true }}>
                <legend>Type</legend>
                <For each={outputTypes}>
                    {type => (
                        <div>
                            <TextButton
                                text={type}
                                checkbox={true}
                                check={type === outputType()}
                                classList={{ [style.normalButton]: true }}
                                onClick={() => setOutputType(type)}
                            />
                        </div>
                    )}
                </For>
            </fieldset>
            <div class={style.main}>
                <AnimViewer />
                <div></div> {/* bank */}
                <BuildViewer />
            </div>
            <div class={style.download}>
                <TextButton text="DownLoad" classList={{ [style.downloadButton]: true }} />
                <div>
                    <TextButton
                        text="zip"
                        checkbox={true}
                        check={zip}
                        classList={{ [style.normalButton]: true }}
                        onClick={checkBox => (zip = checkBox!.checked)}
                    />
                </div>
            </div>
        </div>
    )
}
