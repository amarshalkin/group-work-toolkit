# Changelog

## [0.2.0] — 2026-04-26

Breaking change в контракте маркеров.

- Добавлены маркеры: `evt:page-title` (динамический hero-h1; 7 шаблонов кроме step-builder), `evt:lecture-title` (полное название лекции/эпиграф под hero), `evt:event-location`, `evt:event-dates`, `evt:event-participants`, `evt:event-content-summary` (статы события для блока signature в манифесте и для лендинга).
- Удалён маркер `evt:lecture-num` и весь связанный hardcoded текст («Акт N · », «№ NN », «· акт N из VII») — порядок лекций в программе разный для каждого события и не должен фигурировать в финальной странице.
- Каждый schema.md описывает стиль `page-title` и `lecture-title` для своего шаблона; орчестратор `lecture-artifact-build` генерирует их по этим подсказкам.
- `/init` теперь запрашивает `event.dates`, `event.participants`, `event.content_summary` (помимо уже существующих `event.location`, `event.name`, `event.month_year`).

## [0.1.0] — 2026-04-26

Первый релиз.

- 7 функциональных шаблонов: diagnostic-quiz, parameter-dashboard, case-matcher, pick-and-plan, scenario-cards, step-builder, manifesto.
- Шаблон event-landing — главная страница комплекта.
- Команда `/init` со сбором программы события и общих полей.
- Скрипт-движок `inject-data.mjs` (3 типа подстановки) с golden-снапшотами.
- Парсер программы `parse-program.mjs` (md/yaml/json).
- Try-call интеграция с `knottasoft:host-html` (host-doctor + host-html).
- Поддержка локальной работы без host-html.
