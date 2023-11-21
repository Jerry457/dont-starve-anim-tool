export function downloadFile(blob: Blob, fileName: string) {
    const downloadLink = document.createElement("a")
    downloadLink.href = URL.createObjectURL(blob)
    downloadLink.download = fileName
    downloadLink.click()
    URL.revokeObjectURL(downloadLink.href)
}
