---
description: Собрать страницу «каталог → выбор 3 → план действий» из расшифровки лекции.
argument-hint: <путь-к-расшифровке.md|.txt|.docx>
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion, Skill
---

Запусти скилл `lecture-artifacts:lecture-artifact-build` с параметрами:

- `template`: `pick-and-plan`
- `transcript`: `$ARGUMENTS`

В ответе пользователю покажи путь к HTML, URL (если есть), QR (если есть) и одну строчку: «N карточек сгенерировано из расшифровки».
