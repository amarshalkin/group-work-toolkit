# Schema: scenario-cards

Шаблон **«Атлас тематических карточек со сценариями»**. На странице — 6–10 карточек по ценностям/темам, в каждой готовый практический сценарий 15-минутного фрагмента урока (задача, шаги, цитата) плюс встройки в школьные предметы и блок «трудные вопросы — короткие ответы».

## Что заполняется из расшифровки

`values[]` — каждая карточка собирается из материала лекции: тема (`name` + латинское `latin`), ключевая цитата (`quote`), сценарий 15-минутного такта (`scenario.objective` + 4–6 `steps[]`), встройки в предметы (`embeds`) и 2–4 «трудных вопроса» с короткими ответами (`questions[]`).

## Подсказки для извлечения

- `id` — короткий латинский слаг темы (`family`, `labor`, …).
- `num` — римские цифры по порядку, начиная с `I`.
- `latin` — однословное латинское имя ценности с заглавной буквы (`Familia`, `Labor`, …).
- `acc` — акценты идут циклично, не повторять подряд.
- `quote` — близкая к тексту лекции формулировка-афоризм.
- `scenario.duration` — длительность сценария (по умолчанию `«15 минут»`).
- `scenario.grade` — рекомендуемая параллель (`«5–9 класс»`, `«7–11 класс»` и т.п.).
- `scenario.objective` — что именно учитель должен донести за этот такт.
- `scenario.steps[]` — императивные ходы модератора по порядку (4–6 пунктов).
- `embeds` — короткая фраза-встройка в каждый предмет (объект с ключами-предметами, значение — фраза с допустимым `<strong>…</strong>`).
- `questions[]` — каверзные вопросы из аудитории и короткие, держащие позицию ответы.

## Заголовок страницы (page-title)

Это hero-`<h1>` страницы — фраза от первого лица о действии в классе. Шаблон стиля: «Что я <b>с этим</b><br>делаю в <время>.». `<b>` для акцента, `<br>` для разрыва.

Примеры:
- «Что я <b>с этим</b><br>делаю в понедельник.» (исходная лекция)
- «Что я <b>сейчас</b><br>скажу детям.»

Тон личный, обращённый к учителю, без обращения «вы». Время короткое (понедельник, завтра, на этой неделе).

## Подзаголовок-эпиграф (lecture-title)

Eyebrow под hero — формула «К лекции <ИмяФамилия>». Берётся из `program[i].lecturer`.

Пример: `К лекции Ивана Палитая`

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
  "required": ["values"],
  "additionalProperties": false,
  "properties": {
    "values": {
      "type": "array",
      "minItems": 6,
      "maxItems": 10,
      "items": {
        "type": "object",
        "required": ["id", "num", "name", "latin", "acc", "quote", "scenario", "embeds", "questions"],
        "additionalProperties": false,
        "properties": {
          "id":    { "type": "string", "pattern": "^[a-z][a-z0-9_-]*$" },
          "num":   { "type": "string", "pattern": "^[IVX]+$" },
          "name":  { "type": "string", "minLength": 2 },
          "latin": { "type": "string", "minLength": 2 },
          "acc":   { "type": "string", "enum": ["blue", "teal", "ochre", "rose", "olive", "plum", "amber", "ink"] },
          "quote": { "type": "string", "minLength": 20 },
          "scenario": {
            "type": "object",
            "required": ["duration", "grade", "objective", "steps"],
            "additionalProperties": false,
            "properties": {
              "duration":  { "type": "string", "minLength": 3 },
              "grade":     { "type": "string", "minLength": 3 },
              "objective": { "type": "string", "minLength": 20 },
              "steps": {
                "type": "array",
                "minItems": 4,
                "maxItems": 6,
                "items": { "type": "string", "minLength": 10 }
              }
            }
          },
          "embeds": {
            "type": "object",
            "minProperties": 1,
            "additionalProperties": { "type": "string", "minLength": 10 }
          },
          "questions": {
            "type": "array",
            "minItems": 2,
            "maxItems": 4,
            "items": {
              "type": "object",
              "required": ["q", "a"],
              "additionalProperties": false,
              "properties": {
                "q": { "type": "string", "minLength": 5 },
                "a": { "type": "string", "minLength": 10 }
              }
            }
          }
        }
      }
    }
  }
}
```
