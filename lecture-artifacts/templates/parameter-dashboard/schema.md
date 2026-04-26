# Schema: parameter-dashboard

Шаблон **«Пульт самооценки параметров»** — интерактивный дашборд из 5–8 ползунков-параметров (например, измерения цифровой среды школы) и 3–6 «приборов»-индикаторов, которые пересчитываются вживую как взвешенные суммы параметров. По итогам показывается диагноз самого слабого индикатора и дорожная карта на несколько месяцев — по одному стартовому действию на каждый параметр.

## Что заполняется из расшифровки

- `lecturer` — короткое ФИО лектора (одна строка). Показано в подвале.
- `date` — строка-метка времени и зала (например, «среда 29.04, 09:20–10:50 · большой зал»). Показывается в hero-meta.
- `parameters[]` — 5–8 ползунков. У каждого: `id` (`p1`, `p2`, …), `cat` (короткая категория-ярлык), `label` (название), `explain` (1 предложение пояснения), `initial` (стартовое значение 0–100) и `states[]` — ровно 5 состояний с непересекающимися диапазонами `r:[lo,hi]` (0–20, 21–40, 41–60, 61–80, 81–100) и описательным текстом `t`.
- `indicators[]` — 3–6 «приборов». У каждого: `id` (`i1`, `i2`, …), `label`, `explain`, `weights` (словарь `{<parameter id>: вес}` — какие параметры и с каким весом дают значение прибора), `zones` (тексты для трёх зон `red` / `amber` / `green`).
- `thresholds` — два числа: `red` (граница красной зоны) и `amber` (граница жёлтой зоны). Например, `{red:40, amber:70}`.
- `roadmap` — словарь `{<parameter id>: {label, text}}` с одним стартовым действием на каждый параметр из `parameters[]`. `label` обычно совпадает с `cat`.
- `months[]` — массив из 4–8 названий месяцев (по числу шагов дорожной карты), например `["Май 2026", "Июнь 2026", …]`.

## Подсказки для извлечения

- `id` параметра — короткий слаг `p1`, `p2`, … Используется как ключ в `weights` индикаторов и в `roadmap`.
- `id` индикатора — короткий слаг `i1`, `i2`, …
- `cat` — категория в одно слово или короткое словосочетание («Инфраструктура», «Кадры», «Культура»).
- `label` параметра — что меряет ползунок, развёрнутая формулировка («Сеть, устройства, оборудование»).
- `explain` — одно предложение, что именно описывает параметр / индикатор.
- `states[]` — обязательно 5 элементов, диапазоны `r` непересекающиеся, покрывают 0..100.
- `weights` — числа, в сумме обычно дают 1.0, но это не строго — движок нормализует.
- `zones.red` / `zones.amber` / `zones.green` — короткий текст-вердикт (1–2 фразы) для соответствующей зоны прибора.
- `thresholds.red < thresholds.amber`.
- `roadmap[id].text` — конкретное стартовое действие, 1–2 фразы, императив.
- `months[]` — длина массива должна быть равна числу параметров (один параметр — один шаг).

## Заголовок страницы (page-title)

Это hero-`<h1>` страницы — указание на текущее положение объекта оценки в пространстве темы. Шаблон стиля: «Где сейчас <em>X</em><br>вашей <Y>». Допустимы `<br>`, `<em>`, `<span class="accent">`.

Примеры:
- «Где сейчас <em>цифровая среда</em><br>вашей школы» (исходная лекция)
- «Где сейчас <em>методическая зрелость</em><br>вашего предмета»

Тон констатирующий, без вопроса. Курсив выделяет ключевое понятие.

**Дисциплина чисел:** если в заголовке используешь число параметров — оно должно совпадать с `parameters.length`. Не пиши «Шесть переключателей», если на странице будет 4 шкалы. Безопаснее не упоминать число в заголовке вообще, либо вычислять прописью из длины массива.

## Подзаголовок-эпиграф (lecture-title)

Eyebrow под hero — формула «К лекции <ИмяФамилия>». Берётся из `program[i].lecturer`.

Пример: `К лекции Виктора Басюка`

## Event-маркеры, которые подменяет движок

- `event-name` ← `event.name`
- `event-year` ← год из `event.month_year`
- `lecture-num` ← `program[i].n` (римскими)
- `act-title` ← `program[i].title` (короткая форма, как в topbar)

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["lecturer", "date", "parameters", "indicators", "thresholds", "roadmap", "months"],
  "additionalProperties": false,
  "properties": {
    "lecturer": { "type": "string", "minLength": 2 },
    "date":     { "type": "string", "minLength": 5 },
    "parameters": {
      "type": "array",
      "minItems": 5,
      "maxItems": 8,
      "items": {
        "type": "object",
        "required": ["id", "cat", "label", "explain", "initial", "states"],
        "additionalProperties": false,
        "properties": {
          "id":      { "type": "string", "pattern": "^p[0-9]+$" },
          "cat":     { "type": "string", "minLength": 2 },
          "label":   { "type": "string", "minLength": 3 },
          "explain": { "type": "string", "minLength": 10 },
          "initial": { "type": "integer", "minimum": 0, "maximum": 100 },
          "states": {
            "type": "array",
            "minItems": 5,
            "maxItems": 5,
            "items": {
              "type": "object",
              "required": ["r", "t"],
              "additionalProperties": false,
              "properties": {
                "r": {
                  "type": "array",
                  "minItems": 2,
                  "maxItems": 2,
                  "items": { "type": "integer", "minimum": 0, "maximum": 100 }
                },
                "t": { "type": "string", "minLength": 10 }
              }
            }
          }
        }
      }
    },
    "indicators": {
      "type": "array",
      "minItems": 3,
      "maxItems": 6,
      "items": {
        "type": "object",
        "required": ["id", "label", "explain", "weights", "zones"],
        "additionalProperties": false,
        "properties": {
          "id":      { "type": "string", "pattern": "^i[0-9]+$" },
          "label":   { "type": "string", "minLength": 3 },
          "explain": { "type": "string", "minLength": 10 },
          "weights": {
            "type": "object",
            "minProperties": 1,
            "additionalProperties": { "type": "number" }
          },
          "zones": {
            "type": "object",
            "required": ["red", "amber", "green"],
            "additionalProperties": false,
            "properties": {
              "red":   { "type": "string", "minLength": 10 },
              "amber": { "type": "string", "minLength": 10 },
              "green": { "type": "string", "minLength": 10 }
            }
          }
        }
      }
    },
    "thresholds": {
      "type": "object",
      "required": ["red", "amber"],
      "additionalProperties": false,
      "properties": {
        "red":   { "type": "integer", "minimum": 0, "maximum": 100 },
        "amber": { "type": "integer", "minimum": 0, "maximum": 100 }
      }
    },
    "roadmap": {
      "type": "object",
      "minProperties": 1,
      "additionalProperties": {
        "type": "object",
        "required": ["label", "text"],
        "additionalProperties": false,
        "properties": {
          "label": { "type": "string", "minLength": 2 },
          "text":  { "type": "string", "minLength": 20 }
        }
      }
    },
    "months": {
      "type": "array",
      "minItems": 4,
      "maxItems": 8,
      "items": { "type": "string", "minLength": 3 }
    }
  }
}
```
