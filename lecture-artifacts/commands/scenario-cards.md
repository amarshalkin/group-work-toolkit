---
description: Собрать атлас тематических карточек, в каждой готовый практический сценарий 15-минутного фрагмента урока.
argument-hint: <путь-к-расшифровке.md|.txt|.docx>
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion, Skill
---

Запусти скилл `lecture-artifacts:lecture-artifact-build` с параметрами:

- `template`: `scenario-cards`
- `transcript`: `$ARGUMENTS`

В ответе пользователю покажи путь к HTML, URL (если есть), QR (если есть) и одну строчку: «N тематических карточек со сценариями сгенерировано из расшифровки».
