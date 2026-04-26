---
description: Собрать страницу-манифест события из расшифровки лекции (или нескольких) и опубликовать через knottasoft:host-html, если плагин установлен.
argument-hint: <путь-к-расшифровке.md|.txt|.docx>
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion, Skill
---

Запусти скилл `lecture-artifacts:lecture-artifact-build` со следующими параметрами:

- `template`: `manifesto`
- `transcript`: `$ARGUMENTS` (путь к файлу расшифровки; если пусто — спроси у пользователя через AskUserQuestion)

Скилл сам прочитает `.claude/lecture-artifacts.local.md`, найдёт нужную лекцию в программе, сгенерирует JSON по `templates/manifesto/schema.md`, соберёт HTML и (если возможно) опубликует.

В ответе пользователю покажи:
- Путь к собранному HTML.
- URL опубликованной страницы (если есть) и путь/URL QR-кода.
- Одну строчку: «X тезисов сгенерировано из расшифровки, Y ссылок добавлено в links[] из уже опубликованных артефактов».
