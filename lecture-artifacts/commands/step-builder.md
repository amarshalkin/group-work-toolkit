---
description: Собрать пошаговый ветвящийся конструктор (например, урок) с тремя голосами экспертов на каждом шаге.
argument-hint: <путь-к-расшифровке.md|.txt|.docx>
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion, Skill
---

Запусти скилл `lecture-artifacts:lecture-artifact-build` с параметрами:

- `template`: `step-builder`
- `transcript`: `$ARGUMENTS`

В ответе пользователю покажи путь к HTML, URL (если есть), QR (если есть) и одну строчку: «N шагов с M вариантами на каждом сгенерировано из расшифровки».
