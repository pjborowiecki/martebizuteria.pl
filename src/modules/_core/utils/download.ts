export interface TextFileDownload {
  readonly content: string
  readonly fileName: string
  readonly mimeType: string
}

export const downloadTextFile = ({ content, fileName, mimeType }: TextFileDownload): void => {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", fileName)
  link.rel = "noopener"
  link.click()
  URL.revokeObjectURL(url)
}
