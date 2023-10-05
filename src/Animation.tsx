import ColorPickerIcon from "~icons/mdi/palette"
import AddIcon from "~icons/mdi/plus-circle-outline"
import DeleteIcon from "~icons/mdi/delete-forever-outline"
import { JSX, Setter, createSignal, createEffect, Show, For } from "solid-js"
import { produce } from "solid-js/store"

import ZoomDragDiv from "./components/ZoomDragDiv"
import { Popup } from "./components/Popup"
import { TextButton } from "./components/TextButton"
import { IconButton } from "./components/IconButton"
import { playAnimation, builds, symbolMap, setSymbolMap, hideLayers, setHideLayers } from "./data/ui_data"
import { RowData } from "./components/DataViewer"

import style from "./Animation.module.css"

function AnimationFrames(props: RowData) {
    function mapSymbol(symbol_name: string) {
        for (const symbol_map of symbolMap) {
            if (symbol_map.used && symbol_name === symbol_map.symbol) {
                for (const map of symbol_map.maps) {
                    if (map.used) {
                        return map.overSymbol
                    }
                }
            }
        }

        return symbol_name
    }

    function getBuildFrame(symbol_name: string, frame_num: number) {
        for (const build of builds()) {
            if (!build.sub || !build.shown) {
                continue
            }

            for (const symbol of build.sub!) {
                if (!symbol.sub || !symbol.shown || symbol.cell.name !== symbol_name) {
                    continue
                }

                for (const frame of symbol.sub) {
                    const duration = frame.cell.duration as number
                    const _frame_num = frame.cell.frame_num as number
                    if (_frame_num <= frame_num && frame_num < _frame_num + duration) {
                        return frame
                    }
                }
            }
        }
    }

    return (
        <>
            <Show when={props.sub}>
                <For each={props.sub}>
                    {(element, index) => {
                        if (!element.shown) {
                            return
                        }

                        const elementCell = element.cell as {
                            symbol: string
                            frame: number
                            layer_name: string
                            m_a: number
                            m_b: number
                            m_c: number
                            m_d: number
                            m_tx: number
                            m_ty: number
                        }

                        for (const data of hideLayers) {
                            if (data.used && data.layer === elementCell.layer_name) {
                                return
                            }
                        }

                        const symbol = mapSymbol(elementCell.symbol)
                        const buildFrame = getBuildFrame(symbol, elementCell.frame)
                        const buildFrameCell = buildFrame?.cell as {
                            x: number
                            y: number
                            w: number
                            h: number
                            imageURL: string
                        }

                        return (
                            <Show when={buildFrame && buildFrame.shown && buildFrameCell}>
                                <img
                                    src={buildFrameCell.imageURL}
                                    style={[
                                        "position: absolute",
                                        `transform-origin: ${buildFrameCell.w / 2 - buildFrameCell.x}px ${buildFrameCell.h / 2 - buildFrameCell.y}px`,
                                        `transform: matrix(${elementCell.m_a}, ${elementCell.m_b}, ${elementCell.m_c}, ${elementCell.m_d}, ${
                                            elementCell.m_tx + buildFrameCell.x
                                        }, ${elementCell.m_ty + buildFrameCell.y})`,
                                        `z-index: ${props.sub!.length - index()}`,
                                    ].join(";")}
                                />
                            </Show>
                        )
                    }}
                </For>
            </Show>
        </>
    )
}

function AnimationPlayer() {
    const [playAnimationFrame, setPlayAnimationFrame] = createSignal<RowData>()

    createEffect(intervalID => {
        const animation = playAnimation()
        if (!animation || !animation.sub) {
            return
        }

        let index = 0
        const frames = animation.sub
        const frame_num = animation.sub.length
        const timeout = 1000 / (animation.cell.frame_rate as number)

        clearInterval(intervalID as number)
        return setInterval(() => {
            setPlayAnimationFrame(frames[index])
            index = (index + 1) % frame_num
        }, timeout)
    })

    return (
        <ZoomDragDiv classList={{ [style.AnimationPlayer]: true }}>
            <Show when={playAnimationFrame() && playAnimationFrame()!.shown}>
                <AnimationFrames {...playAnimationFrame()!} />
            </Show>
        </ZoomDragDiv>
    )
}

export default function Animation() {
    const [color, setColor] = createSignal<string>("#C8C8C8")

    function onPickColor(e: JSX.ChangeEvent) {
        setColor(e.target.value)
    }

    let colorInput: HTMLInputElement

    return (
        <div class={style.Animation}>
            <div class={style.animation_container} style={{ "background-color": color() }}>
                <AnimationPlayer />
            </div>
            <div class={style.tool_menu}>
                <div class={style.color_picker}>
                    <IconButton icon={ColorPickerIcon} onClick={() => colorInput.click()} />
                    <input type="color" value={color()} onInput={onPickColor} ref={colorInput!} />
                </div>
                <div>
                    <Popup buttonText={"OverrideSymbol"} buttonClassList={{ [style.tool_button]: true }}>
                        <OverrideSymbol />
                    </Popup>
                </div>
                <div>
                    <Popup buttonText={"HideLayer"} buttonClassList={{ [style.tool_button]: true }}>
                        <HideLayer />
                    </Popup>
                </div>
            </div>
        </div>
    )
}

function OverrideSymbol() {
    function onOverSymbolCheckChange(data: number[], e: JSX.ChangeEvent) {
        const [index, over_index] = data

        setSymbolMap(
            produce(pre => {
                pre[index].maps[over_index].used = e.target.checked
            })
        )
    }

    function onChangeOverSymbol(data: number[], e: JSX.ChangeEvent) {
        const [index, over_index] = data

        setSymbolMap(
            produce(pre => {
                pre[index].maps[over_index].overSymbol = e.target.value
            })
        )
    }

    function addOverSymbol(index: number) {
        setSymbolMap(
            produce(pre => {
                pre[index].maps.push({ overSymbol: "", used: true })
            })
        )
    }

    function deleteOverSymbol(data: number[], e: MouseEvent) {
        const [index, over_index] = data

        setSymbolMap(
            produce(pre => {
                pre[index].maps.splice(over_index)
            })
        )
    }

    function onSymbolMapsCheckChange(index: number, e: JSX.ChangeEvent) {
        setSymbolMap(
            produce(pre => {
                pre[index].used = e.target.checked
            })
        )
    }

    function onChangeSymbolMaps(index: number, e: JSX.ChangeEvent) {
        setSymbolMap(
            produce(pre => {
                pre[index].symbol = e.target.value
            })
        )
    }

    function addSymbolMaps() {
        setSymbolMap(
            produce(pre => {
                pre.push({ symbol: "", used: true, maps: [] })
            })
        )
    }

    function deleteSymbolMaps(index: number, e: MouseEvent) {
        setSymbolMap(
            produce(pre => {
                pre.splice(index)
            })
        )
    }

    return (
        <div class={style.Popup}>
            <h1> OverrideSymbol </h1>
            <For each={symbolMap}>
                {(symbol_map, index) => {
                    return (
                        <details>
                            <summary>
                                <input type="checkbox" checked={symbol_map.used} onChange={[onSymbolMapsCheckChange, index()]} />
                                <input type="text" value={symbol_map.symbol} onChange={[onChangeSymbolMaps, index()]} />
                                <IconButton classList={{ [style.buttion]: true }} icon={DeleteIcon} onClick={[deleteSymbolMaps, index()]} />
                            </summary>
                            <ol>
                                <For each={symbol_map.maps}>
                                    {(map, _index) => (
                                        <li>
                                            <input type="checkbox" checked={map.used} onChange={[onOverSymbolCheckChange, [index(), _index()]]} />
                                            <input type="text" value={map.overSymbol} onChange={[onChangeOverSymbol, [index(), _index()]]} />
                                            <IconButton
                                                classList={{ [style.buttion]: true }}
                                                icon={DeleteIcon}
                                                onClick={[deleteOverSymbol, [index(), _index()]]}
                                            />
                                        </li>
                                    )}
                                </For>
                                <div>
                                    <IconButton icon={AddIcon} onClick={[addOverSymbol, index()]} />
                                </div>
                            </ol>
                        </details>
                    )
                }}
            </For>
            <div>
                <IconButton classList={{ [style.buttion]: true }} icon={AddIcon} onClick={addSymbolMaps} />
            </div>
        </div>
    )
}

function HideLayer() {
    function onCheckedChange(index: number, e: JSX.ChangeEvent) {
        setHideLayers(
            produce(pre => {
                pre[index].used = e.target.checked
            })
        )
    }

    function onChange(index: number, e: JSX.ChangeEvent) {
        setHideLayers(
            produce(pre => {
                pre[index].layer = e.target.value
            })
        )
    }

    function onAdd() {
        setHideLayers(
            produce(pre => {
                pre.push({layer: "", used: true})
            })
        )
    }

    function onDelete(index: number){
        setHideLayers(
            produce(pre => {
                pre.splice(index)
            })
        )
    }

    return (
        <div class={style.Popup}>
            <h1> Hide Layer </h1>
            <div>
                <For each={hideLayers}>
                    {(data, index) => (
                        <li>
                            <input type="checkbox" checked={data.used} onChange={[onCheckedChange, index()]} />
                            <input type="text" value={data.layer} onChange={[onChange, index()]} />
                            <IconButton classList={{ [style.buttion]: true }} icon={DeleteIcon} onClick={[onDelete, index()]} />
                        </li>
                    )}
                </For>
                <IconButton classList={{ [style.buttion]: true }} icon={AddIcon} onClick={onAdd}/>
            </div>
        </div>
    )
}
