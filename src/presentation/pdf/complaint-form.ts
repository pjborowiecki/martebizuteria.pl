import { type FormTemplate, renderFormDocument } from "~/src/presentation/pdf/form-document"

export const COMPLAINT_FORM: FormTemplate = {
  fileName: "formularz_reklamacji.pdf",
  render: (seller, fonts) =>
    renderFormDocument({
      blocks: [
        {
          kind: "eyebrow",
          text: "Reklamacja produktu niezgodnego z umową · art. 43a–43g ustawy z dnia 30 maja 2014 r. o prawach konsumenta",
        },
        { kind: "title", text: "Formularz reklamacji" },
        {
          kind: "lead",
          text: "Korzystanie z formularza nie jest obowiązkowe. Paragon nie jest wymagany: wystarczy numer zamówienia albo inny dowód zakupu.",
        },
        { kind: "section", text: "Sprzedawca" },
        {
          kind: "contact",
          text: `${seller.legalName}, ${seller.street}, ${seller.postalCode} ${seller.city}\nadres e-mail: ${seller.email}`,
        },
        { kind: "section", text: "Konsument" },
        {
          kind: "fields",
          rows: [
            { label: "Imię i nazwisko", lines: 1 },
            { label: "Adres", lines: 1 },
            { label: "E-mail lub telefon", lines: 1 },
          ],
        },
        { kind: "section", text: "Produkt" },
        {
          kind: "fields",
          rows: [
            { label: "Nazwa produktu", lines: 1 },
            { label: "Numer zamówienia", lines: 1 },
            { label: "Data dostarczenia", lines: 1 },
          ],
        },
        { kind: "section", text: "Brak zgodności z umową" },
        {
          kind: "fields",
          rows: [
            { label: "Na czym polega", lines: 3 },
            { label: "Data zauważenia", lines: 1 },
          ],
        },
        { kind: "section", text: "Żądanie (zaznacz jedno)" },
        {
          kind: "choices",
          rows: [
            [{ label: "naprawa produktu" }, { label: "wymiana produktu" }],
            [{ amountUnit: "zł", label: "obniżenie ceny o kwotę" }, { label: "odstąpienie od umowy" }],
          ],
        },
        {
          kind: "remark",
          text: "Obniżenia ceny albo odstąpienia od umowy można żądać w przypadkach określonych w art. 43e ustawy o prawach konsumenta, a od umowy nie można odstąpić, gdy brak zgodności jest nieistotny.",
        },
        { kind: "section", text: "Załączniki (opcjonalnie)" },
        { kind: "fields", rows: [{ label: "Na przykład zdjęcia", lines: 1 }] },
        { kind: "signatures", labels: ["Data", "Podpis (tylko w wersji papierowej)"] },
        {
          kind: "notice",
          paragraphs: [
            `Formularz można wysłać e-mailem na adres ${seller.email} albo listownie na adres Sprzedawcy. Koszt przesłania reklamowanego produktu do nas i z powrotem ponosimy my: przed wysyłką napisz do nas, a wskażemy, jak odesłać produkt na nasz koszt.`,
            "Odpowiemy na reklamację w ciągu 14 dni kalendarzowych od dnia jej otrzymania. Jeżeli nie odpowiemy w tym terminie, uważa się, że uznaliśmy reklamację (art. 7a ustawy o prawach konsumenta). Należne kwoty zwracamy przy użyciu takiego samego sposobu płatności, jakiego użyto przy zamówieniu.",
          ],
        },
      ],
      fonts,
      revisedAt: seller.updatedAt,
      title: "Formularz reklamacji",
    }),
}
