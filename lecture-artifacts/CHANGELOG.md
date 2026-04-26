# Changelog

## [0.3.1] — 2026-04-26

- Новый helper `scripts/validate-counts.mjs` ловит расхождения между русскими числительными в маркерах и длинами массивов в DATA. Soft warning (не блокирует, но видно в логе).
- `lecture-artifact-build/SKILL.md` дополнен дисциплиной числовых маркеров: page-title генерируется ПОСЛЕ DATA, числа берутся из реальных длин массивов.
- Schemas 4 шаблонов (parameter-dashboard, scenario-cards, diagnostic-quiz, manifesto) дополнены пунктом «Дисциплина чисел».
- Тесты validateCounts: 7 кейсов.

## [0.3.0] — 2026-04-26

Conditional rendering. Breaking change в нескольких UI-аспектах шаблонов.

- Новая директива движка: `<!-- evt-if:KEY -->...<!-- /evt-if -->`. При пустом/null/undefined значении в `event.markers[KEY]` весь блок удаляется на этапе сборки. Иначе блок остаётся, внутренние `evt:KEY` подменяются как обычно.
- Удалён дублирующий eyebrow `evt:lecture-title` с per-artifact страниц (5 шаблонов: diagnostic-quiz, parameter-dashboard, case-matcher, pick-and-plan, scenario-cards). На этих страницах лектор отображается ниже через DATA.lecturer; eyebrow дублировал.
- Hardcoded даты/время в hero-meta обёрнуты в `evt-if:lecture-when` (3 шаблона). Manifesto: `evt-if:lecture-when` + `evt-if:lecture-slot` для двух своих rows.
- Manifesto signature (4 stat-rows) обёрнуты в индивидуальные `evt-if:event-*`.
- Event-landing: топбар-счётчик через `evt:artifact-count` (генерируется); hero-stats rows в `evt-if:event-*`; section-eye+timeline в `evt-if:program-has-content`; артефакт-карточки лишены дублирующего «к лекции · X»; дата показывается условно (`if (a.date)`).
- Event-landing timeline теперь DATA-driven: `DATA.timeline` массив дней с rows. Рендер safe-DOM API (createElement/textContent), без innerHTML.
- Новые опциональные поля в `.local.md`: `event.duration`, `event.timeline_extras`, `program[i].slot`, `program[i].when`.
- `lecture-artifact-build` и `event-landing-build` обновлены: пробрасывают маркеры только при наличии значения.
- `event-init` опросник расширен новыми полями (все опциональные).

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
