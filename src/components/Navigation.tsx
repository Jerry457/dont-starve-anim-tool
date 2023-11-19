import { For } from "solid-js"

import TextButton from "./TextButton"
import IconButton from "../components/IconButton"

import GitHub from "~icons/mdi/github"

import style from "./Navigation.module.css"

const navItems = {
    AnimTool: import.meta.resolve("/dont-starve-anim-tool/index.html"),
    TexTool: import.meta.resolve("/dont-starve-anim-tool/tex-tool.html"),
}

export default function Navigation(prop: { current: keyof typeof navItems }) {
    function onClickGitHub() {
        window.open("https://github.com/Jerry457/dont-starve-anim-tool")
    }

    return (
        <nav class={style.Navigation}>
            <IconButton icon={GitHub} classList={{ [style.githubButton]: true }} onClick={onClickGitHub} />
            <For each={Object.entries(navItems)}>
                {navItem => (
                    <TextButton
                        text={navItem[0]}
                        classList={{ [style.navItem]: true, [style.currentNavItem]: navItem[0] === prop.current }}
                        onClick={navItem[0] !== prop.current ? () => window.open(navItem[1]) : undefined}
                    />
                )}
            </For>
        </nav>
    )
}
