# Marketplace changelog

## [1.2.0] — 2026-04-26

- `lecture-artifacts` 0.2.0 → 0.3.0: conditional rendering через директиву `evt-if`; удалён дублирующий lecture-title eyebrow; landing timeline теперь DATA-driven.

## [1.1.0] — 2026-04-26

- `lecture-artifacts` 0.1.0 → 0.2.0 (breaking marker contract change): динамические заголовки страниц, эпиграфы и статы события. Удалены hardcoded "Акт N", "№ NN".

## [1.0.0] — 2026-04-26

- Маркетплейс переименован: `group-work-toolkit` → `pedsovet`.
- GitHub repo переименован: `amarshalkin/group-work-toolkit` → `amarshalkin/pedsovet` (старый URL автоматически редиректится).
- Существующий плагин `group-work-toolkit` переехал из корня в подпапку.
- Добавлен второй плагин: `lecture-artifacts` v0.1.0.

### Миграция для пользователей

Если вы подключали маркетплейс по старому URL — он продолжит работать через GitHub-редирект, но рекомендуется обновить команду:

```bash
/plugin marketplace remove group-work-toolkit
/plugin marketplace add amarshalkin/pedsovet
```
