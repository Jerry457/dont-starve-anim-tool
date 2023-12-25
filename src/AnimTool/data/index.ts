import { createStore } from "solid-js/store"

import { Build, Bank, BuildSymbol, Animation } from "../../lib/kfiles"

export type UiData<T, C, P> = { data: T; use: boolean; sub: UiData<C, any, T>[]; parent?: UiData<P, T, any> }

export function toUiData<T extends { getSubRows?: () => any[] }, C, P>(data: T, parent?: UiData<P, T, any>): UiData<T, C, P> {
    const uiData: UiData<T, C, P> = { data, parent, use: true, sub: [] }
    uiData.sub = data.getSubRows?.().map(data => toUiData(data, uiData)) || []
    return uiData
}

export const [banks, setBanks] = createStore<UiData<Bank, Animation, undefined>[]>([])
export const [builds, setBuilds] = createStore<UiData<Build, BuildSymbol, undefined>[]>([])
