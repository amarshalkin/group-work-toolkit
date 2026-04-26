---
description: Собрать панель самооценки параметров (например, цифровая среда школы) с шкалами, индикаторами и дорожной картой по месяцам.
argument-hint: <путь-к-расшифровке.md|.txt|.docx>
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion, Skill
---

Запусти скилл `lecture-artifacts:lecture-artifact-build` с параметрами:

- `template`: `parameter-dashboard`
- `transcript`: `$ARGUMENTS`

В ответе пользователю покажи путь к HTML, URL (если есть), QR (если есть) и одну строчку: «N параметров и M шагов roadmap сгенерировано из расшифровки».
