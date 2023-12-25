import { createSignal } from "solid-js"
import { createStore, produce } from "solid-js/store"

import Input from "../components/Input"
import TableList from "../components/TableList"
import { AddButton, DeleteButton } from "./titleButtons"

import { refreshAnimation, refreshBox } from "./AnimationViewer"
import { UiData, banks, setBanks, toUiData } from "./data"
import { AnimElement, AnimFrame, Animation, Bank } from "../lib/kfiles"

import style from "./titleButtons.module.css"

export const [playAnimation, setPlayAnimation] = createSignal<UiData<Animation, AnimFrame, Bank>>()

const [animations, setAnimations] = createStore<UiData<Animation, AnimFrame, Bank>[]>([])
const [animFrmaes, setAnimFrames] = createStore<UiData<AnimFrame, AnimElement, Animation>[]>([])
const [animElements, setAnimElements] = createStore<UiData<AnimElement, undefined, AnimFrame>[]>([])

let chosenBank = -1
let chosenAnimation = -1
let chosenAnimFrame = -1
let chosenAnimElement = -1

function BanksList() {
    function bankToRowCells(uiData: UiData<Bank, Animation, undefined>, index: number) {
        const { data: bank } = uiData
        return (
            <div>
                <div>
                    <Input value={bank.name} onChange={value => (bank.name = value as string)} />
                </div>
            </div>
        )
    }

    function onChosenBank(uiData: UiData<Bank, Animation, undefined>, index: number) {
        chosenBank = index
        if (!uiData.sub.length) {
            setAnimFrames([])
            setAnimElements([])
        }
        setAnimations(uiData.sub)
    }

    function onAddBank() {
        const bank = new Bank()
        setBanks(pre => [...pre, toUiData(bank)])
    }

    function onDeleteBank() {
        if (chosenBank < 0) return

        setBanks(produce(pre => pre.splice(chosenBank, 1)))
        if (banks.length) {
            setAnimations(banks[banks.length - 1].sub)
        } else {
            chosenBank = -1
            setAnimations([])
            setAnimFrames([])
            setAnimElements([])

            setPlayAnimation()
        }
    }

    return (
        <TableList<UiData<Bank, Animation, undefined>>
            titles={
                <div class="center" classList={{ [style.mainTitle]: true }}>
                    <text class={style.titleButton}>Bank</text>
                    <AddButton onClick={onAddBank} />
                    <DeleteButton onClick={onDeleteBank} />
                </div>
            }
            list={banks}
            initChonsen={banks.length - 1}
            toRowCells={bankToRowCells}
            onChosen={onChosenBank}></TableList>
    )
}

function AnimationsList() {
    const grid = { display: "grid", "grid-template-columns": "3fr 1fr" }

    function animationToRowCells(uiData: UiData<Animation, AnimFrame, undefined>, index: number) {
        const { data: animation } = uiData
        return (
            <div style={grid}>
                <div>
                    <Input value={animation.name} onChange={value => (animation.name = value as string)} />
                </div>
                <div>
                    <Input
                        value={animation.frameRate}
                        onChange={value => {
                            animation.frameRate = value as number
                            refreshAnimation()
                        }}
                    />
                </div>
            </div>
        )
    }

    function onChosenAnimation(uiData: UiData<Animation, AnimFrame, Bank>, index: number) {
        chosenAnimation = index
        setPlayAnimation(uiData)
        if (!uiData.sub.length) {
            setAnimElements([])
        }
        setAnimFrames(uiData.sub)
    }

    function onAddAnimation() {
        const animation = new Animation()
        const bank = banks[chosenBank].data
        bank.animations.push(animation)
        setBanks(produce(pre => pre[chosenBank].sub.push(toUiData(animation))))
        setAnimations(banks[chosenBank].sub)
    }

    function onDeleteAnimation() {
        if (chosenAnimation < 0) return

        const bank = banks[chosenBank].data
        bank.animations.splice(chosenAnimation, 1)
        setBanks(produce(pre => pre[chosenBank].sub.splice(chosenAnimation, 1)))
        setAnimations(banks[chosenBank].sub)

        if (!banks[chosenBank].sub.length) setPlayAnimation()
    }

    return (
        <TableList<UiData<Animation, AnimFrame, undefined>>
            titles={
                <div>
                    <div class="center" classList={{ [style.mainTitle]: true }}>
                        <text class={style.titleButton}>Animation</text>
                        <AddButton onClick={onAddAnimation} />
                        <DeleteButton onClick={onDeleteAnimation} />
                    </div>
                    <div style={grid} class={style.subTitle}>
                        <div>name</div>
                        <div>rate</div>
                    </div>
                </div>
            }
            list={animations}
            toRowCells={animationToRowCells}
            onChosen={onChosenAnimation}></TableList>
    )
}

function AnimFramesList() {
    const grid = { display: "grid", "grid-template-columns": "2rem 1fr 1fr 1fr 1fr 1fr" }

    function animFrameToRowCells(uiData: UiData<AnimFrame, AnimElement, Animation>, index: number) {
        const { data: animFrame, parent: animation, use } = uiData

        function onFrameIdxChange(value: number) {
            animFrame.idx = value
            animation?.data.sort()
            setBanks(produce(pre => pre[chosenBank].sub[chosenAnimation].sub.sort((a, b) => a.data.idx - b.data.idx)))
            setAnimFrames(banks[chosenBank].sub[chosenAnimation].sub)
        }

        return (
            <div style={grid}>
                <div class="center">
                    <Input type="checkbox" checked={use} onChange={value => setAnimFrames(produce(pre => (pre[index].use = value as boolean)))} />
                </div>
                <div>
                    <Input value={animFrame.idx} onChange={value => onFrameIdxChange(value as number)} />
                </div>
                <div>
                    <Input
                        value={animFrame.x}
                        onChange={value => {
                            animFrame.x = value as number
                            refreshBox()
                        }}
                    />
                </div>
                <div>
                    <Input
                        value={animFrame.y}
                        onChange={value => {
                            animFrame.y = value as number
                            refreshBox()
                        }}
                    />
                </div>
                <div>
                    <Input
                        value={animFrame.w}
                        onChange={value => {
                            animFrame.w = value as number
                            refreshBox()
                        }}
                    />
                </div>
                <div>
                    <Input
                        value={animFrame.h}
                        onChange={value => {
                            animFrame.h = value as number
                            refreshBox()
                        }}
                    />
                </div>
            </div>
        )
    }

    function onChosen(data: UiData<AnimFrame, AnimElement, Animation>, index: number) {
        chosenAnimFrame = index
        setAnimElements(data.sub)
    }

    function onAddAnimFrame() {
        const frame = new AnimFrame()
        const animation = banks[chosenBank].data.animations[chosenAnimation]
        animation.frames.push(frame)
        setBanks(produce(pre => pre[chosenBank].sub[chosenAnimation].sub.push(toUiData(frame))))
        setAnimFrames(banks[chosenBank].sub[chosenAnimation].sub)
    }

    function onDeleteAnimFrame() {
        if (chosenAnimation < 0) return

        const animation = banks[chosenBank].data.animations[chosenAnimation]
        animation.frames.splice(chosenAnimFrame, 1)
        setBanks(produce(pre => pre[chosenBank].sub[chosenAnimation].sub.splice(chosenAnimFrame, 1)))
        setAnimFrames(banks[chosenBank].sub[chosenAnimation].sub)
        if (!banks[chosenBank].sub[chosenAnimation].sub.length) {
            setAnimElements([])
        }
    }

    return (
        <TableList<UiData<AnimFrame, AnimElement, Animation>>
            titles={
                <div>
                    <div class="center" classList={{ [style.mainTitle]: true }}>
                        <text class={style.titleButton}>Frame</text>
                        <AddButton onClick={onAddAnimFrame} />
                        <DeleteButton onClick={onDeleteAnimFrame} />
                    </div>
                    <div style={grid} class={style.subTitle}>
                        <div class="center">
                            <Input type="checkbox" style={{ visibility: "hidden" }} />
                        </div>
                        <div>idx</div>
                        <div>x</div>
                        <div>y</div>
                        <div>w</div>
                        <div>h</div>
                    </div>
                </div>
            }
            list={animFrmaes}
            toRowCells={animFrameToRowCells}
            onChosen={onChosen}></TableList>
    )
}

function AnimElementsList() {
    const grid = { display: "grid", "grid-template-columns": "2rem 3fr 10fr 4fr 10fr 4fr 4fr 4fr 4fr 4fr 4fr" }

    function animElementToRowCells(uiData: UiData<AnimElement, undefined, AnimFrame>, index: number) {
        const { data: animElement, parent: animFrame, use } = uiData

        function onZIndexChange(value: number) {
            animElement.zIndex = value

            animFrame?.data.sort()
            setBanks(produce(pre => pre[chosenBank].sub[chosenAnimation].sub[chosenAnimFrame].sub.sort((a, b) => a.data.zIndex - b.data.zIndex)))
            setAnimElements(banks[chosenBank].sub[chosenAnimation].sub[chosenAnimFrame].sub)
        }

        return (
            <div style={grid}>
                <div class="center">
                    <Input type="checkbox" checked={use} onChange={value => setAnimElements(produce(pre => (pre[index].use = value as boolean)))} />
                </div>
                <div>
                    <Input value={animElement.zIndex} onChange={value => onZIndexChange(value as number)} />
                </div>
                <div>
                    <Input
                        value={animElement.symbol}
                        onChange={value => {
                            animElement.symbol = value as string
                            refreshAnimation()
                        }}
                    />
                </div>
                <div>
                    <Input
                        value={animElement.frameNum}
                        onChange={value => {
                            animElement.frameNum = value as number
                            refreshAnimation()
                        }}
                    />
                </div>
                <div>
                    <Input
                        value={animElement.layerName}
                        onChange={value => {
                            animElement.layerName = value as string
                            refreshAnimation()
                        }}
                    />
                </div>
                <div>
                    <Input
                        value={animElement.a}
                        onChange={value => {
                            animElement.a = value as number
                            refreshAnimation()
                        }}
                    />
                </div>
                <div>
                    <Input
                        value={animElement.b}
                        onChange={value => {
                            animElement.b = value as number
                            refreshAnimation()
                        }}
                    />
                </div>
                <div>
                    <Input
                        value={animElement.c}
                        onChange={value => {
                            animElement.c = value as number
                            refreshAnimation()
                        }}
                    />
                </div>
                <div>
                    <Input
                        value={animElement.d}
                        onChange={value => {
                            animElement.d = value as number
                            refreshAnimation()
                        }}
                    />
                </div>
                <div>
                    <Input
                        value={animElement.tx}
                        onChange={value => {
                            animElement.tx = value as number
                            refreshAnimation()
                        }}
                    />
                </div>
                <div>
                    <Input
                        value={animElement.ty}
                        onChange={value => {
                            animElement.ty = value as number
                            refreshAnimation()
                        }}
                    />
                </div>
            </div>
        )
    }

    function onChosenAnimElement(data: UiData<AnimElement, undefined, AnimFrame>, index: number) {
        chosenAnimElement = index
    }

    function onAddAnimElement() {
        const animElement = new AnimElement()
        const frame = banks[chosenBank].data.animations[chosenAnimation].frames[chosenAnimFrame]
        frame.elements.push(animElement)
        setBanks(produce(pre => pre[chosenBank].sub[chosenAnimation].sub[chosenAnimFrame].sub.push(toUiData(animElement))))
        setAnimElements(banks[chosenBank].sub[chosenAnimation].sub[chosenAnimFrame].sub)
    }

    function onDeleteAnimElement() {
        if (chosenAnimation < 0) return

        const frame = banks[chosenBank].data.animations[chosenAnimation].frames[chosenAnimFrame]
        frame.elements.splice(chosenAnimFrame, 1)
        setBanks(produce(pre => pre[chosenBank].sub[chosenAnimation].sub[chosenAnimFrame].sub.splice(chosenAnimElement, 1)))
        setAnimElements(banks[chosenBank].sub[chosenAnimation].sub[chosenAnimFrame].sub)
    }

    return (
        <TableList<UiData<AnimElement, undefined, AnimFrame>>
            titles={
                <div>
                    <div class="center" classList={{ [style.mainTitle]: true }}>
                        <text class={style.titleButton}>Element</text>
                        <AddButton onClick={onAddAnimElement} />
                        <DeleteButton onClick={onDeleteAnimElement} />
                    </div>
                    <div style={grid} class={style.subTitle}>
                        <div class="center">
                            <Input type="checkbox" style={{ visibility: "hidden" }} />
                        </div>
                        <div>z</div>
                        <div>symbol</div>
                        <div>frame</div>
                        <div>layer</div>
                        <div>a</div>
                        <div>b</div>
                        <div>c</div>
                        <div>d</div>
                        <div>tx</div>
                        <div>ty</div>
                    </div>
                </div>
            }
            onChosen={onChosenAnimElement}
            list={animElements}
            toRowCells={animElementToRowCells}></TableList>
    )
}

export default function AnimViewer() {
    return (
        <div style={{ height: "100%", overflow: "hidden", display: "grid", "grid-template-columns": "2fr 3fr 5fr 11fr" }}>
            <BanksList />
            <AnimationsList />
            <AnimFramesList />
            <AnimElementsList />
        </div>
    )
}
