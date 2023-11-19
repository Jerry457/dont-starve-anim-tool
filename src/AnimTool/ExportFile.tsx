import { JSX, Accessor, For, createSignal, createEffect } from "solid-js"
import JSZip from "jszip"

import { TextButton } from "../components/TextButton"
import { RowData, DataViewer } from "../components/DataViewer"
import Select from "../components/Select"

import { banks, builds } from "./data"
import { Build, compileBuild } from "../lib/kfiles/build"
import { Anim, Bank, compileAnim } from "../lib/kfiles/anim"
import { convertDyn } from "../lib/kfiles/dyn"

import style from "./ExportFile.module.css"

const textEncoder = new TextEncoder()

const outputTypes = ["bin", "json"] // , "scml"

const [hasAnim, setHasAnim] = createSignal(true)
const [hasBuild, setHasBuild] = createSignal(true)
const [hasAtlas, setHasAtlas] = createSignal(true)
const [splitAtlas, setSplitAtlas] = createSignal(false)

const selectedBanks: boolean[] = []
let recalculate = false

let selectedBuild = 0
let repack = false
let dynFormat = false
let zipFileName = ""

const [useZip, setUseZip] = createSignal(true)
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
                    <TextButton
                        text="recalculate collision"
                        checkbox={true}
                        check={recalculate}
                        classList={{ [style.normalButton]: true, [style.unUse]: !hasBuild() }}
                        onClick={() => {
                            recalculate = !recalculate
                        }}
                    />
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

function AtlasViewer(props: { atlasSignal: Accessor<RowData[]> }) {
    return (
        <fieldset class={style.fieldset}>
            <legend classList={{ [style.buttonLegend]: true, [style.unUse]: !hasAtlas() }}>
                <TextButton
                    text="Atlas"
                    checkbox={true}
                    check={hasAtlas()}
                    classList={{ [style.normalButton]: true, [style.useControl]: true }}
                    onClick={() => setHasAtlas(pre => !pre)}
                />
                <div classList={{ [style.buttonLegend]: true, [style.unUse]: splitAtlas() }}>
                    <TextButton
                        text="splitAtlas"
                        checkbox={true}
                        check={splitAtlas()}
                        classList={{ [style.normalButton]: true, [style.useControl]: true }}
                        onClick={() => setSplitAtlas(pre => !pre)}
                    />
                    <TextButton
                        text="repack"
                        checkbox={true}
                        check={repack}
                        classList={{ [style.normalButton]: true }}
                        onClick={checkBox => (repack = checkBox!.checked)}
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

    function onChange(e?: JSX.SelectChangeEvent) {
        if (e) selectedBuild = Number(e.target.value)
        if (builds[selectedBuild]) {
            const rowData = builds[selectedBuild]
            const build = rowData.data as Build
            setSymbols(rowData.sub!)
            setAtlas(build.getAtlasSubRow())
        }
    }
    onChange()
    addEventListener("updateData", () => onChange())
    createEffect(() => onChange())

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
                <legend>Builds</legend>
                <Select classList={{ [style.buildSelect]: true }} onChange={onChange}>
                    <For each={builds}>
                        {(rowData, index) => {
                            const build = rowData.data as Build
                            return (
                                <option value={index()} selected={selectedBuild === index()}>
                                    {build.name}
                                </option>
                            )
                        }}
                    </For>
                </Select>
            </fieldset>
            <fieldset class={style.fieldset}>
                <legend>Symbol</legend>
                <DataViewer rows={symbols()} keys={[{ key: "name", readOnly: true }]} />
            </fieldset>
            <AtlasViewer atlasSignal={atlas} />
        </fieldset>
    )
}

function downloadFile(blob: Blob, fileName: string) {
    const downloadLink = document.createElement("a")
    downloadLink.href = URL.createObjectURL(blob)
    downloadLink.download = fileName
    downloadLink.click()
    URL.revokeObjectURL(downloadLink.href)
}

export default function ExportFile() {
    async function onDownLoad() {
        if (!hasAnim() && !hasBuild()) return

        let anim: Anim | undefined
        let build: Build | undefined

        const type = outputType()
        const files: { data: Uint8Array | Blob; name: string; path?: string }[] = []
        const promises = []

        if (hasBuild() && builds[selectedBuild]) {
            build = builds[selectedBuild].data as Build
        }
        if (hasAnim()) {
            const packBanks = selectedBanks.filter((use, index) => use && banks[index]).map((use, index) => banks[index].data as Bank)
            if (packBanks.length > 0) anim = new Anim(packBanks)
            if (recalculate && build) anim?.calculateCollisionBox(build)
        }

        if (!anim && !build) return

        if (anim) {
            if (type === "json") {
                const animJson = JSON.stringify(anim, undefined, 4)
                files.push({ data: textEncoder.encode(animJson), name: "anim.json" })
            } else if (type === "bin") {
                promises.push(compileAnim(anim).then(buffer => files.push({ data: buffer, name: "anim.bin" })))
            }
        }
        if (build) {
            if (hasAtlas()) {
                if (splitAtlas()) {
                    promises.push(
                        build.getSplitAtlas((blob, symbolName, frameName) => files.push({ data: blob, name: `${frameName}.png`, path: symbolName }))
                    )
                } else {
                    if (repack) build.packAtlas()

                    if (dynFormat) {
                        const zipFile = new JSZip()
                        for (const atlas of build.atlases) {
                            if (atlas.ktex) zipFile.file(atlas.name, atlas.ktex.compile(), { binary: true })
                        }
                        zipFile
                            .generateInternalStream({ type: "arraybuffer" })
                            .accumulate()
                            .then(arrayBuffer => {
                                convertDyn(arrayBuffer, true).then(uint8Array => downloadFile(new Blob([uint8Array]), `${build!.name}.dyn`))
                            })
                    } else {
                        for (const atlas of build.atlases) {
                            if (atlas.ktex) {
                                files.push({ data: atlas.ktex.compile(), name: atlas.name })
                            }
                        }
                    }
                }
            }

            if (type === "json") {
                const buildJson = JSON.stringify(
                    build,
                    (key, value) => {
                        return key !== "canvas" && key !== "ktex" ? value : undefined
                    },
                    4
                )
                files.push({ data: textEncoder.encode(buildJson), name: "build.json" })
            } else if (type === "bin") {
                promises.push(compileBuild(build).then(buffer => files.push({ data: buffer, name: "build.bin" })))
            }
        }

        Promise.all(promises).then(() => {
            if (useZip()) {
                let fileName = build ? build.name : "pack"
                if (zipFileName !== "") fileName = zipFileName

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
        })
    }

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
            <div class={style.download} data-cantdrag={true}>
                <TextButton text="DownLoad" classList={{ [style.downloadButton]: true }} onClick={onDownLoad} />
                <div classList={{ [style.zipFileName]: true, [style.unUse]: !useZip() }}>
                    <input type="text" data-cantdrag={true} placeholder="File Name" onChange={e => (zipFileName = e.target.value)} />
                </div>
                <div data-cantdrag={true}>
                    <TextButton
                        text="zip"
                        checkbox={true}
                        check={useZip()}
                        classList={{ [style.normalButton]: true }}
                        onClick={() => setUseZip(pre => !pre)}
                    />
                </div>
            </div>
        </div>
    )
}
