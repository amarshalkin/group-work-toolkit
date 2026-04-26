# Schema: event-landing

Шаблон **«Лендинг события»** — главная страница всего комплекта артефактов. Сводит 1–7 артефактов с их статусами публикации в один обзорный экран. На странице — герой с названием и датами события, программа по дням, и сетка из карточек артефактов с прямыми ссылками.

## Источник данных

Этот шаблон, в отличие от семи лекционных, **не строится из расшифровки**. Он собирается командой `event-landing-build` (skill, появляется в T21) из:

- `.claude/lecture-artifacts.local.md` — название и даты события, список лекций программы;
- состояния файловой системы `lecture-artifacts/published/` — какие артефакты уже опубликованы (есть `.html` рядом с `published_url`), какие лежат локально, какие ещё в работе.

## Что заполняется

- `event` — метаданные мероприятия (имя, год, диапазон дат, локация).
- `artifacts[]` — массив из 1–7 элементов, по одному на лекцию-носителя артефакта. Поле `status` отражает фазу пайплайна:
  - `published` — артефакт опубликован, `href` — короткий p.knotta.ru URL;
  - `local` — артефакт собран локально, но ещё не опубликован, `href` — относительный путь вида `./<n>-<template>.html`;
  - `pending` — артефакт пока не собран, `href` равен `null`.

## JSON Schema

```json
{
  "type": "object",
  "required": ["event", "artifacts"],
  "additionalProperties": false,
  "properties": {
    "event": {
      "type": "object",
      "required": ["name", "year", "dates"],
      "properties": {
        "name":     { "type": "string" },
        "year":     { "type": "string", "pattern": "^\\d{4}$" },
        "dates":    { "type": "string" },
        "location": { "type": "string" }
      }
    },
    "artifacts": {
      "type": "array",
      "minItems": 1,
      "maxItems": 7,
      "items": {
        "type": "object",
        "required": ["n", "template", "title", "lecturer", "date", "status"],
        "properties": {
          "n":        { "type": "integer", "minimum": 1, "maximum": 7 },
          "template": { "type": "string" },
          "title":    { "type": "string" },
          "lecturer": { "type": "string" },
          "date":     { "type": "string" },
          "href":     { "type": ["string", "null"] },
          "qr":       { "type": ["string", "null"] },
          "status":   { "type": "string", "enum": ["published", "local", "pending"] }
        }
      }
    }
  }
}
```

## Подсказки

- `status: "published"` — артефакт уже опубликован на p.knotta.ru, в `href` стоит абсолютный URL вида `https://p.knotta.ru/<short>`.
- `status: "local"` — артефакт собран, но ещё не загружен; в `href` записывается относительный путь, например `./3-case-matcher.html`. Это удобно, когда лендинг открывают локально из папки сборки.
- `status: "pending"` — артефакт пока не существует. В `href` пишется `null`. На странице такая карточка остаётся видимой (с пометкой «в работе»), но не кликабельной.
- `qr` — необязательное поле для пути к локальному QR-коду; `null`, если QR не нужен.
- `template` — id одного из семи лекционных шаблонов: `diagnostic-quiz`, `parameter-dashboard`, `case-matcher`, `pick-and-plan`, `scenario-cards`, `step-builder`, `manifesto`.

## Event-маркеры, которые подменяет движок

- `event-name` ← `event.name`
- `event-year` ← `event.year`

(Маркеры `lecture-num` и `act-title` в этом шаблоне не используются — лендинг не привязан к конкретной лекции.)
