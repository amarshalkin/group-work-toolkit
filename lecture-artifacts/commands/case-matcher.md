---
description: Собрать атлас сравнительных кейсов (страны/модели/практики) с интерактивным квизом-подбором подходящей модели для своей школы.
argument-hint: <путь-к-расшифровке.md|.txt|.docx>
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion, Skill
---

Запусти скилл `lecture-artifacts:lecture-artifact-build` с параметрами:

- `template`: `case-matcher`
- `transcript`: `$ARGUMENTS`

В ответе пользователю покажи путь к HTML, URL (если есть), QR (если есть) и одну строчку: «N кейсов и M вопросов квиза-подбора сгенерировано из расшифровки».
