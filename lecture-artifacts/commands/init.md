---
description: Инициализировать или обновить общий конфиг события (`.claude/lecture-artifacts.local.md`). Опционально принимает путь к файлу с программой; недостающие поля добирает через AskUserQuestion.
argument-hint: [путь-к-программе.md|.yaml|.json]
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion
---

Запусти скилл `lecture-artifacts:event-init` с параметром `program-file=$ARGUMENTS` (если пусто — без параметра, скилл сам спросит у пользователя).

В конце покажи краткую сводку: название события, число лекций в программе, сколько шаблонов уже назначено, путь к созданному `.claude/lecture-artifacts.local.md`.
