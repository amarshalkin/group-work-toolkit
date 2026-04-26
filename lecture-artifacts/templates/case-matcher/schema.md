# Schema: case-matcher

Шаблон **«Картотека сравнительных кейсов + квиз-подбор»**. На странице — 6–10 карточек-стран (или иных кейсов), каждая со своей моделью, тем что работает и что ломается, плюс «переносимым выводом». Внизу — короткий квиз из 5–8 вопросов: набор взвешенных голосов на ответах ведёт к одному из профилей-кейсов и подсказывает, какая модель ближе именно вашей школе.

## Что заполняется из расшифровки

- `countries[]` — каждая карточка собирается из материала лекции: название кейса (`name` + латинское `latin`), двухбуквенный код (`code`), короткий слоган (`tag`), длинное описание модели (`modelLong`), 2–4 пункта `works[]` (что работает), 1–3 пункта `fails[]` (что ломается) и однострочный `transferable` (что из этого переносимо к нам).
- `matchQuestions[]` — 5–8 вопросов на сравнение «как у вас?». В каждом 3–5 вариантов ответа, у каждого варианта `weights` — словарь `{country-id: число}`, голоса за подходящие профили.
- `matchProfiles{}` — по одной записи на каждый id из `countries[]` (или подмножество): `title` («Финляндия — ближе вашей школе») и `body` (короткий текст-вывод с риском и решением). Какой профиль набрал больше очков — тот и показывается.

## Подсказки для извлечения

- `id` — короткий латинский слаг кейса (`fi`, `ee`, `sg`, …); используется и как ключ в `weights` и `matchProfiles`.
- `code` — традиционный двухбуквенный код (ISO-style, например `FI`, `EE`, `SG`). Может быть и небуквенным, если кейс не страна.
- `latin` — однословное (или двухсловное) латинское название (`Finlandia`, `Estonia`, `Civitates Foed.`).
- `acc` — акцентный цвет карточки; идут циклично из палитры, не повторять подряд.
- `tag` — слоган-ярлык в 2–4 слова (`«Доверие учителю»`, `«Цифровое государство»`).
- `modelLong` — 1–3 фразы: суть модели как единого целого.
- `works[]` — императивные/констатирующие пункты: что в этой модели реально работает.
- `fails[]` — где модель ломается / какая цена.
- `transferable` — одно предложение: что из опыта переносимо к нам.
- `matchQuestions[].q` — вопрос-«как у вас?», обращённый к школе/учителю.
- `matchQuestions[].options[].text` — короткий ответ (1 строка).
- `matchQuestions[].options[].weights` — голоса за профили: `{ "fi": 2, "us": 1 }`. Сумма не обязательна.
- `matchProfiles[id].title` — обычно `«<Название> — ближе вашей школе»`.
- `matchProfiles[id].body` — 2–4 фразы: что это говорит о вас, риск, решение.

## Заголовок страницы (page-title)

Это hero-`<h1>` страницы — формула из двух коротких предложений: количество кейсов + объединяющая роль. Шаблон стиля: «<N словом> <элементов>.<br><mark>Один</mark> <роль>.». Используется `<mark>` для жёлтого выделения и `<br>` для переноса.

Примеры:
- «Восемь моделей.<br><mark>Один</mark> учитель.» (исходная лекция)
- «Шесть подходов.<br><mark>Одна</mark> школа.»

Количество (`countries.length`) числом прописью, согласованное по роду с существительным.

## Подзаголовок-эпиграф (lecture-title)

Eyebrow под hero — формула «К лекции <ИмяФамилия>». Берётся из `program[i].lecturer`.

Пример: `К лекции Константина Серёгина`

## Event-маркеры, которые подменяет движок

- `event-name` ← `event.name`
- `event-year` ← год из `event.month_year`
- `lecture-num` ← `program[i].n` (римскими)
- `act-title` ← `program[i].title`

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["countries", "matchQuestions", "matchProfiles"],
  "additionalProperties": false,
  "properties": {
    "countries": {
      "type": "array",
      "minItems": 6,
      "maxItems": 10,
      "items": {
        "type": "object",
        "required": ["id", "name", "latin", "code", "acc", "tag", "modelLong", "works", "fails", "transferable"],
        "additionalProperties": false,
        "properties": {
          "id":           { "type": "string", "pattern": "^[a-z][a-z0-9_-]*$" },
          "name":         { "type": "string", "minLength": 2 },
          "latin":        { "type": "string", "minLength": 2 },
          "code":         { "type": "string", "minLength": 2, "maxLength": 6 },
          "acc":          { "type": "string", "enum": ["blue", "teal", "ochre", "ochre-d", "rose", "olive", "plum", "amber", "ink"] },
          "tag":          { "type": "string", "minLength": 3 },
          "modelLong":    { "type": "string", "minLength": 40 },
          "works": {
            "type": "array",
            "minItems": 2,
            "maxItems": 5,
            "items": { "type": "string", "minLength": 10 }
          },
          "fails": {
            "type": "array",
            "minItems": 1,
            "maxItems": 4,
            "items": { "type": "string", "minLength": 10 }
          },
          "transferable": { "type": "string", "minLength": 20 }
        }
      }
    },
    "matchQuestions": {
      "type": "array",
      "minItems": 5,
      "maxItems": 8,
      "items": {
        "type": "object",
        "required": ["q", "options"],
        "additionalProperties": false,
        "properties": {
          "q": { "type": "string", "minLength": 5 },
          "options": {
            "type": "array",
            "minItems": 3,
            "maxItems": 5,
            "items": {
              "type": "object",
              "required": ["text", "weights"],
              "additionalProperties": false,
              "properties": {
                "text": { "type": "string", "minLength": 3 },
                "weights": {
                  "type": "object",
                  "minProperties": 1,
                  "additionalProperties": { "type": "number" }
                }
              }
            }
          }
        }
      }
    },
    "matchProfiles": {
      "type": "object",
      "minProperties": 1,
      "additionalProperties": {
        "type": "object",
        "required": ["title", "body"],
        "additionalProperties": false,
        "properties": {
          "title": { "type": "string", "minLength": 5 },
          "body":  { "type": "string", "minLength": 30 }
        }
      }
    }
  }
}
```
