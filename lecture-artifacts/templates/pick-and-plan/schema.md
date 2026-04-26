# Schema: pick-and-plan

Шаблон **«Каталог → выбор N → план»**. На странице — карточки занятий/практик/мастер-классов; пользователь выбирает 3 и получает план «что сделать в понедельник».

## Что заполняется из расшифровки

`classes[]` — каждое занятие из материала лекции/секции: автор, заголовок, идея в одном абзаце, одно действие на следующий рабочий день.

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["classes"],
  "additionalProperties": false,
  "properties": {
    "classes": {
      "type": "array",
      "minItems": 5,
      "maxItems": 10,
      "items": {
        "type": "object",
        "required": ["id", "acc", "title", "lecturer", "tag", "duration", "diff", "idea", "planLine"],
        "additionalProperties": false,
        "properties": {
          "id":        { "type": "string", "pattern": "^mk\\d+$" },
          "acc":       { "type": "string", "enum": ["blue", "teal", "ochre", "rose", "olive", "plum", "amber", "ink"] },
          "title":     { "type": "string", "minLength": 5 },
          "lecturer":  { "type": "string" },
          "tag":       { "type": "string", "enum": ["Теория", "Практика", "Метод", "Этика", "Инструмент", "Диалог", "Разбор"] },
          "duration":  { "type": "string", "pattern": "^\\d+ мин$" },
          "diff":      { "type": "integer", "minimum": 1, "maximum": 5 },
          "idea":      { "type": "string", "minLength": 30 },
          "planLine":  { "type": "string", "minLength": 15 }
        }
      }
    }
  }
}
```

## Подсказки

- `id` — порядковый: `mk1`, `mk2`, ...
- `acc` — акценты идут циклично, не повторять подряд.
- `diff` — 1=новичок, 5=сложно.
- `planLine` — императив, конкретное действие, начинается с глагола.
