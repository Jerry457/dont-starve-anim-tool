export function asyncLoadFile(file: File, read: "readAsText"): Promise<string>
export function asyncLoadFile(file: File, read: "readAsDataURL"): Promise<string | null>
export function asyncLoadFile(file: File, read: "readAsArrayBuffer"): Promise<ArrayBuffer | null>
export function asyncLoadFile(file: File, read: "readAsText" | "readAsDataURL" | "readAsArrayBuffer"): Promise<string | ArrayBuffer | null> {
    return new Promise(resolve => {
        const fileReader = new FileReader()
        fileReader.onload = e => resolve(e.target!.result)

        fileReader[read](file)
    })
}

export function downloadFile(blob: Blob, fileName: string) {
    const downloadLink = document.createElement("a")
    downloadLink.href = URL.createObjectURL(blob)
    downloadLink.download = fileName
    downloadLink.click()
    URL.revokeObjectURL(downloadLink.href)
}
