"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  /** Accessible name when there is no visible label. Read out before the value. */
  label?: string;
  /** Id of a visible label element, for when the control has one. */
  labelledBy?: string;
  /** Lets a visible `<label htmlFor>` open the menu when clicked. */
  id?: string;
  /** Applied to the wrapper, which is what sizes the control in a layout. */
  className?: string;
  size?: "md" | "sm";
}

/** Matches `.select-menu` max-height, for deciding whether the menu fits below. */
const MENU_MAX_HEIGHT = 256;
const OPTION_HEIGHT = 40;

/**
 * A dropdown that looks like the rest of the app.
 *
 * A native `<select>` cannot be styled once it is open — the list is drawn by
 * the operating system, blue highlight and all. This follows the ARIA listbox
 * pattern instead: a button that opens a list, arrow keys to move, Enter to
 * pick, Escape to back out, and focus returned to the button afterwards.
 */
export default function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  labelledBy,
  id,
  className = "",
  size = "md",
}: Props<T>) {
  const autoId = useId();
  const triggerId = id ?? `${autoId}-trigger`;
  const listId = `${autoId}-list`;

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [dropUp, setDropUp] = useState(false);

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  function openMenu() {
    // Flip upwards when the menu would run off the bottom of the viewport —
    // the category field sits low on the form, especially on a phone.
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      const needed = Math.min(MENU_MAX_HEIGHT, options.length * OPTION_HEIGHT + 8) + 12;
      setDropUp(below < needed && rect.top > below);
    }
    setActive(selectedIndex);
    setOpen(true);
  }

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  function choose(index: number) {
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
    close(true);
  }

  // Focus moves into the list so the arrow keys land there. The highlighted
  // option is announced through aria-activedescendant rather than by moving
  // DOM focus from option to option.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  // Keep the keyboard-highlighted option in view when the list scrolls.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  // A click anywhere else closes the menu without pulling focus back: that
  // click has already put focus where the user meant it to go.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  function onTriggerKeyDown(event: React.KeyboardEvent) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openMenu();
    }
  }

  function onListKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        // Label first, then the button's own text, so the current value is read
        // out too ("Category, Artistic") rather than just the field name.
        aria-labelledby={labelledBy ? `${labelledBy} ${triggerId}` : undefined}
        data-open={open}
        onClick={() => (open ? close(true) : openMenu())}
        onKeyDown={onTriggerKeyDown}
        className={`select-trigger ${size === "sm" ? "select-trigger-sm" : ""}`}
      >
        <span className="truncate">
          {label && <span className="sr-only">{label}: </span>}
          {options[selectedIndex]?.label}
        </span>
        <svg
          className="select-chevron"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-labelledby={labelledBy}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKeyDown}
          className={`select-menu ${dropUp ? "select-menu-up" : ""}`}
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                data-active={index === active}
                data-index={index}
                onPointerEnter={() => setActive(index)}
                onClick={() => choose(index)}
                className="select-option"
              >
                <span className="truncate">{option.label}</span>
                {selected && (
                  <svg
                    className="h-4 w-4 shrink-0"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="m3.5 8.5 3 3 6-6.5" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
