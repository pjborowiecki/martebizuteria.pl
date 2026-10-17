import { type FormTemplate, renderFormDocument } from "~/src/presentation/pdf/form-document"

export const WITHDRAWAL_FORM: FormTemplate = {
  fileName: "formularz_zwrotu.pdf",
  render: (seller, fonts) =>
    renderFormDocument({
      blocks: [
        { kind: "eyebrow", text: "Załącznik nr 2 do ustawy z dnia 30 maja 2014 r. o prawach konsumenta" },
        { kind: "title", text: "Wzór formularza odstąpienia od umowy" },
        { kind: "lead", text: "(formularz ten należy wypełnić i odesłać tylko w przypadku chęci odstąpienia od umowy)" },
        {
          emphasis: `${seller.legalName}, ${seller.street}, ${seller.postalCode} ${seller.city}, adres e-mail: ${seller.email}`,
          kind: "statement",
          text: "Adresat:",
        },
        {
          kind: "statement",
          text: "Ja/My(*) niniejszym informuję/informujemy(*) o moim/naszym odstąpieniu od umowy sprzedaży następujących rzeczy(*) umowy dostawy następujących rzeczy(*) umowy o dzieło polegającej na wykonaniu następujących rzeczy(*)/o świadczenie następującej usługi(*)",
        },
        { count: 4, kind: "writingLines" },
        { kind: "statement", text: "Data zawarcia umowy(*)/odbioru(*)" },
        { count: 1, kind: "writingLines" },
        { kind: "statement", text: "Imię i nazwisko konsumenta(-ów)" },
        { count: 1, kind: "writingLines" },
        { kind: "statement", text: "Adres konsumenta(-ów)" },
        { count: 2, kind: "writingLines" },
        { kind: "statement", text: "Podpis konsumenta(-ów) (tylko jeżeli formularz jest przesyłany w wersji papierowej)" },
        { count: 1, kind: "writingLines" },
        { kind: "statement", text: "Data" },
        { count: 1, kind: "writingLines" },
        { kind: "footnote", text: "(*) Niepotrzebne skreślić." },
        {
          kind: "notice",
          paragraphs: [
            `Wypełniony formularz można wysłać e-mailem na adres ${seller.email} albo listownie na adres podany wyżej. Korzystanie z formularza nie jest obowiązkowe: wystarczy każde jednoznaczne oświadczenie o odstąpieniu od umowy, wysłane przed upływem 14 dni od dnia odbioru produktu.`,
            "Podanie numeru zamówienia ułatwi nam zwrot. Zwrot płatności następuje przy użyciu takiego samego sposobu płatności, jakiego użyto przy zamówieniu, więc numer rachunku bankowego nie jest potrzebny.",
          ],
        },
      ],
      fonts,
      revisedAt: seller.updatedAt,
      title: "Formularz odstąpienia od umowy",
    }),
}
