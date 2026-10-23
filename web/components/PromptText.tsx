/**
 * `[Bracketed]` stretches of a prompt are the parts a reader is meant to change
 * — a colour, a brand name, a dish. Matches one line at most, so a stray `[`
 * cannot highlight the rest of the prompt.
 */
const PLACEHOLDER = /(\[[^\]\n]{1,80}\])/;

export const hasPlaceholders = (text: string) => PLACEHOLDER.test(text);

/** A prompt body with its placeholders picked out. Copying still takes the plain text. */
export default function PromptText({ text }: { text: string }) {
  return text.split(PLACEHOLDER).map((part, i) =>
    // split() with a capture group puts every match at an odd index.
    i % 2 === 1 ? (
      <mark key={i} className="placeholder">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
