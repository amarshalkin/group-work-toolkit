# Дизайн: плагин `lecture-artifacts` и реструктуризация маркетплейса в `pedsovet`

- **Дата:** 2026-04-26
- **Автор:** Артём Маршалкин (через Claude Code, brainstorming)
- **Статус:** утверждён к реализации

## 1. Контекст

В папке `методика/prototype/final/` лежат 7 готовых HTML-страниц + общий лендинг `index.html`. Каждая страница — самостоятельный mobile-first артефакт под конкретную лекцию весеннего педсовета 2026 (Бризицкий, Басюк, Калашников и т. д.). У всех 7 страниц одинаковая архитектура: вёрстка + блок `const DATA = { ... }` со встроенными подсказками-комментариями по формату полей.

Текущий маркетплейс лежит в `group-work-toolkit/` (git remote `amarshalkin/group-work-toolkit`) и содержит ровно один плагин — `group-work-toolkit` в корне маркетплейса.

**Задача:** превратить эти 7 страниц в шаблоны нового плагина, который по slash-команде и приложенной расшифровке лекции собирает страницу с заполненными данными, опционально публикует через `knottasoft:host-html` и возвращает URL+QR. Параллельно — переименовать маркетплейс в `pedsovet`, перенести существующий плагин в подпапку и добавить новый плагин рядом.

## 2. Цели

- Каждая из 7 страниц становится переиспользуемым шаблоном — название и идентификатор шаблона функциональны (что страница делает по механике), а не привязаны к конкретной лекции.
- Пользователь подаёт расшифровку как файл (`.md`/`.txt`/`.docx`) и одной slash-командой получает собранную HTML-страницу.
- Если установлен плагин `knottasoft:host-html` — страница автоматически публикуется, пользователь получает URL и QR. Если не установлен — только локальное сохранение, без отказов.
- Общий контекст события (название, период, программа лекций) хранится в проектном `.claude/lecture-artifacts.local.md` и делится между всеми командами плагина.
- Команда `/event-landing` собирает главную страницу комплекта из реально существующих собранных артефактов.
- Маркетплейс переименован в `pedsovet`, GitHub-репозиторий тоже переименован, существующий плагин `group-work-toolkit` сохраняет имя и переезжает в подпапку.

## 3. Не-цели (out of scope этой версии)

- Перевёрстка 7 страниц под новые лекции — это уже сделанная разработчиком вёрстки работа; мы только переносим их под новые имена и расставляем event-маркеры.
- Кастомизация бренд-палитры через `/init` (поле `brand.primary` сохраняем, но в шаблоны в первом релизе не подставляем).
- Мультиязычность (всё остаётся на русском).
- Редактирование уже опубликованных страниц через `knotta-host-html:host-edit`.

## 4. Высокоуровневая архитектура (Подход A — «тонкие команды + общий движок»)

- **9 slash-команд** (тонкие, по 15–25 строк): `init`, 7 шаблонов, `event-landing`. Каждая делегирует в общий скилл.
- **3 скилла:** `event-init`, `lecture-artifact-build`, `event-landing-build`.
- **8 шаблонов в `templates/`:** 7 функциональных + `event-landing`. Каждый — папка с `template.html`, `schema.md`, `example-data.json`.
- **Один Node-скрипт `scripts/inject-data.mjs`** — без зависимостей. Делает три замены в HTML: блок `const DATA`, event-маркеры в шапке/футере, `<title>`. Тестируется отдельно golden-снапшотами.
- **Источник истины состояния события** — `.claude/lecture-artifacts.local.md` в проекте пользователя.

## 5. Реструктуризация маркетплейса

### 5.1 Целевая структура

```
pedsovet/                              ← маркетплейс, GitHub repo amarshalkin/pedsovet
├── .claude-plugin/
│   └── marketplace.json               ← name: "pedsovet", два плагина
├── group-work-toolkit/                ← плагин #1 (переезжает из корня в подпапку)
│   ├── .claude-plugin/plugin.json     ← name: "group-work-toolkit"
│   ├── commands/, skills/, evals/, references/, README.md, CHANGELOG.md
└── lecture-artifacts/                 ← плагин #2 (новый)
    ├── .claude-plugin/plugin.json
    ├── commands/, skills/, templates/, scripts/, references/, README.md, CHANGELOG.md
```

### 5.2 Шаги локальной миграции

1. `mv group-work-toolkit/ pedsovet/` (переименовать корневую папку).
2. Внутри `pedsovet/` создать подпапку `group-work-toolkit/` и перенести в неё всё содержимое старого плагина: `commands/`, `skills/`, `evals/`, `references/`, `assets/` (если есть), `README.md`, `CHANGELOG.md`. Также перенести `.claude-plugin/plugin.json` в `pedsovet/group-work-toolkit/.claude-plugin/plugin.json`.
3. В `pedsovet/.claude-plugin/marketplace.json` оставить только манифест маркетплейса, переписать с новым именем и двумя плагинами:
   ```json
   {
     "name": "pedsovet",
     "owner": { "name": "Artem Marshalkin", "email": "artem.marshalkin@gmail.com", "url": "https://github.com/amarshalkin" },
     "metadata": { "description": "...", "version": "1.0.0" },
     "plugins": [
       { "name": "group-work-toolkit", "source": "./group-work-toolkit", ... },
       { "name": "lecture-artifacts",  "source": "./lecture-artifacts",  ... }
     ]
   }
   ```
4. Создать каркас `pedsovet/lecture-artifacts/` (см. §6).

### 5.3 Шаги переименования GitHub

1. `gh repo rename pedsovet -R amarshalkin/group-work-toolkit` (GitHub автоматически держит редирект со старого URL).
2. В локальном клоне: `git remote set-url origin https://github.com/amarshalkin/pedsovet.git`.
3. Bump версий:
   - Маркетплейс `pedsovet`: `1.0.0` (breaking — новое имя/структура).
   - Плагин `group-work-toolkit`: `0.10.0 → 0.10.1` (без логических изменений, только переезд).
   - Плагин `lecture-artifacts`: `0.1.0` (первый релиз).
4. В `CHANGELOG.md` маркетплейса описать миграцию для пользователей, подключивших старый URL.

## 6. Структура плагина `lecture-artifacts`

```
lecture-artifacts/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── init.md                          ← /init [program-file]
│   ├── diagnostic-quiz.md               ← /diagnostic-quiz <transcript>
│   ├── parameter-dashboard.md
│   ├── case-matcher.md
│   ├── pick-and-plan.md
│   ├── scenario-cards.md
│   ├── step-builder.md
│   ├── manifesto.md
│   └── event-landing.md                 ← /event-landing
├── skills/
│   ├── event-init/
│   │   └── SKILL.md
│   ├── lecture-artifact-build/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── injection-protocol.md
│   │       ├── transcript-to-data.md
│   │       └── host-integration.md
│   └── event-landing-build/
│       └── SKILL.md
├── templates/
│   ├── diagnostic-quiz/
│   │   ├── template.html                ← базируется на final/01-frontier-map/index.html
│   │   ├── schema.md
│   │   └── example-data.json
│   ├── parameter-dashboard/             ← база: final/02-digital-environment
│   ├── case-matcher/                    ← база: final/03-world-map
│   ├── pick-and-plan/                   ← база: final/04-seven-masterclasses
│   ├── scenario-cards/                  ← база: final/05-values-atlas
│   ├── step-builder/                    ← база: final/06-lesson-constructor
│   ├── manifesto/                       ← база: final/07-manifesto
│   └── event-landing/                   ← база: final/index.html
├── scripts/
│   ├── inject-data.mjs                  ← Node ESM, без зависимостей
│   ├── parse-program.mjs                ← md/yaml/json → нормализованная программа
│   └── tests/
│       ├── inject-data.test.mjs         ← golden snapshots на каждый шаблон
│       └── fixtures/
├── references/
│   ├── adding-new-template.md
│   ├── event-config-format.md
│   └── template-mapping.md              ← старое→новое (см. §10)
├── README.md
└── CHANGELOG.md
```

**Принцип progressive disclosure:** `SKILL.md` ≤ 200 строк с ядром процесса; глубокие детали — в `references/`.

## 7. Маппинг имён шаблонов и команд

| # | Текущая папка `final/`     | id шаблона / slash-команда | Назначение                                      |
|---|----------------------------|----------------------------|-------------------------------------------------|
| 1 | `01-frontier-map`          | `diagnostic-quiz`          | Квиз-самодиагностика с уровнями и радар-картой   |
| 2 | `02-digital-environment`   | `parameter-dashboard`      | Панель параметров со шкалой и дорожной картой    |
| 3 | `03-world-map`             | `case-matcher`             | Сравнительные кейсы + квиз-подбор                |
| 4 | `04-seven-masterclasses`   | `pick-and-plan`            | Каталог → выбор N → план действий                |
| 5 | `05-values-atlas`          | `scenario-cards`           | Тематические карточки с готовым сценарием        |
| 6 | `06-lesson-constructor`    | `step-builder`             | Пошаговый ветвящийся конструктор                 |
| 7 | `07-manifesto`             | `manifesto`                | Пронумерованные тезисы с цитатой и действием     |
| – | `index.html`               | `event-landing`            | Лендинг события с карточками артефактов          |

При создании плагина текущие `final/<old>/index.html` копируются в `templates/<new>/template.html` с разовой разметкой event-маркеров (см. §9.2).

## 8. Команда `/init` и `.claude/lecture-artifacts.local.md`

### 8.1 Поток `/init [program-file]`

1. Если аргумент дан — читает файл, прогоняет через `scripts/parse-program.mjs`. Поддерживаются md/yaml/json; скилл `event-init` нормализует структуру.
2. Если файла нет — `AskUserQuestion`: «приложите программу как файл / введу вручную / у меня нет программы».
3. Из распарсенной программы извлекает что нашлось: название события, период (мин/макс дата), список лекций с порядковыми номерами.
4. **Добирает недостающее** через `AskUserQuestion`, по одному вопросу:
   - Название события
   - Месяц/год для шапки (если не выводится из дат)
   - Слаг папки output (default — транслит названия)
   - Локация (опционально)
   - Для каждой лекции без `template` — какой из 7 шаблонов использовать
5. Записывает `.claude/lecture-artifacts.local.md`.
6. Создаёт пустую папку `<cwd>/<output_dir>/`.
7. Печатает сводку: «событие зафиксировано, X лекций, Y шаблонов назначено».

**Принцип:** init принимает программу первой; вопросы задаются только за тем, что не удалось извлечь.

### 8.2 Формат `.claude/lecture-artifacts.local.md`

```markdown
---
event:
  name: "Весенний педсовет"
  short: "Педсовет"
  month_year: "Апрель 2026"
  location: "..."
  output_dir: "lecture-artifacts/spring-2026"
  brand:
    primary: "#3E529B"
  landing_output: null              # путь к собранному index.html
  landing_url: null                 # URL после публикации
  landing_qr: null
program:
  - n: 1
    template: diagnostic-quiz
    lecturer: "Дмитрий Бризицкий"
    title: "ИИ: современный фронтир"
    date: "2026-04-28 17:00"
    hall: "большой зал"
    transcript: null                # путь к расшифровке после прогона
    output: null                    # абсолютный путь к собранному HTML
    published_url: null             # URL после host-html
    qr: null                        # путь/URL к QR
    built_at: null
  - n: 2
    template: parameter-dashboard
    ...
host_html:
  enabled: auto                     # auto | always | never
created_at: "2026-04-26T18:00:00Z"
updated_at: "2026-04-26T18:00:00Z"
---

# Весенний педсовет 2026

(произвольные заметки, ссылки, контакты — не парсятся)
```

**Файл — единственный источник истины.** Команды шаблонов читают и обновляют его. В гит не коммитится (стандартный паттерн `*.local.md`).

### 8.3 Fallback без init

Команда шаблона, не находя `.local.md`, спрашивает по минимуму (название события + месяц/год + порядковый номер лекции в программе) и пишет ответы в свежий `.local.md`. Следующая команда уже видит контекст.

## 9. Поток шаблон-команды и протокол подстановки

### 9.1 Поток `/{template-id} <transcript>`

1. **Загрузка контекста.** Читает `.claude/lecture-artifacts.local.md`. Если нет — fallback (§8.3).
2. **Идентификация лекции.** Если в программе несколько лекций с этим шаблоном — `AskUserQuestion` «к какой лекции?». Если одна — берёт её. Получает `n`, `lecturer`, `title`, `date`, `hall`.
3. **Чтение расшифровки.** Принимает `.md`/`.txt`/`.docx`. Claude извлекает текст через встроенную поддержку `Read`/`anthropic-skills:docx`.
4. **Загрузка схемы.** Читает `templates/<id>/schema.md` — описание полей + JSON Schema.
5. **Генерация JSON.** Claude в контексте скилла генерирует данные по schema. Жёсткие constraints (например «ровно 12 вопросов × 4 варианта × балл 0–3») берутся из schema. Общие поля (`lecturer`, `lectureTitle`, `date`) подставляются из программы — Claude их не выдумывает.
6. **Валидация.** `node scripts/inject-data.mjs --validate <data.json> <template>`. При ошибке скилл корректирует JSON и повторяет один раз.
7. **Подстановка.** `node scripts/inject-data.mjs <template.html> <data.json> <event-fields.json> <output.html>`.
8. **Sanity-check (опционально).** Если установлен `knottasoft:host-html` — пробует вызвать Skill `knotta-host-html:host-doctor`. Недоступен — пропускает шаг.
9. **Публикация (опционально).** Если `host_html.enabled` ≠ `never` И Skill `knotta-host-html:host-html` доступен — вызывает, получает URL и QR. Если плагин не найден — выводит подсказку «установите `knottasoft:host-html` для авто-публикации». Локальное сохранение работает всегда.
10. **Запись результата.** HTML кладётся в `<cwd>/<output_dir>/<n>-<template>.html`. QR — рядом как `<n>-<template>.qr.svg` (если хост вернул локальный файл) или URL пишется в `.local.md`. Обновляются поля записи в `program[]`: `transcript`, `output`, `published_url`, `qr`, `built_at`. Обновляется `updated_at` в корне.
11. **Ответ пользователю.** Краткий блок: путь к файлу, URL (если есть), QR (если есть), 1-строчная самооценка качества данных («покрыто 11/12 вопросов из расшифровки, 1 заполнен типовым»).

### 9.2 Протокол подстановки (`scripts/inject-data.mjs`)

Скрипт делает три замены в `template.html`:

**(а) Блок данных.** Находит участок между маркерами:

```js
/* ════════════════════════════════════════════════════════════════════════
   DATA — обновляется после расшифровки лекции (ТОЛЬКО этот объект).
   ════════════════════════════════════════════════════════════════════════ */
const DATA = { ... };
```

Регексп: `/(\/\* ═+\s+DATA — .*?═+ \*\/\s*\n)const DATA = \{[\s\S]*?\n\};/m`. Заменяет на свежий `const DATA = ${JSON.stringify(data, null, 2)};` с тем же блоком-якорем сверху.

**(б) Event-маркеры в шапке и футере.** Шаблон содержит размеченные участки:

```html
<!-- evt:event-name -->Весенний педсовет<!-- /evt -->
<!-- evt:lecture-num -->01<!-- /evt -->
<!-- evt:act-title -->АКТ I · КАРТА ИИ-ФРОНТИРА 2026<!-- /evt -->
<!-- evt:month-year -->апрель 2026<!-- /evt -->
```

Скрипт заменяет содержимое между парами маркеров на значения из `event-fields.json` (`event.name`, `lecture.n`, `lecture.title`, `event.month_year` и т.д.). **Это требует разовой подготовки шаблонов** — добавить маркеры в нужные места `final/<old>/index.html`. Это часть работы по приведению final-страниц к виду templates.

**(в) `<title>` и шапка-комментарий HTML.** Заменяются по тем же event-полям.

**Преимущество подхода:** `template.html` остаётся валидным HTML — открыл в браузере, увидел «Педсовет, ИИ-фронтир» с примерными данными в DATA. Команда заменяет точечно три участка, вёрстка не трогается.

**Зависимости скрипта:** только Node ≥ 18, без npm. Тесты на `node --test`.

## 10. Команда `/event-landing` и интеграция с host-html

### 10.1 Поток `/event-landing`

1. Читает `.local.md`. Если нет — отказ «сначала запустите /init».
2. Сканит `<output_dir>/` — находит реально существующие `<n>-<template>.html` и `<n>-<template>.qr.svg`. Сверяет с тем, что записано в `.local.md` в `program[].output` / `program[].qr`. При расхождениях — берёт реальное состояние диска.
3. Для каждой лекции собирает карточку: `n`, `template`, `lecturer`, `title`, `date`, `hall`. Ссылка карточки — `published_url` если есть, иначе локальный путь `output`. Метка «локально, не опубликовано» — для карточек без `published_url`. Карточка без `output` показывается как «в работе».
4. Подгружает `templates/event-landing/template.html` и `schema.md`. Schema лендинга — фиксированная структура `{event, program[]}`; ничего из расшифровок не извлекается.
5. Подстановка через `inject-data.mjs` (тот же механизм: блок DATA + event-маркеры).
6. Кладёт результат в `<cwd>/<output_dir>/index.html`. Записывает путь в `event.landing_output`.
7. Если `knotta-host-html` доступен — публикует, пишет URL+QR в `event.landing_url` / `event.landing_qr`. Иначе — только локально.
8. Ответ: путь, опционально URL, опционально QR, плюс сводка «X из Y артефактов опубликованы».

**Идемпотентность:** команда перезапускается после каждого нового артефакта — лендинг пересобирается с актуальным набором карточек.

### 10.2 Интеграция с `knottasoft:host-html` (try-call паттерн)

В Claude Code один плагин не может «программно» спросить, установлен ли другой. Используем попытку вызова:

1. Скилл `lecture-artifact-build` пытается вызвать Skill с именем `knotta-host-html:host-html`, передавая путь к собранному файлу.
2. Если Skill-инструмент возвращает «skill not found» — ловим, считаем хост недоступным, идём в локальное сохранение.
3. Если Skill вернул URL+QR — пишем их в `.local.md` и в ответ пользователю.

Аналогично для `host-doctor`. Контракт зафиксирован в `references/host-integration.md` плагина — на случай изменения интерфейса host-html.

## 11. Тестирование

1. **`scripts/inject-data.mjs`.** Golden-snapshot на чистом `node --test` для каждого из 8 шаблонов: `template.html + example-data.json + example-event.json → expected-output.html`. CI: `node --test scripts/tests/`.
2. **Schema-валидация.** Для каждого шаблона `example-data.json` валиден против JSON Schema из `schema.md`.
3. **`scripts/parse-program.mjs`.** Тесты на разные форматы программы (md, yaml, json) и битые входы.
4. **Smoke end-to-end.** В `evals/` плагина — синтетическая расшифровка для каждого шаблона + ожидаемый собранный HTML. Запускается вручную перед релизом.
5. **host-html sanity (ручной).** Если `knotta-host-html` доступен — `/host-doctor` на каждом из 8 примеров.

## 12. Риски и митигации

| Риск | Митигация |
|------|-----------|
| Якорь `const DATA = {...}` в шаблоне сломан правкой вёрстки | `inject-data.mjs --validate` падает с понятной ошибкой; в `references/adding-new-template.md` зафиксирован контракт «не трогать формат якоря» |
| Расшифровка короткая / не покрывает все поля schema | Скилл `lecture-artifact-build` помечает в JSON `_quality_note` для пустых полей; в ответ пользователю выводит «X/Y полей покрыто расшифровкой, остальное — типовое» |
| GitHub repo rename ломает старые подключения маркетплейса | GitHub держит редирект автоматически; в `CHANGELOG.md` маркетплейса прописана нота миграции |
| `host-html` Skill изменит интерфейс | Контракт в `references/host-integration.md`; при breaking-change пользователь видит понятное сообщение, локальное сохранение работает всегда |
| Кириллический output_dir ломает пути на Windows | Транслит при инициализации (`/init` нормализует event-slug) |
| `parse-program.mjs` не справился с произвольным форматом | Fallback на `AskUserQuestion`; пользователь может вручную поправить `.local.md` |
| Расхождение между `.local.md` и реальным состоянием диска | `/event-landing` берёт реальное состояние диска как авторитетное и обновляет `.local.md` |

## 13. Высокоуровневый порядок реализации

(Детальный пошаговый план — отдельным документом через `superpowers:writing-plans`.)

1. Реструктуризация маркетплейса: переезд `group-work-toolkit/` → `pedsovet/group-work-toolkit/`, новый `marketplace.json`, переименование GitHub-репозитория.
2. Каркас плагина `lecture-artifacts`: `plugin.json`, пустые `commands/`, `skills/`, `templates/`, `scripts/`.
3. `scripts/inject-data.mjs` + тесты на чистом `node --test`. Сначала движок — он самый надёжный фундамент.
4. Подготовка одного шаблона (например `manifesto` — самый простой) end-to-end: `template.html` с маркерами, `schema.md`, `example-data.json`, golden-снапшот.
5. Скилл `lecture-artifact-build` + одна команда (`/manifesto`) — проверяем поток на самом простом шаблоне.
6. `event-init` + `/init` + формат `.local.md` + `parse-program.mjs`.
7. Остальные 6 шаблонов по очереди от простых к сложным: `pick-and-plan`, `scenario-cards`, `case-matcher`, `parameter-dashboard`, `step-builder`, `diagnostic-quiz`.
8. `event-landing-build` + `/event-landing`.
9. Try-call интеграция с `knottasoft:host-html` (host-doctor + host-html).
10. README, CHANGELOG, references, smoke-evals, релиз.
