# Дизайн: условный рендеринг и удаление дубликатов (lecture-artifacts v0.3.0)

- **Дата:** 2026-04-26
- **Автор:** Артём Маршалкин (через Claude Code, brainstorming)
- **Статус:** утверждён к реализации

## 1. Контекст

После v0.2.0 (динамические `evt:page-title`, `evt:lecture-title`, статы события через `evt:event-*`) пользователь обнаружил, что:

1. **`evt:lecture-title` eyebrow на per-artifact-страницах дублирует** имя лектора, которое и так рендерится ниже из `DATA.lecturer`.
2. **Hardcoded даты/время** остались в нескольких местах — diagnostic-quiz, parameter-dashboard, scenario-cards (`hero-meta` блоки) и manifesto (`Когда / Слот`). При отсутствии программы они должны полностью исчезать из страницы.
3. **Manifesto signature** уже размечен, но конкретные строки (Где / Когда / Кто / Лекций) не должны показываться, если поле не заполнено.
4. **Event-landing** содержит крупные hardcoded зоны: топбар «7 артефактов», hero-stats (Где/Когда/Кто/Что), section-eye «Программа · 5 дней», таймлайн на 4 дня. Всё это должно либо генерироваться из данных, либо скрываться при отсутствии данных.
5. **Артефакт-карточки** на лендинге дублируют имя лектора («к лекции · X» поверх «лектор: X»), и дата всегда показана даже когда её нет.

Текущий движок умеет только подмену контента в марке `<!-- evt:KEY -->...<!-- /evt -->`. Условного скрытия блока он не делает.

## 2. Цели

- Расширить движок директивой `<!-- evt-if:KEY -->...<!-- /evt-if -->` для условного удаления HTML-блоков на этапе сборки.
- Удалить eyebrow с `evt:lecture-title` со всех per-artifact-страниц (rollback дублирующего поведения из v0.2.0).
- Все hardcoded даты/времена обернуть в `evt-if:lecture-when` / `evt-if:lecture-slot`. При отсутствии данных в `.local.md` → блок исчезает.
- Manifesto signature (4 строки) обернуть каждой строкой в свой `evt-if:event-*`.
- Event-landing: топбар-счётчик, hero-stats, section-eye, таймлайн — все в управляемом режиме через маркеры/conditional + DATA-driven рендер таймлайна.
- Карточка артефакта: убрать дубликат «к лекции · X», скрыть дату при пустом значении.
- `/init` собирает новые опциональные поля: `event.duration`, `event.timeline_extras`, `program[i].slot`, `program[i].when`.

## 3. Не-цели

- Не меняем существующие маркеры `evt:event-name`, `evt:event-year`, `evt:act-title`, `evt:page-title`, `evt:event-location/dates/participants/content-summary`. Они продолжают работать.
- Не вводим runtime-условия в шаблонные `<script>`-блоки сверх минимума (только `if (a.date)` в landing card render).
- Не пишем full event-программу как новый верхний-уровень шаблона. Timeline остаётся внутри event-landing.
- Не покрываем golden-снапшотами «rich» вариант для всех 8 шаблонов — только manifesto (самый conditional-rich). Остальные 7 покрываются sparse-вариантом (что и есть текущий тест).

## 4. Архитектура: подход A — `evt-if:KEY` директива

### 4.1 Расширение движка

Файл: `lecture-artifacts/scripts/inject-data.mjs`. Новая публичная функция `applyConditionals(html, markers)`:

```js
const EVT_IF_RE = /<!-- evt-if:([a-z-]+) -->[\s\S]*?<!-- \/evt-if -->/g;

export function applyConditionals(html, markers = {}) {
  return html.replace(EVT_IF_RE, (block, key) => {
    const val = markers[key];
    if (val == null || val === '') return '';
    // Block kept — strip the evt-if delimiters; inner evt:KEY markers handled by replaceEvtMarkers later.
    return block.replace(/<!-- evt-if:[a-z-]+ -->|<!-- \/evt-if -->/g, '');
  });
}
```

В `inject(template, data, event)` функция вызывается ПЕРВОЙ:

```js
export function inject(template, data, event = {}) {
  let out = template;
  out = applyConditionals(out, event.markers);  // NEW: must run before replaceEvtMarkers
  out = replaceTitle(out, event.title);
  out = replaceEvtMarkers(out, event.markers);
  out = replaceDataBlock(out, data);
  return out;
}
```

Поведение:
- `markers["lecture-when"] === undefined` → блок удалён.
- `markers["lecture-when"] === null` → блок удалён.
- `markers["lecture-when"] === ""` → блок удалён.
- `markers["lecture-when"] === "вторник 28.04, 17:00"` → блок остаётся; внутренний `evt:lecture-when` подменяется на это же значение.

Вложение `evt-if` внутри `evt-if` не поддерживается (regex non-greedy остановится на первом `<!-- /evt-if -->`). Для текущих требований не нужно.

### 4.2 Тесты движка

3 новых теста в `inject-data.test.mjs`:

- `evt-if removed when marker missing` — обёртка пустая или undefined → блок исчез.
- `evt-if kept when marker present` — обёртка непустая → блок остался без `evt-if:` тегов.
- `nested evt:KEY replaced inside surviving evt-if` — внутри сохранённого блока внутренний `evt:KEY` подменяется как обычно.

После их добавления regenerate всех 8 goldens, чтобы `evt-if` блоки исчезли там, где event.json fixtures не содержат соответствующих маркеров (минус «rich»-вариант для manifesto, см. §6.3).

## 5. Per-artifact templates: правки

### 5.1 Удалить дублирующий eyebrow

Затронутые шаблоны (5): `diagnostic-quiz`, `parameter-dashboard`, `case-matcher`, `scenario-cards`, `pick-and-plan`.

Действие: удалить целиком строку с `<div class="hero-eye">` или `<div class="intro-eyebrow">`, содержащую `<!-- evt:lecture-title -->...<!-- /evt -->`. Лектор отображается ниже через DATA-driven `lecturerLine` или встроенный текст из DATA.lecturer.

`step-builder` и `manifesto`: проверить вручную; если eyebrow содержит ТОЛЬКО `lecture-title` → удалить. Если он часть смешанного блока (например в manifesto: `<!-- evt:event-name -->...<!-- /evt --> · <!-- evt:lecture-title -->итог<!-- /evt -->`) → внутренний `evt:lecture-title` оборачивается в `evt-if:lecture-title`, чтобы при пустом значении убрать «· итог».

### 5.2 Условный hero-meta с датой/временем

3 шаблона: `diagnostic-quiz`, `parameter-dashboard`, `scenario-cards`. Каждый имеет одну строку с датой/временем/залом.

Шаблон преобразования (на примере parameter-dashboard line 358):

```html
<!-- БЫЛО -->
<div class="hero-meta" id="heroMeta">среда 29.04, 09:20–10:50 · большой зал</div>

<!-- СТАЛО -->
<!-- evt-if:lecture-when --><div class="hero-meta" id="heroMeta"><!-- evt:lecture-when -->среда 29.04, 09:20–10:50 · большой зал<!-- /evt --></div><!-- /evt-if -->
```

Аналогично:
- diagnostic-quiz line 533 (`<p>` вместо `<div class="hero-meta">`) — обернуть `<p>` целиком.
- scenario-cards line 423 — `<div class="hero-meta">` блок целиком.

### 5.3 Manifesto-specific блоки

**Hero-meta (lines 394-397)** — каждая строка независимо:

```html
<div class="hero-meta">
  <!-- evt-if:lecture-when --><div><b>Когда</b><!-- evt:lecture-when -->пт 02.05, 09:10<!-- /evt --></div><!-- /evt-if -->
  <!-- evt-if:lecture-slot --><div><b>Слот</b><!-- evt:lecture-slot -->мИИтинг + презентация<!-- /evt --></div><!-- /evt-if -->
</div>
```

Если оба пустые → внешний `<div class="hero-meta">` остаётся пустым (косметически приемлемо). Альтернатива (опционально): обернуть и сам `<div class="hero-meta">` в `evt-if:lecture-when` — тогда при отсутствии хотя бы даты hero-meta весь исчезает. Принимаем независимую версию.

**Signature block (lines 409-414)** — 4 строки в индивидуальные `evt-if`:

```html
<section class="signature">
  <!-- evt-if:event-location --><div class="sig-row"><b>Где</b><span><!-- evt:event-location -->...<!-- /evt --></span></div><!-- /evt-if -->
  <!-- evt-if:event-dates --><div class="sig-row"><b>Когда</b><span><!-- evt:event-dates -->...<!-- /evt --></span></div><!-- /evt-if -->
  <!-- evt-if:event-participants --><div class="sig-row"><b>Кто</b><span><!-- evt:event-participants -->...<!-- /evt --></span></div><!-- /evt-if -->
  <!-- evt-if:event-content-summary --><div class="sig-row"><b>Лекций</b><span><!-- evt:event-content-summary -->...<!-- /evt --></span></div><!-- /evt-if -->
</section>
```

## 6. Event-landing: правки

### 6.1 Топбар-счётчик артефактов

Текущее (line 350):
```html
<div class="right">7 артефактов</div>
```

→
```html
<div class="right"><!-- evt:artifact-count -->7 артефактов<!-- /evt --></div>
```

`event-landing-build` вычисляет: `artifact-count = "<N прописью> артефактов"` где N = `DATA.artifacts.length`, согласование «артефакт/артефакта/артефактов» по числу:
- 1 → «один артефакт»
- 2..4 → «<N прописью> артефакта»
- 5+ → «<N прописью> артефактов»

### 6.2 Hero-stats (Где/Когда/Кто/Что)

Текущее (lines 360-365):
```html
<div class="hero-meta">
  <div><b>Где</b>Пятигорск</div>
  <div><b>Когда</b>5 дней</div>
  <div><b>Кто</b>~280 педагогов</div>
  <div><b>Что</b>11+7 лекций</div>
</div>
```

→
```html
<div class="hero-meta">
  <!-- evt-if:event-location --><div><b>Где</b><!-- evt:event-location -->Пятигорск<!-- /evt --></div><!-- /evt-if -->
  <!-- evt-if:event-duration --><div><b>Когда</b><!-- evt:event-duration -->5 дней<!-- /evt --></div><!-- /evt-if -->
  <!-- evt-if:event-participants --><div><b>Кто</b><!-- evt:event-participants -->~280 педагогов<!-- /evt --></div><!-- /evt-if -->
  <!-- evt-if:event-content-summary --><div><b>Что</b><!-- evt:event-content-summary -->11+7 лекций<!-- /evt --></div><!-- /evt-if -->
</div>
```

`event-duration` — НОВЫЙ маркер: короткая форма продолжительности «5 дней» / «3 дня». Отличается от `event-dates` (полный диапазон с датами «28 апреля — 2 мая 2026», используется в manifesto signature).

### 6.3 Section-eye + timeline

Текущее (lines 367+):
```html
<div class="section-eye">Программа · 5 дней</div>
<section class="timeline">
  <div class="day">...</div>  <!-- 4 хардкод дня -->
</section>
```

→
```html
<!-- evt-if:program-has-content -->
<div class="section-eye"><!-- evt:program-section-title -->Программа · 5 дней<!-- /evt --></div>
<section class="timeline" id="timeline"></section>
<!-- /evt-if -->
```

Контейнер `<section class="timeline">` опустошается. Заполняется JS-ренджером из `DATA.timeline[]`:

```js
DATA.timeline = [
  { name: "Вторник", date: "28 апреля", rows: [
    { time: "15:00", text: "Заезд, размещение, регистрация", artifactN: null },
    { time: "17:00", text: "Бризицкий · ИИ: современный фронтир", artifactN: 1 },
    ...
  ]},
  ...
];
```

JS-рендерер использует только safe DOM API (`createElement`, `textContent`, `setAttribute`, `appendChild`, `dataset`). NO `innerHTML`/`outerHTML`/`insertAdjacentHTML` — security hook блокирует.

`event-landing-build` собирает `DATA.timeline`:
1. Парсит `program[i].date` (свободная форма: `"2026-04-28 17:00"` / `"28.04 17:00"` / `"вторник 28.04 15:00"`) в `{day_name, day_date_short, time}`.
2. Группирует записи `program[]` по дню.
3. Для каждой записи: row = `{time, text: "<lecturer-short> · <title>", artifactN: i.n}`.
4. Если в `.local.md` есть `event.timeline_extras: [{day_date, time, text}]` — вмешивает в правильный день, отсортировано по времени.
5. Если результат `DATA.timeline.length === 0` → передаёт `program-has-content = null` в markers (блок исчезает).

`program-section-title` — «Программа · `<N> дней`» где N = `DATA.timeline.length`. Передаётся только если N > 0.

### 6.4 Artifact-card render

Файл: render-функция `renderCard()` в `templates/event-landing/template.html` (~lines 451-510).

**Правка (a)**: удалить блок `art-sub` («к лекции · X») целиком. Лектор уже показан в `art-meta` ниже.

**Правка (b)**: дату показать условно:

```js
if (a.date) {
  const metaDate = document.createElement('span');
  const metaDateB = document.createElement('b');
  metaDateB.textContent = 'дата:';
  metaDate.appendChild(metaDateB);
  metaDate.appendChild(document.createTextNode(' ' + a.date));
  meta.appendChild(metaDate);
}
```

`event-landing-build` пробрасывает `a.date` только при наличии `program[i].date`; иначе `null`.

## 7. Skill updates

### 7.1 `lecture-artifact-build/SKILL.md` (per-artifact orchestrator)

Step 8 «Build the event.json» переработан. Список markers:
- УБИРАЕМ из стандартного списка: `lecture-title` (eyebrow удалён в §5.1).
- ДОБАВЛЯЕМ:
  - `lecture-when` ← `program[i].when` ИЛИ компонует из `program[i].date` + `program[i].hall`. Любая часть отсутствует — пропускается. Если ни одной — `null` → блок исчезает.
  - `lecture-slot` ← `program[i].slot`. `null` → блок исчезает. (Релевантно для manifesto.)
- Условные event-маркеры (`event-location`, `event-dates`, `event-participants`, `event-content-summary`) — пробрасываются только если поле есть в `event.*` в `.local.md`. Если поле отсутствует/`null` → маркер не передаётся → `evt-if` блок исчезает.

Контракт для скилла: «передавать маркер только если есть значение; пустые/null маркеры → блок удаляется».

### 7.2 `event-landing-build/SKILL.md`

Step 4 («Build data») добавляется построение `DATA.timeline` (§6.3, шаги 1–5).

Step 5 («Build event.json») markers map обрастает:
- `artifact-count` ← `<N прописью> <согласованное артефакт-N>`.
- `event-duration` ← `event.duration` (опционально, новое поле).
- `program-section-title` ← `Программа · <N> дней` где N = `DATA.timeline.length`. Передаётся только если `N > 0`.
- `program-has-content` ← truthy строка (например `"true"`) если timeline непустой; иначе omit (блок section-eye+timeline исчезает).

Все условные маркеры передаются ТОЛЬКО при наличии значения.

### 7.3 `event-init/SKILL.md` + `references/event-config-format.md`

Расширяется опросник `/init`. Новые опциональные поля:

**Event-level (`.local.md` → `event:`):**
- `duration`: «5 дней» / «3 дня» (короткая форма для landing hero-stats `Когда`).
- `timeline_extras`: массив `[{day_date, time, text}]` — не-лекционные события (заезд, обсуждение, командообразование). Опционально.

**Program-level (`.local.md` → `program[i]`):**
- `slot`: формат лекции («мИИтинг + презентация»). Опционально.
- `when`: готовая человекочитаемая строка времени (alternative to `date`+`hall`). Опционально.

Все 4 поля опциональны. `/init` спрашивает только если пользователь явно соглашается дополнить — иначе пропускает. Per-artifact команды и `event-landing` гладко проваливаются на пустые значения через `evt-if`.

`event-config-format.md` обновляется новыми полями в YAML-фронтматтере.

## 8. Тестирование

1. **`inject-data.test.mjs`**: 3 новых теста на `applyConditionals` (см. §4.2). Итого 17 + 3 = 20 тестов.
2. **Перегенерация всех 8 goldens.** event.json fixtures без изменений → большинство `evt-if` блоков исчезнут на goldens, expected.html станет короче (это правильное поведение — фикстуры представляют sparse-сценарий «программа не задана»).
3. **Rich-вариант для manifesto.** Добавить `manifesto.event-rich.json` со ВСЕМИ маркерами (location/dates/participants/content-summary/lecture-when/lecture-slot/page-title/lecture-title) + golden `manifesto.expected-rich.html`. Тест: `inject(manifesto.template.html, manifesto.example-data.json, manifesto.event-rich.json) === manifesto.expected-rich.html`. Это покрывает оба пути (kept/removed) для нескольких `evt-if` блоков.
4. **Smoke-проверка landing timeline render.** Поскольку рендер JS-driven, golden-снапшот покрывает только статическую часть. Smoke-чеклист в `references/release-smoke.md` дополнить шагом «открыть собранный landing в браузере; убедиться, что timeline показывает реальные дни и строки из `program[]`».

## 9. Версии

- `lecture-artifacts` 0.2.0 → **0.3.0**.
- `marketplace` 1.1.0 → **1.2.0**.
- CHANGELOG `lecture-artifacts`: блок про conditional rendering, удаление `evt:lecture-title` eyebrow, новые поля в `.local.md`, новый маркер `evt:artifact-count`/`event-duration`/`program-has-content`/`program-section-title`/`lecture-when`/`lecture-slot`.
- CHANGELOG marketplace: однострочка про 0.3.0 (потенциально breaking — clients использовавшие `evt:lecture-title` в кастомных шаблонах должны мигрировать).

## 10. Риски и митигации

| Риск | Митигация |
|------|-----------|
| Некорректный парсинг `program[i].date` ломает `DATA.timeline` | Resilient парсер в `event-landing-build` SKILL.md: при невалидной дате — fallback на «неопределённый день», таймлайн всё равно строится |
| `evt-if` regex non-greedy ломается на nested случаях | В шаблонах не используем nested. Документируется в `references/adding-new-template.md`. Если понадобится — отдельный спек на nested-supporting парсер |
| Удаление `evt:lecture-title` ломает кастомные шаблоны клиентов, использующих этот маркер | CHANGELOG помечает как breaking. Alternativно — оставить маркер в SKILL.md как опциональный (для совместимости), просто не использовать в шаблонах из коробки. Принимаем breaking — у нас нет внешних клиентов |
| Manifesto rich-fixture устаревает при правках | Добавлен в `release-smoke.md` — проверять перед релизом |

## 11. Высокоуровневый порядок реализации

(Детальный пошаговый план — отдельным документом через `superpowers:writing-plans`.)

1. Расширить `inject-data.mjs` функцией `applyConditionals` + 3 теста.
2. Удалить `evt:lecture-title` eyebrow из 5 (или 7) шаблонов.
3. Обернуть hero-meta/signature/landing-зоны в `evt-if`.
4. Перегенерировать 8 goldens.
5. Добавить rich-фикстуру для manifesto + golden.
6. Обновить `lecture-artifact-build` / `event-landing-build` / `event-init` SKILL.md и `references/event-config-format.md`.
7. Рефакторинг landing timeline в DATA-driven рендер (только safe DOM).
8. Bump версий, CHANGELOG.
9. Один коммит.
