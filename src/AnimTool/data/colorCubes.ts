import { Ktex } from "../../lib/kfiles/ktex"
import { refreshAnimation } from "../AnimationViewer"

const language = navigator.language
function en_zh(en: string, zh: string) {
    return language === "zh-CN" || language === "zh-TW" ? zh : en
}

export const colorCubeNames = [
    { name: en_zh("Autumn-day", "秋季-白天"), value: "day05_cc" },
    { name: en_zh("Autumn-dusk", "秋季-黄昏"), value: "dusk03_cc" },
    { name: en_zh("Autumn-night", "秋季-夜晚"), value: "night03_cc" },

    { name: en_zh("Winter-day", "冬季-白天"), value: "snow_cc" },
    { name: en_zh("Winter-dusk", "冬季-黄昏"), value: "snowdusk_cc" },
    { name: en_zh("Winter-night", "冬季-夜晚"), value: "night04_cc" },

    { name: en_zh("Spring-day", "春季-白天"), value: "spring_day_cc" },
    { name: en_zh("Spring-dusk/night", "春季-黄昏/夜晚"), value: "spring_dusk_cc" },

    { name: en_zh("Summer-day", "夏季-白天"), value: "summer_day_cc" },
    { name: en_zh("Summer-dusk", "夏季-黄昏"), value: "summer_dusk_cc" },
    { name: en_zh("Summer-night", "夏季-夜晚"), value: "summer_night_cc" },

    { name: en_zh("Full Moon", "满月"), value: "purple_moon_cc" },
    { name: en_zh("Moon Island", "月岛"), value: "lunacy_regular_cc" },
    { name: en_zh("Moon Storm", "月亮风暴"), value: "moonstorm_cc" },

    { name: en_zh("Caves", "洞穴"), value: "caves_default" },
    { name: en_zh("Ruins-calm", "远古-平静"), value: "ruins_dark_cc" },
    { name: en_zh("Ruins-warn/dawn", "远古-警告/黎明"), value: "ruins_dim_cc" },
    { name: en_zh("Ruins-wild", "远古-暴动"), value: "ruins_light_cc" },

    { name: en_zh("Ghost", "幽灵"), value: "ghost_cc" },
    { name: en_zh("Insane-day", "低理智-白天"), value: "insane_day_cc" },
    { name: en_zh("Insane-dusk", "低理智-黄昏"), value: "insane_dusk_cc" },
    { name: en_zh("Insane-night", "低理智-夜晚"), value: "insane_night_cc" },

    { name: en_zh("Mild-day", "温和季-白天"), value: "sw_mild_day_cc" },
    { name: en_zh("Mild-dusk", "温和季-黄昏"), value: "sw_mild_dusk_cc" },
    { name: en_zh("Mild-night", "黄昏-夜晚"), value: "sw_mild_night_cc" },

    { name: en_zh("Hurricane-day", "飓风季-白天"), value: "sw_wet_day_cc" },
    { name: en_zh("Hurricane-dusk", "飓风季-黄昏"), value: "sw_wet_dusk_cc" },
    { name: en_zh("Hurricane-night", "飓风季-夜晚"), value: "sw_wet_night_cc" },

    { name: en_zh("Monsoon-day", "雨季-白天"), value: "sw_green_day_cc" },
    { name: en_zh("Monsoon-dusk", "雨季-黄昏/夜晚"), value: "sw_green_dusk_cc" },

    { name: en_zh("Dry-day", "旱季-白天"), value: "sw_dry_day_cc" },
    { name: en_zh("Dry-dusk", "旱季-黄昏"), value: "sw_dry_dusk_cc" },
    { name: en_zh("Dry-night", "旱季-夜晚"), value: "sw_dry_night_cc" },

    { name: en_zh("Volcano Normal", "火山内部-平静"), value: "sw_volcano_cc" },
    { name: en_zh("Volcano Active", "火山内部-喷发"), value: "sw_volcano_active_cc" },

    { name: en_zh("Temperate-day", "平和季-白天"), value: "pork_temperate_day_cc" },
    { name: en_zh("Temperate-dusk", "平和季-黄昏"), value: "pork_temperate_dusk_cc" },
    { name: en_zh("Temperate-night", "平和季-夜晚"), value: "pork_temperate_night_cc" },
    { name: en_zh("Temperate-wild", "平和季-满月"), value: "pork_temperate_fullmoon_cc" },

    { name: en_zh("Humid-day", "雾季-白天"), value: "pork_cold_day_cc" },
    { name: en_zh("Humid-dusk", "雾季-黄昏/夜晚"), value: "pork_cold_dusk_cc" },
    { name: en_zh("Humid-wild", "雾季-满月"), value: "pork_cold_fullmoon_cc" },

    { name: en_zh("Hayfever-day", "花粉季-白天"), value: "pork_lush_day_test" },
    { name: en_zh("Hayfever-dusk", "花粉季-黄昏/夜晚"), value: "pork_lush_dusk_test" },
    { name: en_zh("Hayfever-wild", "花粉季-满月"), value: "pork_warm_fullmoon_cc" },

    { name: en_zh("Aporkalypse", "大灾变"), value: "pork_cold_bloodmoon_cc" },

    { name: en_zh("Interior", "室内"), value: "pigshop_interior_cc" },

    // {name: en_zh("Quagmire", "暴食"),  value:"quagmire_cc"},
    { name: en_zh("Lavaarena", "熔炉"), value: "lavaarena2_cc" },

    { name: en_zh("Bat Vision", "蝙蝠声呐"), value: "bat_vision_on_cc" },

    { name: en_zh("Mole Vision Normal", "鼹鼠帽-正常"), value: "mole_vision_on_cc" },
    { name: en_zh("Mole Vision Light", "鼹鼠帽-亮"), value: "mole_vision_off_cc" },

    { name: en_zh("Shooting Vision", "激光眼镜"), value: "shooting_goggles_cc" },
    { name: en_zh("Heat Vision", "热成像眼镜"), value: "heat_vision_cc" },

    { name: en_zh("Beaver Vision Light", "海狸视觉"), value: "beaver_vision_cc" },
]

export const colorCubes: { [name: string]: Ktex } = {}
const promises = []
for (const { value } of colorCubeNames) {
    promises.push(
        import(`../../assets/color_cubes/${value}.tex`).then(module =>
            fetch(module.default).then(response => {
                response.arrayBuffer().then(arrayBuffer => {
                    colorCubes[value] = new Ktex(value)
                    colorCubes[value]!.readKtex(arrayBuffer)
                })
            })
        )
    )
}
Promise.all(promises).then(refreshAnimation)
