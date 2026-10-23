/**
 * Shown the moment someone heads back to the library, while the collection is
 * read. Mirrors the real layout — heading, filters, a grid of covered cards —
 * so the page settles into place instead of jumping.
 *
 * In a route group so it covers the library alone; the admin and form pages
 * would otherwise flash a grid they do not have.
 */
export default function LibraryLoading() {
  return (
    <div aria-busy="true" aria-label="Loading prompts">
      <div className="mb-7 sm:mb-9">
        <div className="skeleton h-9 w-56 sm:h-11 sm:w-72" />
        <div className="skeleton mt-3 h-4 w-full max-w-md" />
      </div>

      <div className="mb-6 space-y-3">
        <div className="skeleton h-11 w-full rounded-xl" />
        <div className="skeleton h-10 w-full rounded-full sm:w-72" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton h-8 w-20 shrink-0 rounded-full" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="skeleton aspect-video rounded-none" />
            <div className="space-y-3 p-4 sm:p-5">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3.5 w-5/6" />
              <div className="skeleton h-16 w-full rounded-xl" />
              <div className="flex items-center justify-between border-t border-line pt-3">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-8 w-20 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
