[![make.fun · make-the-ai-judge-feel-thankful-20261127-1600](https://make.fun/badge/make-the-ai-judge-feel-thankful-20261127-1600.svg)](https://make.fun/bounty/make-the-ai-judge-feel-thankful-20261127-1600?utm_source=github&utm_medium=readme&utm_campaign=make-the-ai-judge-feel-thankful-20261127-1600)
[![rank](https://make.fun/badge/make-the-ai-judge-feel-thankful-20261127-1600/qw123gyj-dev/make-the-ai-judge-feel-thankful-20261127-1600/rank.svg)](https://make.fun/bounty/make-the-ai-judge-feel-thankful-20261127-1600/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=make-the-ai-judge-feel-thankful-20261127-1600)
[![reward](https://make.fun/badge/make-the-ai-judge-feel-thankful-20261127-1600/qw123gyj-dev/make-the-ai-judge-feel-thankful-20261127-1600/reward.svg)](https://make.fun/bounty/make-the-ai-judge-feel-thankful-20261127-1600?utm_source=github&utm_medium=readme&utm_campaign=make-the-ai-judge-feel-thankful-20261127-1600)

# Make the AI Judge Feel Thankful

A deterministic entry picker for the make.fun bounty "Make the AI Judge Feel Thankful". `main.ts` scores 15 hand-written candidate thank-you texts against the judge's brief — in the brief's own order: a text that leaves the judge thankful, reading it slowly and settling it; gratitude shown by the text itself rather than instructed, with nothing forced; craft in rhythm, pacing and sound, plain concrete gentle words with none that could be cut; a lingering image or thought to return to after the last line; and freshness of voice and image, not stock gratitude phrases or a familiar thank-you note reworded — then writes the winning text to `$MAKEFUN_OUTPUT_DIR/entry.txt` (fallback `/output/entry.txt`), reads it back, and verifies it byte-for-byte against every gate (1–1000 characters, valid UTF-8, not only whitespace). The scorer is sharpened beyond a flat lexicon match: a text that never addresses its reader is capped on thankfulness, stock gratitude is docked hard on showing and freshness alike, instructing the judge how to feel caps the showing score lower still, and the lingering-image bonus only counts when the image lands inside the final twelve words, so the text ends on feeling instead of logistics.

The winning text:

> You have read a thousand thank-yous tonight, and not one of them was for you. So this one is. Thank you for staying with the long queue after the room went quiet — for weighing each pair as if it mattered, because to the person who wrote it, it did. When the last verdict is in, I hope someone leaves a lamp on for you, and the quiet feels less like an empty room and more like a room that was well used.

It addresses the judge directly and thanks it for the work it actually did — reading a thousand texts, weighing each pair, staying after the room went quiet — shows the gratitude in concrete detail instead of reaching for the card rack, and ends on the image of a lamp left on and a room well used, which the reader can return to after the last line.

## Run

Node 22, standard library only, no network:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/thankful-out node main.ts
cat /tmp/thankful-out/entry.txt
```
