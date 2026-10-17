import { describe, expect, it } from "vite-plus/test"

import { FORM_FONT_FILES, PDF_RENDER_TIMEOUT, readPdf } from "~/src/platform/testing/lib/pdf"
import { TEST_STORED_SELLER_DETAILS } from "~/src/platform/testing/mocks/seller-details"

import { COMPLAINT_FORM } from "~/src/presentation/pdf/complaint-form"

const bytes = await COMPLAINT_FORM.render(TEST_STORED_SELLER_DETAILS, FORM_FONT_FILES)

const form = await readPdf(bytes)

describe("complaint form", PDF_RENDER_TIMEOUT, () => {
  it("prints the complaint form on one A4 page, naming the stored seller details as the seller", () => {
    expect(form.pageCount).toBe(1)
    expect(form.pageSize).toStrictEqual([0, 0, 595.28, 841.89])
    expect(form.lines).toStrictEqual([
      "M'Arte MARTEBIZUTERIA.PL",
      "Reklamacja produktu niezgodnego z umową · art. 43a–43g ustawy z dnia 30 maja 2014 r. o prawach konsumenta",
      "Formularz reklamacji",
      "Korzystanie z formularza nie jest obowiązkowe. Paragon nie jest wymagany: wystarczy numer zamówienia albo",
      "inny dowód zakupu.",
      "SPRZEDAWCA",
      "Pracownia Testowa Anna Nowak, ul. Floriańska 1, 31-001 Kraków",
      "adres e-mail: sklep@marte.test",
      "KONSUMENT",
      "Imię i nazwisko",
      "Adres",
      "E-mail lub telefon",
      "PRODUKT",
      "Nazwa produktu",
      "Numer zamówienia",
      "Data dostarczenia",
      "BRAK ZGODNOŚCI Z UMOWĄ",
      "Na czym polega",
      "Data zauważenia",
      "ŻĄDANIE (ZAZNACZ JEDNO)",
      "naprawa produktu wymiana produktu",
      "obniżenie ceny o kwotę zł odstąpienie od umowy",
      "Obniżenia ceny albo odstąpienia od umowy można żądać w przypadkach określonych w art. 43e ustawy o prawach",
      "konsumenta, a od umowy nie można odstąpić, gdy brak zgodności jest nieistotny.",
      "ZAŁĄCZNIKI (OPCJONALNIE)",
      "Na przykład zdjęcia",
      "Data Podpis (tylko w wersji papierowej)",
      "Formularz można wysłać e-mailem na adres sklep@marte.test albo listownie na adres Sprzedawcy. Koszt przesłania",
      "reklamowanego produktu do nas i z powrotem ponosimy my: przed wysyłką napisz do nas, a wskażemy, jak odesłać",
      "produkt na nasz koszt.",
      "Odpowiemy na reklamację w ciągu 14 dni kalendarzowych od dnia jej otrzymania. Jeżeli nie odpowiemy w tym terminie,",
      "uważa się, że uznaliśmy reklamację (art. 7a ustawy o prawach konsumenta). Należne kwoty zwracamy przy użyciu takiego",
      "samego sposobu płatności, jakiego użyto przy zamówieniu.",
    ])
  })

  it("names the document in Polish and dates it to the last save of the seller details", () => {
    expect(form.info).toMatchObject({
      CreationDate: "D:20261016120000Z",
      Language: "pl",
      ModDate: "D:20261016120000Z",
      Title: "Formularz reklamacji – M'Arte",
    })
  })

  it("embeds only the glyphs it uses, so the file stays small", () => {
    expect(bytes.byteLength).toBeLessThan(20_000)
  })
})
