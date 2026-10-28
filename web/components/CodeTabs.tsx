"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
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
  const id = useId();
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  // The WAI-ARIA tabs pattern: one tab in the tab order, arrows move between
  // them, Home and End jump to the ends.
  function onTabKey(event: KeyboardEvent) {
    const last = samples.length - 1;
    const next =
      event.key === "ArrowRight" ? (active === last ? 0 : active + 1)
      : event.key === "ArrowLeft" ? (active === 0 ? last : active - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  async function copy() {
    if (await copyText(sample.code)) showToast("Code copied.");
    else showToast("Could not copy — select the text instead.", "error");
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-2 py-1.5">
        {samples.length > 1 ? (
          <div role="tablist" aria-label={label} className="flex gap-1" onKeyDown={onTabKey}>
            {samples.map((s, i) => (
              <button
                key={s.label}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${id}-tab-${i}`}
                aria-selected={i === active}
                aria-controls={`${id}-panel`}
                tabIndex={i === active ? 0 : -1}
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
      <pre
        tabIndex={0}
        className="overflow-x-auto p-4 font-mono text-xs leading-relaxed"
        {...(samples.length > 1 && {
          id: `${id}-panel`,
          role: "tabpanel",
          "aria-labelledby": `${id}-tab-${active}`,
        })}
      >
        <code>{sample.code}</code>
      </pre>
    </div>
  );
}
