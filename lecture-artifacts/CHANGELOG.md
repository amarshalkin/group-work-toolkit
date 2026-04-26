# Changelog

## [0.1.0] — 2026-04-26

Первый релиз.

- 7 функциональных шаблонов: diagnostic-quiz, parameter-dashboard, case-matcher, pick-and-plan, scenario-cards, step-builder, manifesto.
- Шаблон event-landing — главная страница комплекта.
- Команда `/init` со сбором программы события и общих полей.
- Скрипт-движок `inject-data.mjs` (3 типа подстановки) с golden-снапшотами.
- Парсер программы `parse-program.mjs` (md/yaml/json).
- Try-call интеграция с `knottasoft:host-html` (host-doctor + host-html).
- Поддержка локальной работы без host-html.
