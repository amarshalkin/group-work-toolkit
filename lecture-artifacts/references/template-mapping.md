# Template mapping (old prototype name → functional id)

| # | Source folder in `final/`     | Plugin template id     | Default title (for landing/manifesto links) | Short desc                                  |
|---|--------------------------------|------------------------|---------------------------------------------|---------------------------------------------|
| 1 | `01-frontier-map`              | `diagnostic-quiz`      | Карта самотеста                             | самотест · уровни · карта                   |
| 2 | `02-digital-environment`       | `parameter-dashboard`  | Пульт параметров                            | N шкал · профиль · roadmap                  |
| 3 | `03-world-map`                 | `case-matcher`         | Атлас кейсов                                | страны · модели · подбор                    |
| 4 | `04-seven-masterclasses`       | `pick-and-plan`        | Меню практик                                | каталог · выбор · план                      |
| 5 | `05-values-atlas`              | `scenario-cards`       | Атлас сценариев                             | темы · сценарий 15 мин                      |
| 6 | `06-lesson-constructor`        | `step-builder`         | Конструктор                                 | шаги · 3 голоса · план                      |
| 7 | `07-manifesto`                 | `manifesto`            | Манифест                                    | тезисы · цитата · действие                  |
| – | `index.html`                   | `event-landing`        | —                                           | —                                           |

The «default title» and «short desc» columns are used by:
- `manifesto` skill when filling `links[]` for sister artefacts.
- `event-landing` skill when no per-program override is set.
