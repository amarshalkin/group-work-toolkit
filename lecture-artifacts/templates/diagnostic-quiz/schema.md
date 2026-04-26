# Schema: diagnostic-quiz

Шаблон **«Самотест-фронтир»** — мобильный самотест с 12 вопросами, шкалой-термометром на 5 уровней (0–36 баллов), радиальной картой 8 территорий компетенций и треком из 3 шагов на каждый уровень. Вёрстка жёсткая: кардинальности фиксированы и завязаны на логику страницы (прогресс-бар, шкала, радиальная карта, выбор трека по уровню).

## Что заполняется из расшифровки

- `lecturer` — имя лектора одной строкой (например, «Дмитрий Бризицкий»).
- `lectureTitle` — название лекции одной строкой («ИИ: современный фронтир»).
- `date` — день и время в формате карточки лекции («вторник 28.04, 17:00»).
- `scale[]` — **ровно 5 уровней**, по возрастанию. У каждого: `roman` (римская цифра уровня — `I`…`V`), `short` (короткое имя, до 12 символов, для метки на шкале), `name` (полное имя уровня), `range` (массив из двух чисел `[lo, hi]` — границы суммарного балла включительно), `desc` (1–3 предложения — описание уровня).
- `questions[]` — **ровно 12 вопросов**. У каждого: `q` (текст вопроса, 1 предложение) и `options[]` — **ровно 4 варианта** ответа.
- `questions[].options[]` — каждый вариант: `text` (короткая формулировка ответа) и `score` (целое 0–3, **по нарастанию** — 0 — «не делал», 3 — «системная практика»).
- `frontier[]` — **ровно 8 территорий** компетенций (по часовой стрелке от 12 часов на радиальной карте). У каждой: `id` (короткий слаг, уникальный — `t1`…`t8`), `name` (короткое имя территории, до ~16 символов; допустимы мягкие переносы `­` для длинных слов), `desc` (1–2 предложения — что это за территория), `action` (1 практическое действие — что попробовать на этой неделе).
- `tracks[]` — **ровно 5 треков** (по одному на каждый уровень `scale`). Каждый трек — массив **ровно из 3 шагов**. Шаг: `title` (короткий заголовок, 2–4 слова) и `body` (1 предложение — что делать).

## Подсказки для извлечения

- Сумма максимальных `score` по всем вопросам = `12 × 3 = 36`. Это и есть верхняя граница `range[1]` последнего уровня.
- `range` уровней должны **покрывать диапазон 0..36 без пересечений и без дыр**: например, `[0,7], [8,15], [16,23], [24,31], [32,36]`. Первый уровень начинается с 0, последний заканчивается на 36.
- `score` внутри одного вопроса должны идти строго `0, 1, 2, 3` — это считывает движок (без перестановок).
- `frontier[].id` — короткие коды (`t1`…`t8`); используются как якоря на радиальной карте, не показываются пользователю.
- Тон `desc` уровня и `action` территории — обращение «вы», без морализаторства, 1–2 коротких предложения.
- `tracks[i]` соответствует `scale[i]` по индексу (1-в-1). Шаги в треке — **по нарастанию вовлечённости**: от лёгкого пробного действия к системной практике.
- Если в расшифровке покрытие неполное (например, лектор упомянул только часть территорий или вопросов), дозаполните типовыми формулировками так, чтобы выдержать кардинальности 5 / 12 / 4 / 8 / 5×3.

## Event-маркеры, которые подменяет движок

- `event-name` ← `event.name`
- `event-year` ← год из `event.month_year`
- `lecture-num` ← `program[i].n` (римскими)
- `act-title` ← `program[i].title` (короткая форма, как в topbar — например, «Самотест»)

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["lecturer", "lectureTitle", "date", "scale", "questions", "frontier", "tracks"],
  "additionalProperties": false,
  "properties": {
    "lecturer":     { "type": "string", "minLength": 2 },
    "lectureTitle": { "type": "string", "minLength": 2 },
    "date":         { "type": "string", "minLength": 2 },
    "scale": {
      "type": "array",
      "minItems": 5,
      "maxItems": 5,
      "items": {
        "type": "object",
        "required": ["roman", "short", "name", "range", "desc"],
        "additionalProperties": false,
        "properties": {
          "roman": { "type": "string", "minLength": 1, "maxLength": 4 },
          "short": { "type": "string", "minLength": 1 },
          "name":  { "type": "string", "minLength": 2 },
          "range": {
            "type": "array",
            "minItems": 2,
            "maxItems": 2,
            "items": { "type": "integer", "minimum": 0, "maximum": 36 }
          },
          "desc":  { "type": "string", "minLength": 10 }
        }
      }
    },
    "questions": {
      "type": "array",
      "minItems": 12,
      "maxItems": 12,
      "items": {
        "type": "object",
        "required": ["q", "options"],
        "additionalProperties": false,
        "properties": {
          "q": { "type": "string", "minLength": 5 },
          "options": {
            "type": "array",
            "minItems": 4,
            "maxItems": 4,
            "items": {
              "type": "object",
              "required": ["text", "score"],
              "additionalProperties": false,
              "properties": {
                "text":  { "type": "string", "minLength": 1 },
                "score": { "type": "integer", "minimum": 0, "maximum": 3 }
              }
            }
          }
        }
      }
    },
    "frontier": {
      "type": "array",
      "minItems": 8,
      "maxItems": 8,
      "items": {
        "type": "object",
        "required": ["id", "name", "desc", "action"],
        "additionalProperties": false,
        "properties": {
          "id":     { "type": "string", "minLength": 1, "maxLength": 8 },
          "name":   { "type": "string", "minLength": 2 },
          "desc":   { "type": "string", "minLength": 10 },
          "action": { "type": "string", "minLength": 10 }
        }
      }
    },
    "tracks": {
      "type": "array",
      "minItems": 5,
      "maxItems": 5,
      "items": {
        "type": "array",
        "minItems": 3,
        "maxItems": 3,
        "items": {
          "type": "object",
          "required": ["title", "body"],
          "additionalProperties": false,
          "properties": {
            "title": { "type": "string", "minLength": 2 },
            "body":  { "type": "string", "minLength": 5 }
          }
        }
      }
    }
  }
}
```
