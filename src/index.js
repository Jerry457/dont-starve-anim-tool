import { Anim, UnpackAnim } from "./files/anim.js"
import { Build, UnpackBuild } from "./files/build.js"
import { Ktex } from "./files/ktex.js"
import JSZip from "jszip"
import { Buffer } from "buffer"
import struct from "python-struct"

const file_input = document.querySelector("input[type='file']")

// anim
const bank_list = document.getElementById("Bank")

const anim_name_list = document.getElementById("AnimationName")
const anim_frame_rate_list = document.getElementById("AnimFrameRate")
bank_list.child_lists = [anim_name_list, anim_frame_rate_list]

const anim_frame_idx = document.getElementById("AnimFrameIDX")
const anim_frame_x = document.getElementById("AnimFrameX")
const anim_frame_y = document.getElementById("AnimFrameY")
const anim_frame_w = document.getElementById("AnimFrameW")
const anim_frame_h = document.getElementById("AnimFrameH")
anim_name_list.child_lists = [anim_frame_idx, anim_frame_x, anim_frame_y, anim_frame_w, anim_frame_h]

const element_zindex = document.getElementById("ElemenZidx")
const element_symbol = document.getElementById("ElemenSymbol")
const layer_name = document.getElementById("LayerName")
const element_frame = document.getElementById("ElemenFrame")
const element_ma = document.getElementById("ElemenMa")
const element_mb = document.getElementById("ElemenMb")
const element_mc = document.getElementById("ElemenMc")
const element_md = document.getElementById("ElemenMd")
const element_mtx = document.getElementById("ElemenMtx")
const element_mty = document.getElementById("ElemenMty")
anim_frame_idx.child_lists = [element_zindex, element_symbol, layer_name, element_frame, element_ma, element_mb, element_mc, element_md, element_mtx, element_mty]

// build
const builds = []

const build_list = document.getElementById("Build")
const atlas_list = document.getElementById("Atlas")

const symbol_list = document.getElementById("Symbol")
build_list.child_lists = [symbol_list, atlas_list]

const build_frame_num = document.getElementById("BuildFrameNum")
const build_frame_druation = document.getElementById("BuildFrameDruation")
const build_frame_x = document.getElementById("BuildFrameX")
const build_frame_y = document.getElementById("BuildFrameY")
const build_frame_w = document.getElementById("BuildFrameW")
const build_frame_h = document.getElementById("BuildFrameH")
symbol_list.child_lists = [build_frame_num, build_frame_druation, build_frame_x, build_frame_y, build_frame_w, build_frame_h]

const PlayerArea = document.getElementById("PlayerArea")
const AnimationPlayer = document.getElementById("AnimationPlayer")

const build_scale_input = document.getElementById("BuildScale")
build_scale_input.addEventListener("change", event => {
    if (build_list.data) {
        build_list.data.scale = build_scale_input.value
    }
})

function FindSymbol(symbol_name) {
    for (const build of builds) {
        if (build.used) {
            const symbol = build.get_symbol(symbol_name)
            if (symbol && symbol.used) {
                return symbol
            }
        }
    }
}

function PlayAnimationFrame(animation, frame_index) {
    for (const child of PlayerArea.querySelectorAll("img[class='Layer']")) {
        PlayerArea.removeChild(child)
    }

    const frame = animation.frames[frame_index]
    if (!frame || !frame.used) {
        return
    }

    const layer_num = frame.elements.length
    for (const element of frame.elements) {
        if (element.used) {
            const symbol = FindSymbol(element.symbol)
            if (symbol && symbol.used) {
                const build_frame = symbol.get_frame(element.frame)
                if (build_frame && build_frame.used && build_frame.canvas) {
                    const layer = document.createElement("img")
                    layer.src = build_frame.canvas
                    layer.alt = `${symbol.name}-${build_frame.framenum}`
                    layer.className = "Layer"

                    layer.style.zIndex = layer_num - element.z_index
                    layer.style.transformOrigin = `${build_frame.w / 2 - build_frame.x}px ${build_frame.h / 2 - build_frame.y}px`
                    layer.style.transform = `matrix(${element.m_a}, ${element.m_b}, ${element.m_c}, ${element.m_d}, ${element.m_tx + build_frame.x}, ${element.m_ty + build_frame.y})`

                    PlayerArea.appendChild(layer)
                }
            }
        }
    }
}

function PlayAnimation(animation) {
    AnimationPlayer.play_frame_index = 0
    const frame_num = animation.frames.length
    return function () {
        if (!AnimationPlayer.pause) {
            PlayAnimationFrame(animation, AnimationPlayer.play_frame_index)
            AnimationPlayer.play_frame_index = (AnimationPlayer.play_frame_index + 1) % frame_num
        }
    }
}

function MakeTextInput(data, key) {
    const input_element = document.createElement("input")
    input_element.className = "inputtext"
    input_element.type = "text"

    input_element.value = data[key]
    input_element.value_type = typeof data[key]
    input_element.addEventListener("change", event => {
        if (input_element.value_type == "number") {
            const number = Number(input_element.value)
            if (isNaN(number)) {
                input_element.value = data[key]
                alert("invalid number")
            } else {
                data[key] = number
                input_element.value = number
            }
        } else {
            data[key] = input_element.value
        }
    })

    return input_element
}

function MakeMenu(parent, data, key, onclick, checkboxfn) {
    parent.data = data

    const menu_div = document.createElement("div")
    menu_div.className = "menu"
    menu_div.addEventListener("click", function (event) {
        event.stopPropagation()

        if (!onclick) {
            return
        }
        if (this.chosen) {
            return
        }

        this.chosen = true
        this.style.backgroundColor = "#0078d7"
        this.getElementsByClassName("inputtext")[0].style.color = "#FFFFFF"
        parent.data = data
        onclick(this)

        for (const other of parent.querySelectorAll("div[class='menu']")) {
            if (other !== this) {
                other.chosen = false
                other.style.backgroundColor = null
                other.getElementsByClassName("inputtext")[0].style.color = null
            }
        }
    })

    const text_input = MakeTextInput(data, key)
    menu_div.appendChild(text_input)

    if (checkboxfn) {
        const checkbox = document.createElement("input")
        checkbox.className = "checkbox"
        checkbox.type = "checkbox"

        checkbox.checked = data.used
        checkbox.addEventListener("click", event => {
            data.used = checkbox.checked
        })
        menu_div.appendChild(checkbox)
    }

    parent.appendChild(menu_div)
}

function RemoveMenu(list) {
    for (const element of list) {
        for (const child of element.querySelectorAll("div[class='menu']")) {
            element.removeChild(child)
        }
        if (element.child_lists) {
            RemoveMenu(element.child_lists)
        }
    }
}

function ListAnimElement(frame) {
    for (const element of frame.elements) {
        MakeMenu(element_zindex, element, "z_index", null, () => {})
        MakeMenu(element_symbol, element, "symbol")
        MakeMenu(layer_name, element, "layername")
        MakeMenu(element_frame, element, "frame")
        MakeMenu(element_ma, element, "m_a")
        MakeMenu(element_mb, element, "m_b")
        MakeMenu(element_mc, element, "m_c")
        MakeMenu(element_md, element, "m_d")
        MakeMenu(element_mtx, element, "m_tx")
        MakeMenu(element_mty, element, "m_ty")
    }
}

function ListAnimFrame(animation) {
    for (const idx in animation.frames) {
        const frame = animation.frames[idx]
        MakeMenu(
            anim_frame_idx,
            frame,
            "idx",
            () => {
                RemoveMenu(anim_frame_idx.child_lists)
                ListAnimElement(frame)

                // AnimationPlayer.pause = true
                // AnimationPlayer.play_frame_index = frame.idx
                // PlayAnimationFrame(animation, frame.idx)
            },
            () => {}
        )
        MakeMenu(anim_frame_x, frame, "x")
        MakeMenu(anim_frame_y, frame, "y")
        MakeMenu(anim_frame_w, frame, "w")
        MakeMenu(anim_frame_h, frame, "h")
    }
}

function ListAnimation(bank) {
    for (const animation_name in bank.animations) {
        const animation = bank.animations[animation_name]
        MakeMenu(anim_name_list, animation, "name", () => {
            RemoveMenu(anim_name_list.child_lists)
            ListAnimFrame(animation)
            clearInterval(AnimationPlayer.current_id)
            AnimationPlayer.current_id = setInterval(PlayAnimation(animation), 1000 / animation.framerate)
        })
        MakeMenu(anim_frame_rate_list, animation, "framerate")
    }
}

function ListBank(bank) {
    MakeMenu(bank_list, bank, "name", () => {
        RemoveMenu(bank_list.child_lists)
        ListAnimation(bank)
    })
}

function ListAnim(anim) {
    for (const bank_name in anim.banks) {
        ListBank(anim.banks[bank_name])
    }
}

function ListBuildFrame(symbol) {
    for (const frame of symbol.get_all_frame()) {
        MakeMenu(build_frame_num, frame, "framenum", null, () => {})
        MakeMenu(build_frame_druation, frame, "duration")
        MakeMenu(build_frame_x, frame, "x")
        MakeMenu(build_frame_y, frame, "y")
        MakeMenu(build_frame_w, frame, "w")
        MakeMenu(build_frame_h, frame, "h")
    }
}

function ListSymbol(build) {
    for (const symbol_name in build.symbols) {
        const symbol = build.symbols[symbol_name]
        MakeMenu(
            symbol_list,
            symbol,
            "name",
            () => {
                RemoveMenu(symbol_list.child_lists)
                ListBuildFrame(symbol)
            },
            () => {}
        )
    }
}

function ListAtlas(build) {
    for (const idx in build.atlases) {
        const menu_div = document.createElement("div")
        menu_div.className = "menu"

        const input_text = document.createElement("input")
        input_text.className = "inputtext"
        input_text.value = `atlas-${idx}.tex`
        input_text.type = "text"
        input_text.readOnly = true

        menu_div.appendChild(input_text)

        const button = document.createElement("button")
        menu_div.appendChild(button)

        atlas_list.appendChild(menu_div)
    }
}

function ListBuild(build) {
    builds.push(build)
    MakeMenu(
        build_list,
        build,
        "name",
        async () => {
            RemoveMenu(build_list.child_lists)
            build_scale_input.value = build.scale
            ListSymbol(build)
            ListAtlas(build)
        },
        () => {}
    )
}

function LoadBinFile(content) {
    const buff = Buffer.from(content)
    const head = struct.unpack("<cccc", buff.subarray(0, 4)).toString()
    switch (head) {
        case "A,N,I,M":
            ListAnim(UnpackAnim(buff))
            break
        case "B,I,L,D":
            ListBuild(UnpackBuild(buff))
            break
        default:
            throw new TypeError("this unknow file")
    }
}

function LoadJsonFile(content) {
    const data = JSON.parse(content)
    switch (data.type) {
        case "Anim":
            ListAnim(new Anim(data))
            break
        case "Build":
            ListBuild(new Build(data))
            break
        default:
            throw new TypeError("this unknow file")
    }
}

// function LoadPngFile(content) {
//     const image = new Image()
//     image.crossOrigin = "anonymous"
//     image.onload = () => {
//         const ktex = new Ktex()
//         ktex.from_image(image)
//         ktex.get_file("a.tex")
//     }
//     image.src = content
// }

function LoadFile(file, readAs, onLoad) {
    return new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = () => {
            onLoad(reader.result)
            resolve()
        }
        reader[readAs](file)
    })
}

async function LoadFileAsync(files) {
    for (const file of files) {
        const type = file.name.split(".").pop()
        switch (type) {
            case "zip":
                JSZip.loadAsync(file).then(async zip => {
                    if ("build.bin" in zip.files) {
                        const atlases = {}
                        for (const file_name in zip.files) {
                            if (file_name.includes(".tex")) {
                                const content = await zip.files[file_name].async("array")
                                const buff = Buffer.from(content)
                                const ktex = new Ktex(file_name)
                                ktex.read_tex(buff)
                                atlases[file_name] = ktex.to_image()
                            }
                        }

                        const content = await zip.files["build.bin"].async("array")
                        const buff = Buffer.from(content)
                        const build = UnpackBuild(buff, atlases)
                        ListBuild(build)
                    }
                    if ("anim.bin" in zip.files) {
                        LoadBinFile(await zip.files["anim.bin"].async("array"))
                    }
                })
                break
            case "tex":

            case "bin":
                LoadFile(file, "readAsArrayBuffer", LoadBinFile)
                break
            case "json":
                LoadFile(file, "readAsText", LoadJsonFile)
                break
            case "png":
                // LoadFile(file, "readAsDataURL", LoadPngFile)
                break
        }
    }
}

document.addEventListener(
    "drop",
    async event => {
        event.preventDefault()
        await LoadFileAsync(event.dataTransfer.files)
    },
    false
)

document.addEventListener(
    "dragover",
    async event => {
        event.preventDefault()
    },
    false
)

file_input.addEventListener("change", async event => {
    await LoadFileAsync(event.target.files)
})

function ScaleAnim(scale) {
    scale = Math.max(0.1, Math.min(2, scale))
    PlayerArea.style.transform = "scale(" + scale + ")"
}

let scale = 1
PlayerArea.addEventListener(
    "wheel",
    function (event) {
        event.preventDefault()
        scale += Math.sign(event.deltaY) * 0.2
        ScaleAnim(scale)
    },
    { passive: false }
)
