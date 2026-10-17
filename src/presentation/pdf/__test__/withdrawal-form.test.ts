import { describe, expect, it } from "vite-plus/test"

import { FORM_FONT_FILES, PDF_RENDER_TIMEOUT, readPdf } from "~/src/platform/testing/lib/pdf"
import { TEST_STORED_SELLER_DETAILS } from "~/src/platform/testing/mocks/seller-details"

import { WITHDRAWAL_FORM } from "~/src/presentation/pdf/withdrawal-form"

const A4_HEIGHT = 841.89

const A4 = [0, 0, 595.28, A4_HEIGHT]

const bytes = await WITHDRAWAL_FORM.render(TEST_STORED_SELLER_DETAILS, FORM_FONT_FILES)

const form = await readPdf(bytes)

describe("withdrawal form", PDF_RENDER_TIMEOUT, () => {
  it("prints the statutory model withdrawal form on one A4 page, addressed to the stored seller details", () => {
    expect(form.pageCount).toBe(1)
    expect(form.pageSize).toStrictEqual(A4)
    expect(form.lines).toStrictEqual([
      "M'Arte MARTEBIZUTERIA.PL",
      "Załącznik nr 2 do ustawy z dnia 30 maja 2014 r. o prawach konsumenta",
      "Wzór formularza odstąpienia od umowy",
      "(formularz ten należy wypełnić i odesłać tylko w przypadku chęci odstąpienia od umowy)",
      "– Adresat: Pracownia Testowa Anna Nowak, ul. Floriańska 1, 31-001 Kraków, adres e-mail: sklep@marte.test",
      "– Ja/My(*) niniejszym informuję/informujemy(*) o moim/naszym odstąpieniu od umowy sprzedaży",
      "następujących rzeczy(*) umowy dostawy następujących rzeczy(*) umowy o dzieło polegającej na",
      "wykonaniu następujących rzeczy(*)/o świadczenie następującej usługi(*)",
      "– Data zawarcia umowy(*)/odbioru(*)",
      "– Imię i nazwisko konsumenta(-ów)",
      "– Adres konsumenta(-ów)",
      "– Podpis konsumenta(-ów) (tylko jeżeli formularz jest przesyłany w wersji papierowej)",
      "– Data",
      "(*) Niepotrzebne skreślić.",
      "Wypełniony formularz można wysłać e-mailem na adres sklep@marte.test albo listownie na adres podany wyżej.",
      "Korzystanie z formularza nie jest obowiązkowe: wystarczy każde jednoznaczne oświadczenie o odstąpieniu od umowy,",
      "wysłane przed upływem 14 dni od dnia odbioru produktu.",
      "Podanie numeru zamówienia ułatwi nam zwrot. Zwrot płatności następuje przy użyciu takiego samego sposobu",
      "płatności, jakiego użyto przy zamówieniu, więc numer rachunku bankowego nie jest potrzebny.",
    ])
  })

  it("names the document in Polish and dates it to the last save of the seller details", () => {
    expect(form.info).toMatchObject({
      CreationDate: "D:20261016120000Z",
      Creator: "M'Arte",
      Language: "pl",
      ModDate: "D:20261016120000Z",
      Title: "Formularz odstąpienia od umowy – M'Arte",
    })
  })

  it("embeds only the glyphs it uses, so the file stays small", () => {
    expect(bytes.byteLength).toBeLessThan(20_000)
  })

  it("wraps a long seller name, address and e-mail over several lines and still fits the page", async () => {
    const long = await readPdf(
      await WITHDRAWAL_FORM.render(
        {
          ...TEST_STORED_SELLER_DETAILS,
          city: "Bielsko-Biała Południowa Dzielnica Przemysłowa Wschód",
          email: "reklamacje.i.zwroty.zamowien.internetowych@pracownia-jubilerska-przyklad.com.pl",
          legalName: "Pracownia Złotnicza i Jubilerska „Śnieżka” Zofia Żółkiewska-Grzęślewicz spółka komandytowa z bardzo długą nazwą",
          street: "ul. Księcia Józefa Poniatowskiego 123/45 lok. 6",
        },
        FORM_FONT_FILES,
      ),
    )

    expect(long.pageCount).toBe(1)
    expect(long.lines.slice(4, 8)).toStrictEqual([
      "– Adresat: Pracownia Złotnicza i Jubilerska „Śnieżka” Zofia Żółkiewska-Grzęślewicz spółka komandytowa",
      "z bardzo długą nazwą, ul. Księcia Józefa Poniatowskiego 123/45 lok. 6, 31-001 Bielsko-Biała Południowa",
      "Dzielnica Przemysłowa Wschód, adres e-mail:",
      "reklamacje.i.zwroty.zamowien.internetowych@pracownia-jubilerska-przyklad.com.pl",
    ])
    expect(long.lowestBaseline).toBeLessThan(A4_HEIGHT - 60)
  })
})
