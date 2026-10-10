UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', 'Ta polityka wyjaśnia, jakie dane osobowe przetwarzamy w sklepie internetowym M''Arte pod adresem martebizuteria.pl, w jakich celach i na jakiej podstawie prawnej, komu je przekazujemy, jak długo je przechowujemy, co zapisujemy w Twojej przeglądarce oraz jakie prawa przysługują Ci na podstawie rozporządzenia (UE) 2016/679 (RODO).

## Administrator danych

Administratorem Twoich danych osobowych jest:

Pyciak Mariusz Firma Jubilerska\
ul. Wąska 11\
32-700 Bochnia\
NIP 8681772646, REGON 384616568

W sprawach dotyczących Twoich danych możesz się z nami kontaktować:

- e-mailem: [kontakt@martebizuteria.pl](mailto:kontakt@martebizuteria.pl),
- telefonicznie: [+48 663 150 820](tel:+48663150820),
- listownie: na adres podany powyżej.

## Cele i podstawy prawne przetwarzania

### Zamówienia

Gdy składasz zamówienie, przetwarzamy dane podane w kasie: adres e-mail, numer telefonu, imię i nazwisko, adres dostawy albo wybrany Paczkomat InPost i adres rozliczeniowy, a jeżeli chcesz otrzymać fakturę na firmę, także nazwę firmy i NIP. Przetwarzamy też uwagi do zamówienia, zamówione produkty, ceny, koszt dostawy i użyty kod rabatowy. Robimy to, aby zawrzeć i wykonać umowę sprzedaży: przyjąć płatność, przygotować i doręczyć zamówienie oraz wysyłać Ci wiadomości e-mail o jego przyjęciu, wysyłce, anulowaniu, zwrocie płatności albo nieudanej płatności (art. 6 ust. 1 lit. b RODO).

Dane płatnicze, takie jak numer karty czy kod BLIK, podajesz w formularzu Stripe albo w swoim banku i nie trafiają one do nas. Od Stripe otrzymujemy informację o wyniku płatności, a w przypadku kart zapisanych w koncie także ich rodzaj, cztery ostatnie cyfry i datę ważności.

Podanie danych jest dobrowolne, ale bez nich nie możemy przyjąć ani zrealizować zamówienia. Nazwę firmy i NIP podajesz tylko wtedy, gdy chcesz otrzymać fakturę na firmę.

### Rachunkowość i podatki

Dane z zamówień i płatności przechowujemy w dokumentacji księgowej i podatkowej oraz wykorzystujemy do wystawiania dowodów zakupu i faktur, ponieważ wymagają tego przepisy o rachunkowości i podatkach (art. 6 ust. 1 lit. c RODO). Faktury VAT wystawiamy poza sklepem internetowym, w naszym systemie księgowym, a gdy wymagają tego przepisy, w Krajowym Systemie e-Faktur (KSeF).

### Konto

Gdy zakładasz konto, przetwarzamy Twoje imię i nazwisko, adres e-mail i hasło, które przechowujemy wyłącznie w postaci zabezpieczonego skrótu. W koncie przechowujemy też dane, które do niego dodajesz: numer telefonu, zapisane adresy, listę życzeń i ustawienia uwierzytelniania dwuskładnikowego, a także historię Twoich zamówień. Robimy to, aby prowadzić konto zgodnie z [Regulaminem](/terms-of-service) (art. 6 ust. 1 lit. b RODO).

Po potwierdzeniu adresu e-mail łączymy z kontem zamówienia złożone wcześniej bez logowania na ten sam adres oraz subskrypcję newslettera na ten adres.

Gdy płacisz po zalogowaniu albo zapisujesz kartę płatniczą, tworzymy dla Twojego konta profil klienta w Stripe z Twoim imieniem i nazwiskiem oraz adresem e-mail. Zapisane karty przechowuje Stripe, a nie my. Możesz je usunąć w ustawieniach konta.

Jeżeli logujesz się kontem Google, Google przekazuje nam Twoje imię i nazwisko, adres e-mail i adres zdjęcia profilowego, a my zapisujemy powiązanie konta w sklepie z kontem Google.

### Newsletter

Gdy zapisujesz się do newslettera na stronie głównej albo w ustawieniach konta, przetwarzamy Twój adres e-mail, wybrany język, miejsce zapisu oraz daty zapisu, potwierdzenia i rezygnacji, aby wysyłać Ci informacje o nowych produktach i ofertach sklepu, w tym kody rabatowe dla subskrybentów. Podstawą jest Twoja zgoda (art. 6 ust. 1 lit. a RODO), którą wyrażasz, zapisując się i klikając link potwierdzający w wiadomości e-mail.

Zgodę możesz wycofać w każdej chwili, bez podawania przyczyny i bez kosztów: przez link rezygnacji w każdej wiadomości, w ustawieniach konta albo pisząc do nas. Wycofanie zgody nie wpływa na zgodność z prawem przetwarzania, którego dokonano przed jej wycofaniem. Subskrypcja nie zależy od konta, więc usunięcie konta jej nie kończy.

### Bezpieczeństwo i zapobieganie nadużyciom

Aby chronić sklep, konta klientów i płatności przed włamaniami, botami i oszustwami, przetwarzamy:

- adres IP i opis przeglądarki zapisywane przy każdej sesji logowania,
- historię logowań, wylogowań i nieudanych prób logowania wraz z adresem IP, a przy nieudanych próbach także z wpisanym adresem e-mail; logowania i nieudane próby logowania do swojego konta widzisz w jego ustawieniach,
- adresy IP w licznikach, które ograniczają liczbę logowań, rejestracji, resetów hasła, wyszukiwań i innych żądań wysyłanych z jednego adresu w ciągu minuty,
- skrót (SHA-256) adresu e-mail w licznikach, które ograniczają liczbę wiadomości z linkiem weryfikacyjnym, linkiem do resetu hasła albo potwierdzeniem zapisu do newslettera wysyłanych na jeden adres do trzech wiadomości każdego rodzaju na godzinę; liczniki nie zawierają samego adresu e-mail,
- adres IP, z którego rozpoczęto płatność, zapisywany przy zamówieniu, dopóki płatność jest otwarta, aby ograniczyć liczbę płatności otwartych jednocześnie z jednego adresu IP i na jeden adres e-mail; usuwamy go, gdy zamówienie zostanie opłacone albo płatność się nie powiedzie lub wygaśnie,
- wynik weryfikacji Cloudflare Turnstile, która odróżnia ludzi od botów przy rejestracji, przypomnieniu hasła, ponownym wysłaniu linku weryfikacyjnego, zapisie do newslettera i przejściu do płatności; aby sprawdzić ten wynik, przekazujemy Cloudflare jednorazowy token weryfikacji wraz z adresem IP.

Podstawą jest nasz prawnie uzasadniony interes w zapewnieniu bezpieczeństwa sklepu i zapobieganiu oszustwom (art. 6 ust. 1 lit. f RODO).

### Aktywność zalogowanych klientów

Gdy korzystasz ze sklepu po zalogowaniu, zapisujemy w dzienniku aktywności Twojego konta, które strony sklepu odwiedzasz (poza kasą i kontem), jakie produkty dodajesz do koszyka oraz to, że przechodzisz do innej karty albo zamykasz sklep, mając produkty w koszyku, wraz z adresem IP. Dzięki temu widzimy, jak klienci korzystają ze sklepu, i możemy lepiej pomóc, gdy się z nami kontaktujesz. Podstawą jest nasz prawnie uzasadniony interes (art. 6 ust. 1 lit. f RODO). Nie zapisujemy aktywności osób niezalogowanych.

### Kontakt z nami

Gdy piszesz do nas albo dzwonisz, przetwarzamy dane, które nam przekazujesz, aby odpowiedzieć i załatwić sprawę. Gdy sprawa dotyczy zamówienia, odstąpienia od umowy albo reklamacji, podstawą jest umowa i ciążące na nas obowiązki prawne (art. 6 ust. 1 lit. b i c RODO), a w pozostałych przypadkach nasz prawnie uzasadniony interes w odpowiadaniu na wiadomości (art. 6 ust. 1 lit. f RODO).

### Roszczenia

Dane z zamówień, płatności i korespondencji możemy wykorzystać, aby ustalić lub dochodzić roszczeń albo bronić się przed nimi, na przykład gdy bank zakwestionuje płatność. Podstawą jest nasz prawnie uzasadniony interes (art. 6 ust. 1 lit. f RODO).

## Odbiorcy danych

Przekazujemy dane tylko tym podmiotom, bez których nie moglibyśmy prowadzić sklepu. Podmioty przetwarzające dane w naszym imieniu robią to na podstawie umów powierzenia i wyłącznie według naszych poleceń.

- **Cloudflare, Inc.** – hosting sklepu, baza danych, przechowywanie zdjęć produktów, kolejki zadań, pamięć podręczna, ochrona przed atakami i weryfikacja Cloudflare Turnstile. Każde połączenie ze sklepem przechodzi przez sieć Cloudflare, która przetwarza przy tym adres IP i dane techniczne połączenia.
- **Stripe Payments Europe, Limited** z siedzibą w Irlandii – płatności kartą, BLIK i Przelewy24, zwroty płatności i zapisane karty. Stripe otrzymuje adres e-mail, nazwy i ceny zamówionych produktów oraz kwotę do zapłaty, a dane płatnicze bezpośrednio od Ciebie. Gdy Stripe przetwarza dane, aby wykrywać oszustwa i wypełniać własne obowiązki prawne, działa jako odrębny administrator na zasadach opisanych w [polityce prywatności Stripe](https://stripe.com/privacy).
- **Resend, Inc.** – wysyłka wiadomości e-mail ze sklepu: potwierdzeń i informacji o zamówieniach, wiadomości dotyczących konta oraz potwierdzeń zapisu do newslettera. Resend otrzymuje adres odbiorcy i treść wiadomości.
- **InPost sp. z o.o.** z siedzibą w Krakowie – doręczanie przesyłek kurierem i do Paczkomatów InPost. Nadając przesyłkę, przekazujemy InPost imię i nazwisko, adres dostawy albo wybrany Paczkomat, numer telefonu i adres e-mail. Gdy szukasz Paczkomatu w kasie, Twoja przeglądarka pobiera listę punktów w podanej miejscowości bezpośrednio z serwerów InPost.
- **Google** – jeżeli logujesz się kontem Google, Google potwierdza Twoją tożsamość i przekazuje nam dane opisane w części o koncie, działając jako odrębny administrator. Formularz płatności Stripe pobiera czcionkę z Google Fonts, więc Google otrzymuje wtedy adres IP Twojego urządzenia.
- **CARTO** – mapę w wyborze Paczkomatu Twoja przeglądarka pobiera z serwerów CARTO, które otrzymują wtedy adres IP Twojego urządzenia i oglądany fragment mapy.

Gdy wymagają tego przepisy, udostępniamy dane uprawnionym organom publicznym, na przykład organom podatkowym. Nie sprzedajemy danych osobowych i nie przekazujemy ich w celach reklamowych.

## Przekazywanie danych poza Europejski Obszar Gospodarczy

Część odbiorców przetwarza dane w Stanach Zjednoczonych. Stripe przekazuje dane do spółki Stripe, Inc. w USA, a Resend, Inc. ma siedzibę w USA. W USA ma siedzibę także Cloudflare, Inc., która obsługuje ruch w centrach danych na całym świecie, również poza Europejskim Obszarem Gospodarczym.

Przekazanie danych do USA opiera się na decyzji wykonawczej Komisji (UE) 2023/1795 z 10 lipca 2023 r. stwierdzającej odpowiedni stopień ochrony danych osobowych zapewniany przez ramy ochrony danych UE–USA (EU-US Data Privacy Framework, art. 45 RODO) w odniesieniu do odbiorców, którzy uczestniczą w tym programie, a w pozostałym zakresie na standardowych klauzulach umownych przyjętych przez Komisję Europejską (art. 46 ust. 2 lit. c RODO). Listę uczestników programu znajdziesz na stronie [dataprivacyframework.gov](https://www.dataprivacyframework.gov). Kopię standardowych klauzul umownych otrzymasz, pisząc do nas.

Google przetwarza dane przy logowaniu kontem Google i przy pobieraniu czcionek jako odrębny administrator, również w USA, na zasadach opisanych w [polityce prywatności Google](https://policies.google.com/privacy).

## Okres przechowywania danych

Dane przechowujemy przez następujące okresy:

- zamówienia, płatności i dane w nich zawarte – 5 lat, licząc od końca roku kalendarzowego, w którym złożono zamówienie, zgodnie z przepisami o rachunkowości i podatkach; usunięcie konta nie skraca tego okresu,
- dane konta – do czasu usunięcia konta, które możesz usunąć w każdej chwili w jego ustawieniach albo prosząc nas o to,
- zamówienia rozpoczęte w kasie, ale nieopłacone, bo zostały porzucone, płatność się nie powiodła albo wygasła, wraz z podanym w nich adresem e-mail, numerem telefonu i adresami – 30 dni od ich zakończenia,
- dziennik aktywności zalogowanych klientów (odwiedzone strony, zdarzenia koszyka i adresy IP) – 90 dni,
- historia logowań – 12 miesięcy,
- dziennik zdarzeń administracyjnych sklepu, na przykład zmian w zamówieniach i wysłanych wiadomości – 2 lata,
- niepotwierdzone zapisy do newslettera – 30 dni, a dane osób, które zrezygnowały z newslettera – 30 dni od rezygnacji,
- sesje logowania, linki weryfikacyjne i linki do resetu hasła oraz liczniki żądań i wiadomości – do ich wygaśnięcia, po którym je usuwamy; liczniki adresów IP wygasają po minucie, a liczniki adresów e-mail po godzinie.

## Pliki cookies i inne dane zapisywane w przeglądarce

Sklep zapisuje w Twojej przeglądarce pliki cookies i dane opisane poniżej. Nie używamy plików cookies reklamowych ani narzędzi analitycznych firm trzecich.

### Pliki cookies sklepu

- `marte_locale` – zapamiętuje wybraną wersję językową sklepu; 1 rok.
- `__Secure-better-auth.session_token` – utrzymuje Twoją sesję logowania; 7 dni, przedłużane, gdy korzystasz ze sklepu, i usuwane po wylogowaniu.
- `__Secure-better-auth.session_token_multi-…` – kopia tokenu sesji zapisywana przy każdym logowaniu, po jednej dla każdego konta zalogowanego w tej przeglądarce; 7 dni, przedłużane jak wyżej i usuwane po wylogowaniu.
- `__Secure-better-auth.state` – chroni logowanie kontem Google przed sfałszowanymi żądaniami; 5 minut.
- `__Secure-better-auth.two_factor` – łączy kroki logowania z uwierzytelnianiem dwuskładnikowym; 10 minut.
- `__Secure-better-auth.trust_device` – zapamiętuje urządzenie, gdy przy uwierzytelnianiu dwuskładnikowym zaznaczysz, że mu ufasz; 30 dni.
- `sidebar_state` – tylko w panelu administracyjnym sklepu: zapamiętuje, czy menu boczne jest zwinięte; 1 rok.

### Pamięć przeglądarki

Dane w pamięci lokalnej (localStorage) zostają w przeglądarce, dopóki sklep albo Ty ich nie usuniecie. Dane w pamięci sesji (sessionStorage) znikają po zamknięciu karty.

- `marte-cart` (localStorage) – zawartość koszyka: produkty, warianty, liczba sztuk i ceny; koszyk jest opróżniany po złożeniu zamówienia.
- `marte-checkout-session` (localStorage) – identyfikator otwartej płatności i skrót zawartości koszyka, aby po powrocie do karty dokończyć tę samą płatność zamiast rozpoczynać nową; usuwany po złożeniu zamówienia albo zamknięciu płatności.
- `marte-checkout-draft` (sessionStorage) – dane wpisane w kasie, aby nie zginęły po odświeżeniu strony; do zamknięcia karty albo złożenia zamówienia.
- `customer-activity:page-view:…` i `customer-activity:cart-abandoned-sent` (sessionStorage) – tylko po zalogowaniu: oznaczają strony i zdarzenia koszyka już zapisane w dzienniku aktywności, aby nie zapisywać ich ponownie; do zamknięcia karty.
- `sidebar_state`, `marte:datagrid:v1:…` i `admin-sheet-width:…` (localStorage) – tylko w panelu administracyjnym sklepu: układ menu, tabel i paneli.

### Stripe

Na kroku płatności w kasie i przy dodawaniu karty w koncie ładuje się skrypt Stripe. Zapisuje on w domenie sklepu pliki cookies służące wykrywaniu oszustw: `__stripe_mid` na 1 rok i `__stripe_sid` na 30 minut. Formularz płatności działa w ramkach z domen Stripe, w których Stripe może zapisywać własne dane na zasadach opisanych w [polityce prywatności Stripe](https://stripe.com/privacy).

### Cloudflare Turnstile

Przy rejestracji, przypomnieniu hasła, ponownym wysłaniu linku weryfikacyjnego, zapisie do newslettera i przejściu do płatności ładuje się weryfikacja Cloudflare Turnstile w ramce z domeny challenges.cloudflare.com. Sprawdza ona sygnały z przeglądarki i urządzenia, aby odróżnić ludzi od botów, i przekazuje formularzowi jednorazowy token ważny 5 minut. Dane przetwarzane przez Turnstile opisuje [Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/).

Pliki cookies i dane witryny możesz w każdej chwili usunąć albo zablokować w ustawieniach przeglądarki. Bez nich nie zadziała logowanie, koszyk ani składanie zamówień.

## Twoje prawa

Masz prawo:

- dostępu do swoich danych i otrzymania ich kopii (art. 15 RODO),
- sprostowania danych (art. 16 RODO),
- usunięcia danych (art. 17 RODO), chyba że musimy je dalej przechowywać, na przykład w dokumentacji księgowej,
- ograniczenia przetwarzania (art. 18 RODO),
- przeniesienia dostarczonych nam danych, gdy przetwarzamy je na podstawie umowy albo zgody (art. 20 RODO),
- sprzeciwu wobec przetwarzania opartego na naszym prawnie uzasadnionym interesie (art. 21 RODO),
- wycofania zgody w każdej chwili, bez wpływu na zgodność z prawem przetwarzania przed jej wycofaniem (art. 7 ust. 3 RODO).

Dane konta możesz też samodzielnie przeglądać i poprawiać w jego ustawieniach, a konto usunąć. Aby skorzystać z pozostałych praw, napisz do nas na adres [kontakt@martebizuteria.pl](mailto:kontakt@martebizuteria.pl) albo listownie. Odpowiemy bez zbędnej zwłoki, nie później niż w ciągu miesiąca. W sprawach szczególnie złożonych albo licznych termin ten może zostać przedłużony o dwa miesiące, o czym Cię poinformujemy.

### Skarga do organu nadzorczego

Jeżeli uważasz, że przetwarzamy Twoje dane niezgodnie z prawem, możesz wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych, ul. Stawki 2, 00-193 Warszawa ([uodo.gov.pl](https://uodo.gov.pl)).

## Zautomatyzowane podejmowanie decyzji

Nie podejmujemy wobec Ciebie decyzji opartych wyłącznie na zautomatyzowanym przetwarzaniu, w tym profilowaniu, które wywoływałyby skutki prawne albo w podobny sposób istotnie na Ciebie wpływały. Stripe może automatycznie odrzucić płatność, którą jego systemy uznają za ryzykowną. Wtedy możesz spróbować zapłacić ponownie albo napisać do nas.

## Zmiany polityki prywatności

Gdy zmienimy sposób przetwarzania danych, zaktualizujemy tę politykę. Data ostatniej zmiany jest podana na górze strony.', '$."en-US"', 'This policy explains what personal data we process in the M''Arte online shop at martebizuteria.pl, for what purposes and on what legal basis, who we share it with, how long we keep it, what we store in your browser and what rights you have under Regulation (EU) 2016/679 (the GDPR).

## Data controller

The controller of your personal data is:

Pyciak Mariusz Firma Jubilerska\
ul. Wąska 11\
32-700 Bochnia\
Poland\
NIP (tax identification number) 8681772646, REGON (business statistics number) 384616568

You can contact us about your data:

- by e-mail: [kontakt@martebizuteria.pl](mailto:kontakt@martebizuteria.pl),
- by telephone: [+48 663 150 820](tel:+48663150820),
- by post: at the address above.

## Purposes and legal bases of processing

### Orders

When you place an order, we process the data you give at checkout: your e-mail address, telephone number, first and last name, delivery address or chosen InPost Paczkomat parcel locker and billing address, and, if you want a company invoice, the company name and NIP. We also process your order notes, the products ordered, prices, the delivery cost and any discount code used. We do this to conclude and perform the contract of sale: to take payment, to prepare and deliver the order and to send you e-mails when it is accepted, shipped or cancelled, when a payment is refunded or when a payment fails (Article 6(1)(b) GDPR).

You enter payment details, such as a card number or a BLIK code, in the Stripe form or at your bank, and they never reach us. Stripe tells us the outcome of the payment and, for cards saved in your account, their brand, last four digits and expiry date.

Providing this data is voluntary, but without it we cannot accept or fulfil your order. You give a company name and NIP only if you want a company invoice.

### Accounting and tax

We keep order and payment data in our accounting and tax records and use it to issue proofs of purchase and invoices, because accounting and tax law requires it (Article 6(1)(c) GDPR). We issue VAT invoices outside the online shop, in our accounting system and, where the law requires it, in the National e-Invoicing System (KSeF).

### Account

When you create an account, we process your first and last name, your e-mail address and your password, which we store only as a secure hash. Your account also holds the data you add to it: your telephone number, saved addresses, wishlist and two-factor authentication settings, as well as your order history. We do this to provide the account under the [Terms of Service](/terms-of-service) (Article 6(1)(b) GDPR).

Once you confirm your e-mail address, we link to your account the orders placed earlier without signing in under the same address and any newsletter subscription for that address.

When you pay while signed in or save a payment card, we create a customer profile for your account at Stripe with your first and last name and e-mail address. Saved cards are stored by Stripe, not by us. You can remove them in your account settings.

If you sign in with a Google account, Google gives us your first and last name, e-mail address and the address of your profile picture, and we record the link between your shop account and your Google account.

### Newsletter

When you subscribe to the newsletter on the home page or in your account settings, we process your e-mail address, chosen language, where you subscribed and the dates you subscribed, confirmed and unsubscribed, in order to send you news about new products and offers from the shop, including discount codes for subscribers. The legal basis is your consent (Article 6(1)(a) GDPR), which you give by subscribing and clicking the confirmation link in the e-mail we send.

You can withdraw your consent at any time, without giving a reason and at no cost: through the unsubscribe link in every message, in your account settings or by writing to us. Withdrawing consent does not affect the lawfulness of processing carried out before you withdrew it. The subscription does not depend on an account, so deleting your account does not end it.

### Security and abuse prevention

To protect the shop, customer accounts and payments from break-ins, bots and fraud, we process:

- the IP address and browser description recorded for each signed-in session,
- a history of sign-ins, sign-outs and failed sign-in attempts with the IP address and, for failed attempts, the e-mail address entered; you can see the sign-ins and failed sign-in attempts to your account in its settings,
- IP addresses in counters that limit how many sign-ins, sign-ups, password resets, searches and other requests can be sent from one address within a minute,
- a hash (SHA-256) of the e-mail address in counters that limit the e-mails with a verification link, a password reset link or a newsletter confirmation sent to one address to three of each kind an hour; the counters do not contain the e-mail address itself,
- the IP address a payment was started from, kept with the order while the payment is open, to limit how many payments can be open at once from one IP address and for one e-mail address; we delete it when the order is paid or the payment fails or expires,
- the result of the Cloudflare Turnstile check, which tells people from bots when you sign up, ask for a password reset, ask for a new verification link, subscribe to the newsletter and go to payment; to check that result, we send Cloudflare the check''s one-time token together with your IP address.

The legal basis is our legitimate interest in keeping the shop secure and preventing fraud (Article 6(1)(f) GDPR).

### Activity of signed-in customers

While you are signed in, we record in your account''s activity log which shop pages you visit (other than the checkout and your account), which products you add to the cart and when you switch to another tab or close the shop with products in your cart, together with your IP address. This shows us how customers use the shop and helps us assist you when you contact us. The legal basis is our legitimate interest (Article 6(1)(f) GDPR). We do not record the activity of visitors who are not signed in.

### Contacting us

When you write to us or call us, we process the data you give us to reply and deal with your matter. Where it concerns an order, a withdrawal from a contract or a complaint, the legal basis is the contract and our legal obligations (Article 6(1)(b) and (c) GDPR); otherwise it is our legitimate interest in answering messages (Article 6(1)(f) GDPR).

### Claims

We may use order, payment and correspondence data to establish, pursue or defend legal claims, for example when a bank disputes a payment. The legal basis is our legitimate interest (Article 6(1)(f) GDPR).

## Recipients of data

We share data only with those we need to run the shop. Those who process data on our behalf do so under data processing agreements and only on our instructions.

- **Cloudflare, Inc.** – hosting of the shop, its database, storage of product images, task queues, caching, protection against attacks and the Cloudflare Turnstile check. Every connection to the shop passes through Cloudflare''s network, which processes the IP address and technical connection data.
- **Stripe Payments Europe, Limited**, based in Ireland – payments by card, BLIK and Przelewy24, refunds and saved cards. Stripe receives your e-mail address, the names and prices of the products ordered and the amount due, and receives your payment details directly from you. Where Stripe processes data to detect fraud and to meet its own legal obligations, it acts as a separate controller under the [Stripe privacy policy](https://stripe.com/privacy).
- **Resend, Inc.** – sending the shop''s e-mails: order confirmations and updates, account messages and newsletter sign-up confirmations. Resend receives the recipient''s address and the content of the message.
- **InPost sp. z o.o.**, based in Kraków – delivery of parcels by courier and to InPost Paczkomat parcel lockers. When we send a parcel, we give InPost your first and last name, the delivery address or the chosen parcel locker, your telephone number and your e-mail address. When you search for a parcel locker at checkout, your browser fetches the list of lockers in the town you enter directly from InPost''s servers.
- **Google** – if you sign in with a Google account, Google confirms your identity and gives us the data described in the account section, acting as a separate controller. The Stripe payment form loads a font from Google Fonts, so Google then receives your device''s IP address.
- **CARTO** – your browser loads the map in the parcel locker picker from CARTO''s servers, which then receive your device''s IP address and the part of the map you are viewing.

Where the law requires it, we disclose data to authorised public authorities, such as tax authorities. We do not sell personal data or share it for advertising.

## Transfers outside the European Economic Area

Some recipients process data in the United States. Stripe transfers data to Stripe, Inc. in the US, and Resend, Inc. is based in the US. Cloudflare, Inc. is also based in the US and handles traffic in data centres around the world, including outside the European Economic Area.

Transfers to the US rely on Commission Implementing Decision (EU) 2023/1795 of 10 July 2023 on the adequate level of protection of personal data under the EU-US Data Privacy Framework (Article 45 GDPR) for recipients that take part in that framework, and otherwise on the standard contractual clauses adopted by the European Commission (Article 46(2)(c) GDPR). You can find the list of participants at [dataprivacyframework.gov](https://www.dataprivacyframework.gov). You can obtain a copy of the standard contractual clauses by writing to us.

Google processes data when you sign in with a Google account and when fonts are loaded as a separate controller, also in the US, under the [Google privacy policy](https://policies.google.com/privacy).

## How long we keep data

We keep data for the following periods:

- orders, payments and the data in them – 5 years from the end of the calendar year in which the order was placed, as accounting and tax law requires; deleting your account does not shorten this period,
- account data – until the account is deleted, which you can do at any time in its settings or by asking us,
- orders started at checkout but not paid because they were abandoned, the payment failed or they expired, together with the e-mail address, telephone number and addresses given in them – 30 days after they end,
- the activity log of signed-in customers (pages visited, cart events and IP addresses) – 90 days,
- sign-in history – 12 months,
- the shop''s administrative event log, such as changes to orders and e-mails sent – 2 years,
- unconfirmed newsletter sign-ups – 30 days, and the data of people who have unsubscribed from the newsletter – 30 days after unsubscribing,
- sign-in sessions, verification links, password reset links and request and e-mail counters – until they expire, after which we delete them; counters of IP addresses expire after a minute and counters of e-mail addresses after an hour.

## Cookies and other data stored in your browser

The shop stores the cookies and data described below in your browser. We do not use advertising cookies or third-party analytics tools.

### The shop''s cookies

- `marte_locale` – remembers the language version of the shop you chose; 1 year.
- `__Secure-better-auth.session_token` – keeps you signed in; 7 days, extended while you use the shop and deleted when you sign out.
- `__Secure-better-auth.session_token_multi-…` – a copy of the session token saved at each sign-in, one for each account signed in on this browser; 7 days, extended as above and deleted when you sign out.
- `__Secure-better-auth.state` – protects signing in with Google against forged requests; 5 minutes.
- `__Secure-better-auth.two_factor` – links the steps of signing in with two-factor authentication; 10 minutes.
- `__Secure-better-auth.trust_device` – remembers a device when you tick that you trust it during two-factor authentication; 30 days.
- `sidebar_state` – only in the shop''s administration panel: remembers whether the side menu is collapsed; 1 year.

### Browser storage

Data in local storage (localStorage) stays in your browser until the shop or you delete it. Data in session storage (sessionStorage) disappears when you close the tab.

- `marte-cart` (localStorage) – the contents of your cart: products, variants, quantities and prices; the cart is emptied once you place an order.
- `marte-checkout-session` (localStorage) – the identifier of the open payment and a fingerprint of the cart contents, so that when you come back to the tab you finish the same payment instead of starting a new one; deleted once you place the order or the payment closes.
- `marte-checkout-draft` (sessionStorage) – what you have typed at checkout, so that it is not lost when you reload the page; until you close the tab or place the order.
- `customer-activity:page-view:…` and `customer-activity:cart-abandoned-sent` (sessionStorage) – only while you are signed in: mark the pages and cart events already recorded in the activity log so that they are not recorded twice; until you close the tab.
- `sidebar_state`, `marte:datagrid:v1:…` and `admin-sheet-width:…` (localStorage) – only in the shop''s administration panel: the layout of menus, tables and panels.

### Stripe

At the payment step of the checkout and when you add a card in your account, the Stripe script loads. It stores fraud prevention cookies on the shop''s domain: `__stripe_mid` for 1 year and `__stripe_sid` for 30 minutes. The payment form runs in frames from Stripe''s domains, where Stripe may store its own data under the [Stripe privacy policy](https://stripe.com/privacy).

### Cloudflare Turnstile

When you sign up, ask for a password reset, ask for a new verification link, subscribe to the newsletter and go to payment, the Cloudflare Turnstile check loads in a frame from challenges.cloudflare.com. It checks signals from your browser and device to tell people from bots and gives the form a one-time token valid for 5 minutes. The data Turnstile processes is described in the [Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/).

You can delete or block cookies and site data at any time in your browser settings. Without them, signing in, the cart and placing orders will not work.

## Your rights

You have the right to:

- access your data and receive a copy of it (Article 15 GDPR),
- have your data rectified (Article 16 GDPR),
- have your data erased (Article 17 GDPR), unless we must keep it, for example in our accounting records,
- restrict processing (Article 18 GDPR),
- receive the data you gave us so that you can transfer it, where we process it on the basis of a contract or consent (Article 20 GDPR),
- object to processing based on our legitimate interest (Article 21 GDPR),
- withdraw your consent at any time, without affecting the lawfulness of processing before the withdrawal (Article 7(3) GDPR).

You can also view and correct your account data yourself in its settings, and delete your account. To exercise your other rights, write to us at [kontakt@martebizuteria.pl](mailto:kontakt@martebizuteria.pl) or by post. We will reply without undue delay and within one month at the latest. Where requests are particularly complex or numerous, this period may be extended by two months, and we will tell you if it is.

### Complaint to the supervisory authority

If you believe we process your data unlawfully, you can lodge a complaint with the President of the Personal Data Protection Office (Prezes Urzędu Ochrony Danych Osobowych), ul. Stawki 2, 00-193 Warszawa, Poland ([uodo.gov.pl](https://uodo.gov.pl)).

## Automated decision-making

We do not make decisions about you based solely on automated processing, including profiling, that produce legal effects concerning you or similarly significantly affect you. Stripe may automatically decline a payment that its systems judge to be risky. You can then try to pay again or write to us.

## Changes to this privacy policy

When we change how we process data, we will update this policy. The date of the last change is shown at the top of the page.'),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1791626400000, '$."en-US"', 1791626400000),
  `updated_at` = 1791626400000
WHERE `handle` = 'privacy-policy'
  AND json_extract(`bodies`, '$."pl-PL"') = '## Administrator danych

Administratorem danych osobowych w serwisie M''Arte jest Pyciak Mariusz Firma Jubilerska, ul. Wąska 11, 32-700 Bochnia, NIP 8681772646, e-mail: [kontakt@martebizuteria.pl](mailto:kontakt@martebizuteria.pl).

## Dlaczego przetwarzamy Twoje dane?

Dane przetwarzane są zgodnie z RODO w następujących celach:

- realizacji usług sprzedaży biżuterii i zamówień indywidualnych (art. 6 ust. 1 lit. b RODO) — przetwarzanie trwa do wygaśnięcia roszczeń, liczonych od chwili usunięcia konta lub zrealizowania usługi,
- realizacji obowiązków prawnych, podatkowych i skarbowych (art. 6 ust. 1 lit. c RODO),
- ochrony i egzekucji roszczeń jako prawnie usprawiedliwiony interes (art. 6 ust. 1 lit. f RODO),
- odpowiadania na pytania kierowane e-mailem lub telefonicznie jako uzasadniony interes (art. 6 ust. 1 lit. f RODO),
- marketingu i promocji produktów jako uzasadniony interes (art. 6 ust. 1 lit. f RODO),
- funkcjonowania strony poprzez pliki cookies (art. 6 ust. 1 lit. f RODO).

Dla kontrahentów dodatkowo:

- realizacji zawartych umów i ochrony roszczeń (art. 6 ust. 1 lit. b i f RODO),
- weryfikacji tożsamości w rejestrach publicznych (art. 6 ust. 1 lit. b i f RODO).

## Komu udostępniamy dane?

- dostawcom usług IT, hostingu, marketingu i płatności oraz pracownikom,
- radcom prawnym, adwokatom, operatorom pocztowym i dostawcom usług płatniczych.

## Jakie przysługują Ci prawa?

- prawo dostępu do danych (art. 15 RODO),
- prawo do sprostowania danych (art. 16 RODO),
- prawo do żądania usunięcia danych (art. 17 RODO),
- prawo do ograniczenia przetwarzania (art. 18 RODO),
- prawo do przenoszenia danych (art. 20 RODO),
- prawo do cofnięcia zgody,
- prawo do sprzeciwu wobec przetwarzania (art. 21 RODO),
- prawo skargi do Prezesa Urzędu Ochrony Danych Osobowych.

## Jakie informacje zbieramy za pomocą plików cookies?

- adres IP urządzenia,
- typ urządzenia,
- czas przebywania na stronie,
- podjęte czynności na stronie,
- lokalizację połączenia.'
  AND json_extract(`bodies`, '$."en-US"') = '## Data controller

The controller of personal data in the M''Arte store is Pyciak Mariusz Firma Jubilerska, ul. Wąska 11, 32-700 Bochnia, Poland, NIP 8681772646, e-mail: [kontakt@martebizuteria.pl](mailto:kontakt@martebizuteria.pl).

## Why do we process your data?

Data is processed in accordance with the GDPR for the following purposes:

- to provide jewellery sales services and fulfil bespoke orders (Article 6(1)(b) GDPR) — processing continues until claims expire, counted from the moment an account is deleted or a service is completed,
- to meet legal, tax and fiscal obligations (Article 6(1)(c) GDPR),
- to protect and enforce claims as a legitimate interest (Article 6(1)(f) GDPR),
- to answer questions sent by e-mail or asked by telephone as a legitimate interest (Article 6(1)(f) GDPR),
- for the marketing and promotion of products as a legitimate interest (Article 6(1)(f) GDPR),
- to operate the website through cookies (Article 6(1)(f) GDPR).

Additionally, for business partners:

- to perform concluded contracts and protect claims (Article 6(1)(b) and (f) GDPR),
- to verify identity in public registers (Article 6(1)(b) and (f) GDPR).

## Who do we share data with?

- providers of IT, hosting, marketing and payment services, and our staff,
- legal advisers, attorneys, postal operators and payment service providers.

## What rights do you have?

- the right of access to your data (Article 15 GDPR),
- the right to rectification (Article 16 GDPR),
- the right to erasure (Article 17 GDPR),
- the right to restriction of processing (Article 18 GDPR),
- the right to data portability (Article 20 GDPR),
- the right to withdraw consent,
- the right to object to processing (Article 21 GDPR),
- the right to lodge a complaint with the President of the Personal Data Protection Office.

## What information do we collect through cookies?

- the device IP address,
- the device type,
- time spent on the site,
- actions taken on the site,
- the location of the connection.';
