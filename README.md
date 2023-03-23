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
- `Queue.ts` oraz `ImageDB.ts` - oba pliki skupiają się na obsłudze baz danych. Obydwie bazy są w tej implementacji bazami sqlite3. Bazy mogłby zostać połączone w jedną, ale uznałem, że pozostawienie ich osobno umożliwia docelowo migracje w inne miejsca bazy obrazków, która po czasie może być ogromna, oraz bazy procesów, używanej jedynie do zapewnienia odporności na restarty aplikacji. Klasa w pliku `ImageDB.ts` zawiera metodę pozwalającą na bezpośrednie pobranie obrazka z internetu i zapisanie go na dysku oraz w bazie.
- `AutoProcessQueue.ts` - zawiera klasę, która wykorzystuje `Queue.ts` do implementacji automatycznej kolejki zadań. Kolejka po uruchomieniu wyciąga po jednym elemencie z kolejki i uruchamia na nim metodę do pobierania obrazków z `ImageDB.ts`. Automatyczne wyciąganie działa aż do opróżnienia kolejki i jest na nowo uruchamiane przy włożeniu elementu do pustej kolejki.
- folder `models` zawiera dwa interfejsy reprezentujące obrazek oczekujący na pobranie (zawiera tylko url źródła i datę dodania) oraz pobrany obrazek ze wszystkimi informacjami zwracanymi przez endpoint "/details"
- dodatkowo jest też w projekcie kilka plików `.test.js`, zawierających testy dla frameworka `jest`. Nie są one wyczerpującymi testami funkcjonalności, jedynie kilkoma prostymi testami na potrzeby sprawdzenia działania poszczególnych komponentów na wczesnym etapie pisania aplikacji, jednak nie widzę potrzeby, żeby je usuwać, mimo braku wymagania ich w specyfikacji. Testy tworzą i usuwają własne pliki baz danych, w celu nieingerowania w rzeczywiste bazy oraz umożliwienia równoległego uruchomiania różnych testów.

Aplikacja obsługuje błędy związane z celowym lub przypadkowym wprowadzaniem błędnych danych w zapytaniach, błędy związane z niepowodzeniem zapytań, oraz inne błędy mogące wystąpić przy jej poprawnym funkcjonowaniu.  
Aplikacja nie obsługuje bezpośrednio wyjątków, które sugerują błędy w jej własnym działaniu (np. wystąpienie błędu sql o zduplikowanym indeksie jest możliwe tylko wtedy, jeśli kod w index.ts weryfikujący otrzymane dane nie działa poprawnie, więc wystąpienie takiego błędu nie jest dodatkowo obsługiwane przy samym zapytaniu).
