# Schema: manifesto

Шаблон **«Манифест события»**. На странице — пронумерованные тезисы (от 5 до 12, обычно 7), каждый с цитатой, авторством и предлагаемым «действием на неделю». Внизу — ссылки на остальные артефакты события.

## Что заполняется из расшифровки

`theses[]` — каждый тезис собирается из материала лекций события: ключевая мысль, цитата спикера, призыв к действию.

## Что заполняется автоматически (не из расшифровки)

`links[]` — заполняется во время сборки из `.claude/lecture-artifacts.local.md`: для каждой записи в `program[]` с непустым `published_url` создаётся элемент с `num` (порядковый номер), `title` (название артефакта по типу), `desc` (короткое описание из шаблона) и `href` (URL).

Если на момент сборки опубликовано меньше 6 артефактов — массив `links[]` короче. Манифест перестраивается командой `/manifesto` повторно по мере публикации остальных страниц.

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["theses", "links"],
  "additionalProperties": false,
  "properties": {
    "theses": {
      "type": "array",
      "minItems": 5,
      "maxItems": 12,
      "items": {
        "type": "object",
        "required": ["c", "num", "title", "author", "explain", "quote", "who", "action"],
        "additionalProperties": false,
        "properties": {
          "c":       { "type": "string", "enum": ["blue", "teal", "ochre", "rose", "olive", "plum", "amber"] },
          "num":     { "type": "string", "pattern": "^[IVX]+$" },
          "title":   { "type": "string", "minLength": 10 },
          "author":  { "type": "string" },
          "explain": { "type": "string", "minLength": 40 },
          "quote":   { "type": "string", "minLength": 20 },
          "who":     { "type": "string" },
          "action":  { "type": "string", "minLength": 20 }
        }
      }
    },
    "links": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["num", "title", "desc", "href"],
        "additionalProperties": false,
        "properties": {
          "num":   { "type": "string", "pattern": "^[IVX]+$" },
          "title": { "type": "string" },
          "desc":  { "type": "string" },
          "href":  { "type": "string", "format": "uri" }
        }
      }
    }
  }
}
```

## Подсказки для извлечения

- Цвета `c` идут по порядку из палитры; не повторять подряд один и тот же.
- `num` — римские цифры, начиная с `I`, по числу тезисов.
- `quote` — это **точная или близкая к тексту цитата** из расшифровки. Если в расшифровке нет ничего подходящего — переформулировать ключевую мысль одной фразой и пометить `who: "по мотивам …"`.
- `action` — конкретное микро-действие на неделю, в повелительном наклонении.

## Заголовок страницы (page-title)

Это hero-`<h1>` страницы — короткое манифестное утверждение, переопределяющее роль учителя/предмета через тему лекции. Шаблон стиля: «<Субъект> — это <span class="accent">не X</span>.<br>Это <span class="em">Y</span> в <Z>.». Контраст «не X — а Y».

Примеры:
- «Учитель — это <span class=\"accent\">не профессия</span>.<br>Это <span class=\"em\">позиция</span> в мире.» (исходная лекция)
- «Урок — это <span class=\"accent\">не план</span>.<br>Это <span class=\"em\">встреча</span> в группе.»

Тон декларативный, лаконичный. `accent` для отрицания, `em` для нового определения.

## Подзаголовок-эпиграф (lecture-title)

Eyebrow под hero — одно слово-тег, помечающее место в финале события: итог, манифест, финал, закрытие, выводы.

Пример: `итог`

## Стат-блок события

В `<section class="signature">` четыре строки заполняются маркерами событийного уровня (НЕ из расшифровки лекции):
- `evt:event-location` ← `event.location`
- `evt:event-dates` ← `event.dates`
- `evt:event-participants` ← `event.participants`
- `evt:event-content-summary` ← `event.content_summary`

Эти поля собираются командой `/init` или вручную в `.claude/lecture-artifacts.local.md`.

## Event-маркеры, которые подменяет движок

- `event-name` ← `event.name`
- `event-year` ← год из `event.month_year`
- `lecture-num` ← `program[i].n` (римскими)
- `act-title` ← `program[i].title`
