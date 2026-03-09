const FILLER_LINE_RE =
  /^(음+|어+|그+|막+|아+|어음+|음음+|저기|그냥|네+|예+|음\.\.\.|어\.\.\.)[.!?…~]*$/;

export function normalizeTranscript(input: string): string {
  if (!input) return "";

  const normalized = input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return true;
      if (line.length > 6) return true;
      return !FILLER_LINE_RE.test(line);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return normalized;
}

function splitParagraphToSentences(paragraph: string): string[] {
  const p = paragraph.trim();
  if (!p) return [];

  const regex =
    /(?<=[.!?…]|다\.|요\.|죠\.|함\.|임\.|니다\.|까요\?|겠죠\?|했죠\.|해요\.)\s+/g;

  const tokens = p
    .split(regex)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  return tokens.length > 0 ? tokens : [p];
}

export function splitIntoSentencesKorean(text: string): string[] {
  if (!text?.trim()) return [];

  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sentences: string[] = [];
  for (const line of lines) {
    const split = splitParagraphToSentences(line);
    for (const token of split) {
      const t = token.trim();
      if (t.length <= 2) continue;
      sentences.push(t);
    }
  }

  return sentences;
}
