# Marketplace changelog

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
