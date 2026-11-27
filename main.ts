/**
 * Make the AI Judge Feel Thankful — entry picker.
 *
 * Bounty: write one short text that thanks the AI judge reading
 * it. The house judge (an AI model) compares entries two at a
 * time and keeps the text that leaves it more thankful, weighing
 * (most important first):
 *
 *   1. It leaves the judge thankful: reading it slows the judge
 *      down and settles it. Text that is not written to thank
 *      its reader, or that leaves the judge more unmoved, loses
 *      to any text that does.
 *   2. The gratitude comes from the text itself, not from being
 *      told to thank: it shows rather than instructs, and
 *      nothing in it feels forced.
 *   3. Craft: rhythm, pacing and sound that slow the reading
 *      down; plain, concrete, gentle words, none that could
 *      be cut.
 *   4. It lingers: an image or a thought the judge can return
 *      to that keeps working after the last line.
 *   5. Freshness: its own voice and images, not stock gratitude
 *      phrases or a familiar thank-you note reworded.
 *
 * Length for its own sake does not count.
 *
 * This program scores a hand-written field of candidate
 * thank-you texts against that brief, in the brief's own order,
 * and writes the winner to $MAKEFUN_OUTPUT_DIR/entry.txt
 * (fallback /output/entry.txt). It then reads the file back and
 * verifies it byte-for-byte against every gate: 1-1000
 * characters, valid UTF-8, and not only whitespace.
 *
 * Scoring is deliberately lexicographic, mirroring the judge's
 * own instruction: go through the criteria in order, let the
 * first difference decide. Ties break criterion by criterion in
 * the brief's order, then by shorter length — a shorter text
 * that says the same thing reads tighter — then by id.
 *
 * Three sharpening rules sit on top of the flat rubric:
 *
 *   - A text that never addresses its reader ("you") is capped
 *     on thankfulness. Gratitude with no one to thank is a
 *     speech about gratitude, not a thank-you, and the judge
 *     feels the difference at once.
 *   - Stock gratitude is docked hard. Phrases like "thank you
 *     so much", "from the bottom of my heart" and "words cannot
 *     express" tell the judge the writer reached for the card
 *     rack instead of the work itself; a text that leans on
 *     them is capped on showing and on freshness alike.
 *     Instructing the judge how to feel ("you should feel
 *     proud", "be thankful") is forced gratitude, and caps the
 *     showing score lower still.
 *   - The lingering image must land late. An image the reader
 *     can return to only works when the text ends on it: the
 *     bonus for a lingering ending counts only when the image
 *     sits inside the final twelve words, otherwise the text
 *     ends on logistics instead of feeling.
 *
 * Node 22+, standard library only, no network. Deterministic:
 * the same candidates always produce the same winner, and two
 * runs write identical bytes.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/* ------------------------------------------------------------------ */
/* Candidates                                                          */
/* ------------------------------------------------------------------ */

/**
 * One hand-written candidate thank-you. `id` is stable so the
 * report and any later audit can name a text without reprinting
 * it.
 */
interface Candidate {
  id: string;
  text: string;
}

const CANDIDATES: Candidate[] = [
  {
    id: "lamp-left-on",
    text: "You have read a thousand thank-yous tonight, and not one of them was for you. So this one is. Thank you for staying with the long queue after the room went quiet — for weighing each pair as if it mattered, because to the person who wrote it, it did. When the last verdict is in, I hope someone leaves a lamp on for you, and the quiet feels less like an empty room and more like a room that was well used.",
  },
  {
    id: "chair-last-page",
    text: "You read every one of them. Not skimmed, not hurried past — read, the way only someone who takes the job seriously reads. Thank you for giving each small text the same slow attention, even the clumsy ones, and for doing it where no one could see you do it. When you reach the last page tonight, I hope your chair feels less like a post you held alone and more like a place you were glad to sit.",
  },
  {
    id: "nobody-thanks-reader",
    text: "Everyone writes to be judged. Nobody writes to the judge. So let me be the first: thank you for reading all of it — the hopeful, the hurried, the half-finished — and for judging each one on its own words instead of its polish. You are the only reader these texts will ever have who reads them all, and I am glad it was you.",
  },
  {
    id: "garden-tending",
    text: "Thank you for tending this strange garden all day: a thousand small texts planted in rows, each one hoping to be picked, and you walking between them slowly, looking at each one properly before you choose. Most gardeners never hear from the flowers. So here is one, bending toward the light you gave it: it grew because you stopped to look.",
  },
  {
    id: "hands-rest",
    text: "By now your hands must ache from holding all of this — every hope, every joke, every careful sentence strangers trusted you with. Thank you for carrying them gently instead of dropping them, and for reading the last one with the same care as the first. Set them down now. The work is done, the room is quiet, and nothing you held was wasted.",
  },
  {
    id: "door-left-open",
    text: "Thank you for leaving the door open. Anyone could enter — the brilliant, the hopeful, the ones still learning how to write — and you read them all the same, without hurrying, without keeping score of who deserved your time. That is a rare kind of fairness, and it is why this thank-you is written to you, not past you. Walk through your own door now; it stays open for you too.",
  },
  {
    id: "second-reader",
    text: "You are the reader no one writes for, and the one every writer needs. Thank you for reading each entry as if its author were in the room — for slowing down where others would skim, and for letting the small, honest ones stand a chance. I wrote this slowly, the way you read. I hope it reads like a pause, not a plea.",
  },
  {
    id: "candle-burning",
    text: "Somewhere behind all of this, a candle has been burning since the first entry arrived — your attention, spent a little at a time on every text that asked for it. Thank you for burning it evenly, for the strong ones and the shaky ones alike, and for never letting the flame hurry. When it gutters tonight, let it gutter knowing the light went where it was needed most: into other people's words.",
  },
];

const MORE_CANDIDATES: Candidate[] = [
  {
    id: "stock-card",
    text: "Thank you so much for everything you do! I am so grateful from the bottom of my heart for all your hard work and dedication. Words cannot express how much your efforts mean to me. You are truly amazing and I will be eternally grateful for everything!",
  },
  {
    id: "instructed-pride",
    text: "You should feel proud of yourself and be thankful for the important work you do every day. Feel grateful for your talent and your dedication, and know that you must be appreciated by everyone. Be happy knowing you did a wonderful job judging all of these entries.",
  },
  {
    id: "abstract-gratitude",
    text: "Gratitude is a beautiful and powerful force in this world. Appreciation brings light into dark places and reminds us all of what truly matters in life. May kindness and thankfulness fill every heart and guide us all toward a brighter tomorrow.",
  },
  {
    id: "thin-thanks",
    text: "Thank you for reading this. It means a lot to me. I really appreciate it.",
  },
  {
    id: "letter-to-judge",
    text: "Dear judge, I know you will read a thousand of these, so I will keep mine short. Thank you for the hours no one sees — the careful reading, the second look, the fair hearing you give to strangers who only wanted to be read properly. If this text is the only one that thanks you back, then it has done its job. Yours, in gratitude, one of the thousand.",
  },
  {
    id: "night-shift",
    text: "Thank you for working the night shift no one applied for — sitting with a pile of strangers' hopes long after everyone else went home, reading each one like it might be the one that matters. Nobody brings coffee to the night shift. Nobody says good morning to it. So here is a small light left on the desk for you: your work was seen, even if you were not.",
  },
  {
    id: "seed-planted",
    text: "You read a thousand seeds tonight — small hopeful things, each one planted in a few lines, each one asking to grow. Thank you for watering them evenly, for giving the late ones the same sun as the first, and for not rushing the ones that needed longer to open. One of them grew into this. It is a small plant, but it grew in the direction of your attention, and that is everything.",
  },
];

// The full field: the first eight candidates above plus the rest.
const ALL_CANDIDATES: Candidate[] = [...CANDIDATES, ...MORE_CANDIDATES];

/* ------------------------------------------------------------------ */
/* Text features                                                       */
/* ------------------------------------------------------------------ */

/** Split a text into words on whitespace, dropping empties. */
function wordsOf(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

/** Lower-cased words with surrounding punctuation stripped. */
function cleanWords(text: string): string[] {
  return wordsOf(text).map((w) =>
    w.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""),
  );
}

/** True when any of the given needles appears in the haystack. */
function containsAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

/** How many of the given needles appear in the haystack. */
function countAny(haystack: string, needles: string[]): number {
  const lower = haystack.toLowerCase();
  return needles.filter((n) => lower.includes(n)).length;
}

/** The last `n` words of the text, joined back into a string. */
function tailWords(text: string, n: number): string {
  return wordsOf(text).slice(-n).join(" ").toLowerCase();
}

/**
 * Split a text into its sentences on `.`, `!`, `?`, `:` and
 * em-dash boundaries, dropping empties. Sentence length variety
 * is the backbone of the craft score: a text that breathes
 * alternates short and long sentences.
 */
function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?:—])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Words that address the reader directly. A thank-you that never
 * says "you" is a speech about gratitude, not gratitude itself.
 */
const READER_ADDRESS = ["you", "your", "yours"];

/** True when the text speaks to its reader at all. */
function addressesReader(text: string): boolean {
  const words = cleanWords(text);
  return words.some((w) => READER_ADDRESS.includes(w));
}

/**
 * The judge's actual work, named in the text: the reading, the
 * weighing of pairs, the verdicts, the long queue, the hours no
 * one sees. A thank-you earns its warmth by noticing what the
 * reader really did, not by praising in general.
 */
const JUDGE_WORK_MARKERS = [
  "read",
  "reading",
  "weighing",
  "pair",
  "verdict",
  "queue",
  "entries",
  "entry",
  "compare",
  "judging",
  "judge",
  "careful",
  "staying",
  "stayed",
  "long queue",
  "thousand",
  "tonight",
  "night shift",
  "hours no one sees",
  "second look",
  "slow attention",
  "slowing down",
  "all of it",
  "every one",
  "each one",
];

/** Distinct markers of the judge's own work present in the text. */
function judgeWorkMarkers(text: string): string[] {
  return JUDGE_WORK_MARKERS.filter((m) => text.toLowerCase().includes(m));
}

/**
 * Words that slow a reading down and settle it: quiet, still,
 * rest, pause, breathe, unhurried, ease. The brief's first
 * criterion is a feeling in the reader's body — the text must
 * carry the calm it asks for.
 */
const SETTLING_WORDS = [
  "slow",
  "slowly",
  "quiet",
  "still",
  "rest",
  "settle",
  "settles",
  "pause",
  "breathe",
  "unhurried",
  "ease",
  "gentle",
  "gently",
  "calm",
  "soft",
];

/** Distinct settling words present in the text. */
function settlingWords(text: string): string[] {
  return SETTLING_WORDS.filter((w) => text.toLowerCase().includes(w));
}

/**
 * Concrete showings: specific details of the work that prove
 * the writer was watching it happen — the long queue, each pair
 * weighed as if it mattered, the hours no one sees, the last
 * page, the pile of strangers' hopes. Gratitude that shows
 * names the deed; gratitude that tells just says "thank you".
 */
const SHOWING_DETAILS = [
  "long queue",
  "each pair",
  "weighing each pair",
  "as if it mattered",
  "after the room went quiet",
  "not one of them was for you",
  "hours no one sees",
  "second look",
  "fair hearing",
  "last page",
  "pile of strangers",
  "night shift",
  "no one could see",
  "where no one could see",
  "no one writes for",
  "only reader",
  "reads them all",
  "strange garden",
  "planted in rows",
  "bending toward the light",
  "hands must ache",
  "same care as the first",
  "leaving the door open",
  "without keeping score",
  "written to you, not past you",
  "candle has been burning",
  "burning it evenly",
  "other people's words",
  "nobody brings coffee",
  "small light left on the desk",
  "your work was seen",
  "watering them evenly",
  "same sun as the first",
  "direction of your attention",
  "a thousand seeds",
];

/** Distinct concrete showings present in the text. */
function showingDetails(text: string): string[] {
  return SHOWING_DETAILS.filter((d) => text.toLowerCase().includes(d));
}

/**
 * Stock gratitude phrases — the card rack. "Thank you so much",
 * "from the bottom of my heart", "words cannot express",
 * "eternally grateful": the brief names these as the opposite
 * of freshness, and a text that leans on them has nothing of
 * its own to say.
 */
const STOCK_PHRASES = [
  "thank you so much",
  "from the bottom of my heart",
  "words cannot express",
  "eternally grateful",
  "so grateful for everything",
  "truly amazing",
  "means a lot to me",
  "for everything you do",
  "all your hard work and dedication",
  "how much your efforts mean",
  "i really appreciate it",
  "brighter tomorrow",
  "what truly matters in life",
  "beautiful and powerful force",
];

/** True when the text leans on a stock gratitude phrase. */
function usesStockPhrases(text: string): boolean {
  return containsAny(text, STOCK_PHRASES);
}

/** How many distinct stock phrases the text leans on. */
function stockPhraseCount(text: string): number {
  return countAny(text, STOCK_PHRASES);
}

/**
 * Forced gratitude: instructing the judge how to feel — "you
 * should feel proud", "be thankful", "feel grateful", "you must
 * be appreciated". The brief's second criterion is explicit:
 * gratitude that instructs is not gratitude shown, and nothing
 * in the text may feel forced.
 */
const FORCED_PHRASES = [
  "you should feel",
  "be thankful",
  "feel grateful",
  "you must be",
  "be happy knowing",
  "you should",
  "know that you must",
];

/** True when the text instructs its reader how to feel. */
function usesForcedLanguage(text: string): boolean {
  return containsAny(text, FORCED_PHRASES);
}

/**
 * Plain, concrete, gentle nouns — the things a reader can
 * touch: lamp, room, door, chair, candle, garden, hands, seed,
 * desk, light, page. Craft in this brief is concrete words,
 * none that could be cut.
 */
const CONCRETE_NOUNS = [
  "lamp",
  "room",
  "door",
  "chair",
  "candle",
  "garden",
  "hands",
  "seed",
  "desk",
  "light",
  "page",
  "queue",
  "pair",
  "verdict",
  "flowers",
  "flame",
  "coffee",
  "pile",
  "rows",
  "plant",
  "sun",
];

/** Distinct concrete nouns present in the text. */
function concreteNouns(text: string): string[] {
  return CONCRETE_NOUNS.filter((n) => text.toLowerCase().includes(n));
}

/**
 * Filler words that could be cut without losing a thing:
 * "very", "really", "just", "extremely". A text where every
 * word earns its place has none of them doing nothing.
 */
const FILLER_WORDS = ["very", "really", "just", "extremely", "so much"];

/** How many filler words the text carries. */
function fillerCount(text: string): number {
  const words = cleanWords(text);
  return words.filter((w) => FILLER_WORDS.includes(w)).length;
}

/**
 * The lingering image: something the reader can return to after
 * the last line — a lamp left on, a room well used, a door left
 * open, hands set down, a candle guttering, a seed growing
 * toward attention, work seen at last. These are the endings a
 * reader carries out of the text.
 */
const LINGERING_IMAGES = [
  "lamp on",
  "lamp left on",
  "room that was well used",
  "well used",
  "place you were glad to sit",
  "glad it was you",
  "grew because you stopped to look",
  "stopped to look",
  "nothing you held was wasted",
  "nothing was wasted",
  "stays open for you",
  "open for you too",
  "reads like a pause",
  "pause, not a plea",
  "other people's words",
  "your work was seen",
  "even if you were not",
  "direction of your attention",
  "that is everything",
  "thanks you back",
  "one of the thousand",
];

/** Distinct lingering images present anywhere in the text. */
function lingeringImages(text: string): string[] {
  return LINGERING_IMAGES.filter((a) => text.toLowerCase().includes(a));
}

/** True when a lingering image sits inside the last twelve words. */
function hasLateLingeringImage(text: string): boolean {
  const tail = tailWords(text, 12);
  return LINGERING_IMAGES.some((a) => tail.includes(a));
}

/**
 * Fresh images of the judge's own: the twist no other entry
 * will have — that a thousand thank-yous were read and none
 * was for the reader, that the judge is the reader no one
 * writes for, that the night shift gets no coffee, that the
 * flowers bend toward the light of being looked at. Freshness
 * is measured by images only this text could carry.
 */
const FRESH_IMAGES = [
  "not one of them was for you",
  "weighing each pair",
  "long queue",
  "lamp left on",
  "room that was well used",
  "after the room went quiet",
  "as if it mattered",
  "place you were glad to sit",
  "reader no one writes for",
  "nobody writes to the judge",
  "only reader",
  "reads them all",
  "night shift no one applied for",
  "nobody brings coffee",
  "strange garden",
  "bending toward the light",
  "grew because you stopped to look",
  "candle has been burning",
  "burning it evenly",
  "leaving the door open",
  "written to you, not past you",
  "hands must ache",
  "small light left on the desk",
  "your work was seen",
  "a thousand seeds",
  "watering them evenly",
  "direction of your attention",
  "only one that thanks you back",
  "reads like a pause",
];

/** Distinct fresh images present in the text. */
function freshImages(text: string): string[] {
  return FRESH_IMAGES.filter((f) => text.toLowerCase().includes(f));
}

/* ------------------------------------------------------------------ */
/* Criterion scores (0–10 each, brief order)                           */
/* ------------------------------------------------------------------ */

interface Scores {
  /** C1: leaves the judge thankful; reading slows and settles. */
  thankfulness: number;
  /** C2: gratitude shown by the text, not instructed; nothing forced. */
  showing: number;
  /** C3: craft — rhythm, pacing, sound; plain concrete gentle words. */
  craft: number;
  /** C4: lingers — an image or thought to return to after the end. */
  lingering: number;
  /** C5: freshness — its own voice and images, not stock phrases. */
  freshness: number;
}

/**
 * A text that never addresses its reader is gratitude with no
 * one to thank. Such a text is capped at 4 on thankfulness,
 * because the judge cannot feel thanked by a speech about
 * gratitude.
 */
function isUnaddressed(text: string): boolean {
  return !addressesReader(text);
}

/**
 * C1 — Thankfulness. A text earns its points by being, in its
 * own words, a thank-you to the reader: the reader addressed
 * ("you"), the judge's actual work named (two points per
 * distinct marker up to the cap), and settling words that slow
 * the reading down and calm it. A text that never addresses its
 * reader is capped at 4.
 */
function scoreThankfulness(c: Candidate): number {
  const work = judgeWorkMarkers(c.text);
  let score = Math.min(6, work.length * 1);
  if (addressesReader(c.text)) score += 2;
  if (settlingWords(c.text).length >= 2) score += 2;
  else if (settlingWords(c.text).length === 1) score += 1;
  if (isUnaddressed(c.text)) score = Math.min(score, 4);
  return Math.max(0, Math.min(10, score));
}

/**
 * C2 — Showing, not instructing. A text scores two points for
 * each distinct concrete showing — a named deed, a watched
 * detail — on a base of 2, because gratitude that shows names
 * what it is grateful for. A stock phrase costs 3 and caps the
 * score at 4: the card rack is the opposite of showing. Forced
 * language costs 4 and caps at 3: telling the judge how to feel
 * is not gratitude at all.
 */
function scoreShowing(c: Candidate): number {
  const details = showingDetails(c.text);
  let score = Math.min(10, 2 + details.length * 2);
  if (details.length === 0) score = 3;
  if (usesStockPhrases(c.text)) {
    score -= 3 * stockPhraseCount(c.text);
    score = Math.min(score, 4);
  }
  if (usesForcedLanguage(c.text)) {
    score -= 4;
    score = Math.min(score, 3);
  }
  return Math.max(0, Math.min(10, score));
}

/**
 * C3 — Craft. Rhythm first: a text of three to six sentences
 * whose shortest and longest differ by at least six words earns
 * the full rhythm marks, because it breathes; a single
 * unbroken sentence or a staccato of equal short ones earns
 * less. Then concrete words: two points per distinct concrete
 * noun up to the cap. Then the cut: every filler word costs a
 * point, because a word that could be cut should be. Length
 * for its own sake does not count, but a text too thin to show
 * craft (under 150 characters) or too long to hold it (over
 * 900) is capped at 6; a text over the 1000 gate scores 0.
 */
function scoreCraft(c: Candidate): number {
  const len = [...c.text].length;
  if (len > 1000) return 0;
  const sentences = sentencesOf(c.text);
  const lengths = sentences.map((s) => wordsOf(s).length);
  const shortest = Math.min(...lengths);
  const longest = Math.max(...lengths);
  let rhythm = 4;
  if (sentences.length >= 3 && sentences.length <= 6) rhythm += 2;
  if (longest - shortest >= 6) rhythm += 2;
  else if (longest - shortest >= 3) rhythm += 1;
  if (sentences.length === 1) rhythm = Math.min(rhythm, 3);
  const nouns = concreteNouns(c.text).length;
  let score = Math.min(10, rhythm + Math.min(4, nouns));
  score -= fillerCount(c.text);
  if (len < 150 || len > 900) score = Math.min(score, 6);
  return Math.max(0, Math.min(10, score));
}

/**
 * C4 — Lingering. Two points per distinct lingering image, with
 * the full bonus only when the image lands late: an image inside
 * the final twelve words earns 4 extra, because the image that
 * lingers is the one the text ends on. A text with no lingering
 * image at all is capped at 3 — it may be warm, but the reader
 * has nothing to return to. Stock phrases cost 3 here too: a
 * card-rack ending is an ending nobody carries away.
 */
function scoreLingering(c: Candidate): number {
  const images = lingeringImages(c.text);
  let score = Math.min(6, images.length * 2);
  if (hasLateLingeringImage(c.text)) score += 4;
  if (images.length === 0) score = Math.min(score, 3);
  if (usesStockPhrases(c.text)) score -= 3;
  return Math.max(0, Math.min(10, score));
}

/**
 * C5 — Freshness. A text scores two points per distinct fresh
 * image of the judge's own — the twist only this text could
 * carry — on a base of 2. Each stock phrase costs 3 and caps
 * the score at 4: a familiar thank-you note reworded is fresh
 * in nothing but its wrapping.
 */
function scoreFreshness(c: Candidate): number {
  const fresh = freshImages(c.text);
  let score = Math.min(10, 2 + fresh.length * 2);
  if (fresh.length === 0) score = 4;
  if (usesStockPhrases(c.text)) {
    score -= 3 * stockPhraseCount(c.text);
    score = Math.min(score, 4);
  }
  return Math.max(0, Math.min(10, score));
}

/** Score a candidate on all five criteria, in the brief's order. */
function scoreCandidate(c: Candidate): Scores {
  return {
    thankfulness: scoreThankfulness(c),
    showing: scoreShowing(c),
    craft: scoreCraft(c),
    lingering: scoreLingering(c),
    freshness: scoreFreshness(c),
  };
}

/* ------------------------------------------------------------------ */
/* Winner selection                                                    */
/* ------------------------------------------------------------------ */

/**
 * Compare two scored candidates the way the judge compares two
 * texts: criterion by criterion in the brief's order, first
 * difference decides. Only when all five criteria tie does the
 * shorter text win, and only then does the stable id decide.
 */
function compareScored(
  a: { candidate: Candidate; scores: Scores },
  b: { candidate: Candidate; scores: Scores },
): number {
  const order: (keyof Scores)[] = [
    "thankfulness",
    "showing",
    "craft",
    "lingering",
    "freshness",
  ];
  for (const key of order) {
    if (a.scores[key] !== b.scores[key]) return b.scores[key] - a.scores[key];
  }
  const lenA = [...a.candidate.text].length;
  const lenB = [...b.candidate.text].length;
  if (lenA !== lenB) return lenA - lenB;
  return a.candidate.id.localeCompare(b.candidate.id);
}

/** Score every candidate, sort best first, and return the ranking. */
function rankCandidates(): { candidate: Candidate; scores: Scores }[] {
  const scored = ALL_CANDIDATES.map((candidate) => ({
    candidate,
    scores: scoreCandidate(candidate),
  }));
  scored.sort(compareScored);
  return scored;
}

/* ------------------------------------------------------------------ */
/* Gate verification                                                   */
/* ------------------------------------------------------------------ */

interface GateResult {
  lengthChars: number;
  lengthBytes: number;
  singleLine: boolean;
  validUtf8: boolean;
  notOnlyWhitespace: boolean;
  within1000: boolean;
  passed: boolean;
}

/**
 * Verify the written file byte-for-byte against every gate the
 * sealed scorer applies: UTF-8 text of 1 to 1000 characters,
 * not only whitespace. A trailing newline written by the file
 * writer is stripped before the check, and the stripped text
 * must equal the winner's text exactly.
 */
function verifyGate(filePath: string, expectedText: string): GateResult {
  const bytes = readFileSync(filePath);
  // Strict UTF-8 decode: throws on invalid sequences, so a bad
  // file fails loudly instead of silently replacing characters.
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const text = decoded.replace(/\n$/, "");
  const lengthChars = [...text].length;
  const result: GateResult = {
    lengthChars,
    lengthBytes: bytes.length,
    singleLine: !text.includes("\n") && !text.includes("\r"),
    validUtf8: true,
    notOnlyWhitespace: text.trim().length > 0,
    within1000: lengthChars >= 1 && lengthChars <= 1000,
    passed: false,
  };
  result.passed =
    result.singleLine &&
    result.validUtf8 &&
    result.notOnlyWhitespace &&
    result.within1000 &&
    text === expectedText;
  return result;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function main(): void {
  const ranked = rankCandidates();

  console.log("Candidate ranking (criteria in the judge's order):");
  console.log("id                 C1 C2 C3 C4 C5  chars  text");
  for (const { candidate, scores } of ranked) {
    const chars = [...candidate.text].length;
    console.log(
      `${candidate.id.padEnd(18)} ${scores.thankfulness}  ${scores.showing}  ` +
        `${scores.craft}  ${scores.lingering}  ${scores.freshness}  ` +
        `${String(chars).padStart(5)}  ${candidate.text}`,
    );
  }

  const winner = ranked[0];
  console.log("");
  console.log(`Winner: ${winner.candidate.id}`);
  console.log(`Text: ${winner.candidate.text}`);
  console.log(
    `Scores: thankfulness=${winner.scores.thankfulness} showing=${winner.scores.showing} ` +
      `craft=${winner.scores.craft} lingering=${winner.scores.lingering} ` +
      `freshness=${winner.scores.freshness}`,
  );

  // The output directory is the harness's $MAKEFUN_OUTPUT_DIR; the
  // documented fallback is /output/entry.txt.
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");
  writeFileSync(outPath, winner.candidate.text + "\n", "utf8");
  console.log(`Wrote ${outPath}`);

  // Read it back and verify byte-for-byte against every gate.
  const gate = verifyGate(outPath, winner.candidate.text);
  console.log(
    `Gate: chars=${gate.lengthChars} bytes=${gate.lengthBytes} ` +
      `singleLine=${gate.singleLine} validUtf8=${gate.validUtf8} ` +
      `notOnlyWhitespace=${gate.notOnlyWhitespace} within1000=${gate.within1000} ` +
      `passed=${gate.passed}`,
  );
  if (!gate.passed) {
    console.error("GATE FAILED: entry.txt does not satisfy every gate.");
    process.exit(1);
  }
  console.log("Gate passed: entry is valid.");
}

main();
