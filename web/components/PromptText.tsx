import Marked from "./Marked";
import { PLACEHOLDER } from "@/lib/prompt";

export const hasPlaceholders = (text: string) => PLACEHOLDER.test(text);

/**
 * A prompt body with its placeholders picked out, and the library's search
 * words marked when given. Copying still takes the plain text.
 */
export default function PromptText({ text, highlight }: { text: string; highlight?: string }) {
  return text.split(PLACEHOLDER).map((part, i) =>
    // split() with a capture group puts every match at an odd index.
    i % 2 === 1 ? (
      <mark key={i} className="placeholder">
        {part}
      </mark>
    ) : (
      <Marked key={i} text={part} query={highlight} />
    ),
  );
}
