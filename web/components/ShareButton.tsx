"use client";

import { copyText } from "@/lib/copy";
import { showToast } from "@/lib/toast";

/**
 * Shares a prompt's page. On a phone that is the system share sheet — straight
 * into a chat — and elsewhere the link goes on the clipboard instead.
 */
export default function ShareButton({ title, text }: { title: string; text?: string }) {
  async function share() {
    const url = window.location.href.split("?")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // Dismissing the sheet throws too; there is nothing to report.
      }
      return;
    }
    showToast((await copyText(url)) ? "Link copied — share it anywhere." : "Could not copy the link.");
  }

  return (
    <button type="button" onClick={share} className="btn btn-sm">
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M8 10V2.5M5 5.25 8 2.25l3 3M3.5 8.5v4.25c0 .414.336.75.75.75h7.5a.75.75 0 0 0 .75-.75V8.5" />
      </svg>
      Share
    </button>
  );
}
