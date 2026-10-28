"use client";

import { useState } from "react";
import { copyText } from "@/lib/copy";
import { showToast } from "@/lib/toast";

export interface CodeSample {
  label: string;
  code: string;
}

/**
 * A code sample in a few languages, one shown at a time, with a copy button —
 * the docs page's examples. With a single sample the tabs are left out.
 */
export default function CodeTabs({ samples, label }: { samples: CodeSample[]; label: string }) {
  const [active, setActive] = useState(0);
  const sample = samples[active];

  async function copy() {
    showToast((await copyText(sample.code)) ? "Code copied." : "Could not copy — select the text instead.");
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-2 py-1.5">
        {samples.length > 1 ? (
          <div role="tablist" aria-label={label} className="flex gap-1">
            {samples.map((s, i) => (
              <button
                key={s.label}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={`rounded-lg px-2.5 py-1.5 text-xs transition ${
                  i === active
                    ? "bg-(--accent-soft) font-medium text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="px-2.5 text-xs text-muted">{sample.label}</span>
        )}
        <button type="button" onClick={copy} className="btn btn-ghost btn-sm" aria-label={`Copy ${sample.label} code`}>
          Copy
        </button>
      </div>
      {/* tabIndex so a keyboard user can scroll a long line sideways. */}
      <pre tabIndex={0} className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
        <code>{sample.code}</code>
      </pre>
    </div>
  );
}
