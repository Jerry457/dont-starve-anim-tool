import { Ktex } from "../lib/kfiles/ktex"
import { updateData } from "./index"

const language = navigator.language
function en_zh(en: string, zh: string) {
    return language === "zh-CN" || language === "zh-TW" ? zh : en
}

export const colourCubeNames = [
    [en_zh("Autumn-day", "秋季-白天"), "day05_cc"],
    [en_zh("Autumn-dusk", "秋季-黄昏"), "dusk03_cc"],
    [en_zh("Autumn-night", "秋季-夜晚"), "night03_cc"],

    [en_zh("Winter-day", "冬季-白天"), "snow_cc"],
    [en_zh("Winter-dusk", "冬季-黄昏"), "snowdusk_cc"],
    [en_zh("Winter-night", "冬季-夜晚"), "night04_cc"],

    [en_zh("Spring-day", "春季-白天"), "spring_day_cc"],
    [en_zh("Spring-dusk/night", "春季-黄昏/夜晚"), "spring_dusk_cc"],

    [en_zh("Summer-day", "夏季-白天"), "summer_day_cc"],
    [en_zh("Summer-dusk", "夏季-黄昏"), "summer_dusk_cc"],
    [en_zh("Summer-night", "夏季-夜晚"), "summer_night_cc"],

    [en_zh("Full Moon", "满月"), "purple_moon_cc"],
    [en_zh("Moon Island", "月岛"), "lunacy_regular_cc"],
    [en_zh("Moon Storm", "月亮风暴"), "moonstorm_cc"],

    [en_zh("Caves", "洞穴"), "caves_default"],
    [en_zh("Ruins-calm", "远古-平静"), "ruins_dark_cc"],
    [en_zh("Ruins-warn/dawn", "远古-警告/黎明"), "ruins_dim_cc"],
    [en_zh("Ruins-wild", "远古-暴动"), "ruins_light_cc"],

    [en_zh("Ghost", "幽灵"), "ghost_cc"],
    [en_zh("Insane-day", "低理智-白天"), "insane_day_cc"],
    [en_zh("Insane-dusk", "低理智-黄昏"), "insane_dusk_cc"],
    [en_zh("Insane-night", "低理智-夜晚"), "insane_night_cc"],

    [en_zh("Mild-day", "温和季-白天"), "sw_mild_day_cc"],
    [en_zh("Mild-dusk", "温和季-黄昏"), "sw_mild_dusk_cc"],
    [en_zh("Mild-night", "黄昏-夜晚"), "sw_mild_night_cc"],

    [en_zh("Hurricane-day", "飓风季-白天"), "sw_wet_day_cc"],
    [en_zh("Hurricane-dusk", "飓风季-黄昏"), "sw_wet_dusk_cc"],
    [en_zh("Hurricane-night", "飓风季-夜晚"), "sw_wet_night_cc"],

    [en_zh("Monsoon-day", "雨季-白天"), "sw_green_day_cc"],
    [en_zh("Monsoon-dusk", "雨季-黄昏/夜晚"), "sw_green_dusk_cc"],

    [en_zh("Dry-day", "旱季-白天"), "sw_dry_day_cc"],
    [en_zh("Dry-dusk", "旱季-黄昏"), "sw_dry_dusk_cc"],
    [en_zh("Dry-night", "旱季-夜晚"), "sw_dry_night_cc"],

    [en_zh("Volcano Normal", "火山内部-平静"), "sw_volcano_cc"],
    [en_zh("Volcano Active", "火山内部-喷发"), "sw_volcano_active_cc"],

    [en_zh("Temperate-day", "平和季-白天"), "pork_temperate_day_cc"],
    [en_zh("Temperate-dusk", "平和季-黄昏"), "pork_temperate_dusk_cc"],
    [en_zh("Temperate-night", "平和季-夜晚"), "pork_temperate_night_cc"],
    [en_zh("Temperate-wild", "平和季-满月"), "pork_temperate_fullmoon_cc"],

    [en_zh("Humid-day", "雾季-白天"), "pork_cold_day_cc"],
    [en_zh("Humid-dusk", "雾季-黄昏/夜晚"), "pork_cold_dusk_cc"],
    [en_zh("Humid-wild", "雾季-满月"), "pork_cold_fullmoon_cc"],

    [en_zh("Hayfever-day", "花粉季-白天"), "pork_lush_day_test"],
    [en_zh("Hayfever-dusk", "花粉季-黄昏/夜晚"), "pork_lush_dusk_test"],
    [en_zh("Hayfever-wild", "花粉季-满月"), "pork_warm_fullmoon_cc"],

    [en_zh("Aporkalypse", "大灾变"), "pork_cold_bloodmoon_cc"],

    [en_zh("Interior", "室内"), "pigshop_interior_cc"],

    // [en_zh("Quagmire", "暴食"), "quagmire_cc"],
    [en_zh("Lavaarena", "熔炉"), "lavaarena2_cc"],

    [en_zh("Bat Vision", "蝙蝠声呐"), "bat_vision_on_cc"],

    [en_zh("Mole Vision Normal", "鼹鼠帽-正常"), "mole_vision_on_cc"],
    [en_zh("Mole Vision Light", "鼹鼠帽-亮"), "mole_vision_off_cc"],

    [en_zh("Shooting Vision", "激光眼镜"), "shooting_goggles_cc"],
    [en_zh("Heat Vision", "热成像眼镜"), "heat_vision_cc"],

    [en_zh("Beaver Vision Light", "海狸视觉"), "beaver_vision_cc"],
]

export const colourCubes: { [name: string]: Ktex | undefined } = {}
const promises = []
for (const [_, fileName] of colourCubeNames) {
    promises.push(
        import(`../assets/colour_cubes/${fileName}.tex`).then(module =>
            fetch(module.default).then(response => {
                response.arrayBuffer().then(arrayBuffer => {
                    colourCubes[fileName] = new Ktex(fileName)
                    colourCubes[fileName]!.read_tex(arrayBuffer)
                })
            })
        )
    )
}
Promise.all(promises).then(updateData)
