export const escapeCsvField = (value: string): string => value.replaceAll('"', '""')

export const downloadCsvFile = (fileName: string, content: string): void => {
  const blob = new Blob([content], {
    type: "text/csv;charset=utf-8;",
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", fileName)
  link.rel = "noopener"
  link.click()
  URL.revokeObjectURL(url)
}
