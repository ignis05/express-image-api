# Usługa do pobierania obrazków

## Uruchamianie

Najpierw należy pobrać pakiety poleceniem `npm i`.  
Następnie program można uruchomić kompilując typescript poleceniem `npm run build`, przechodząc do folderu `dist` i uruchamiając plik wejściowy przez `node index.js`.  
Alternatywnie, program można uruchomić od razu poleceniem `npm run start`, jednak wymaga to posiadania zainstalowanego globalnie pakietu `ts-node`.

Program uruchamia się na porcie 3000, w przypadku konieczności zmiany portu należy zmodyfikować zmienną `const port` na początku pliku `index.ts`.

## API

- `GET /image/<id>` - odsyła odpowiedni obrazek, lub błąd 404
- `GET /details/<id>` - odsyła json zawierający źródłowy url, lokalny url oraz daty dodania i pobrania obrazka. Daty podane są w formie milisekund od epoki Unixa. W przypadku nieistniejącego "id" odsyła błąd 404.
- `GET /check/<id>` - odsyła json zwierający informacje czy dany obrazek został już pobrany. Json zawiera "status" ustawiony na "waiting" lub "downloaded", oraz w drugim z przypadków pole "url" z lokalnym odnośnikiem do obrazka.
- `POST /add` - wymaga przesłania w body jsona z parametrem "url". W przypadku braku parametru lub niepoprawnego adresu url odsyła błąd 400. Dla poprawnego url odsyła json z linkiem do endpointu "/check" w parametrze "check_url".
- `GET /list?[count=c]&[offset=o]` - przyjmuje opcjonalne parametry "count" i "offset" jako querystring. Domyślne wartości przy braku ich podania to count=5 i offset=0. Odsyła listę obiektów z endpointu "/details" o długości równej "count", lub mniejszej w przypadku zbyt małej liczby pobranych obrazków. Parametr "offset" pozwala na ustawienie przesunięcia otrzymanej listy względem całości danych, co pozwala przeglądać całą listę w kawałkach o dowolnym rozmiarze.

## Struktura aplikacji

- `index.ts` - wejściowy plik aplikacji, skupiający się na serwerze http
- `ProcessQueue.ts` - plik obsługujący kolejkę zadań. Operuje na własnej bazie danych, automatycznie wyciąga swoją zawartość element po elemencie, wywołuje dla każdego z nich ustawioną funkcję, po czym usuwa z kolejki.
- `ImageDB.ts`- plik obsługujący bazę danych obrazków. Operuje na bazie oddzielnej od bazy wykorzystywanej przez kolejkę, ze względu na potencjalny rozmiar tej bazy i potrzebę zastosowania innych rozwiązań przy dużej skali. Posiada metodę, która na podstawie url pobiera obrazek na dysk oraz dodaje jego detale do swojej bazy. Metoda ta jest podawano do kolejki procesu, jako funkcja dla każdego elementu.
- folder `models` zawiera dwa interfejsy reprezentujące obrazek oczekujący na pobranie (zawiera tylko url źródła i datę dodania) oraz pobrany obrazek ze wszystkimi informacjami zwracanymi przez endpoint "/details"
- dodatkowo jest też w projekcie kilka plików `.test.js`, zawierających testy dla frameworka `jest`. Nie są one wyczerpującymi testami funkcjonalności, jedynie kilkoma prostymi testami na potrzeby sprawdzenia działania poszczególnych komponentów na wczesnym etapie pisania aplikacji, jednak nie widzę potrzeby, żeby je usuwać, mimo braku wymagania ich w specyfikacji. Testy tworzą i usuwają własne pliki baz danych, w celu nieingerowania w rzeczywiste bazy oraz umożliwienia równoległego uruchomiania różnych testów.

Aplikacja obsługuje błędy związane z celowym lub przypadkowym wprowadzaniem błędnych danych w zapytaniach, błędy związane z niepowodzeniem zapytań, oraz inne błędy mogące wystąpić przy jej poprawnym funkcjonowaniu.  
Aplikacja nie obsługuje bezpośrednio wyjątków, które sugerują błędy w jej własnym działaniu (np. wystąpienie błędu sql o zduplikowanym indeksie jest możliwe tylko wtedy, jeśli kod w index.ts weryfikujący otrzymane dane nie działa poprawnie, więc wystąpienie takiego błędu nie jest dodatkowo obsługiwane przy samym zapytaniu).
