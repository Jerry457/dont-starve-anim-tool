import style from "./ProgressBar.module.css"

export default function ProgressBar(prop: { onClickprogress?: (percent: number) => void; progressValue: number }) {
    let progress: HTMLDivElement

    function onClick(e: MouseEvent) {
        const progressBoundingClientRect = progress.getBoundingClientRect()

        const offsetX = e.clientX - progressBoundingClientRect.left
        const percent = offsetX / progressBoundingClientRect.width

        prop.onClickprogress?.(percent)
    }

    return (
        <div
            classList={{ [style.progressBar]: true, [style.progressBarClickable]: prop.onClickprogress !== undefined }}
            onClick={onClick}
            ref={progress!}>
            <div class={style.progressValue} style={`width: ${prop.progressValue * 100}%`}></div>
        </div>
    )
}
