/**
 * Shown straight away when a card is opened, so the tap visibly did something
 * while the prompt is read. Shaped like the page it stands in for.
 *
 * In a route group so the edit page, which sits under the same `[id]`, does not
 * flash this layout. One trade-off: the response now streams, so an unknown id
 * is answered with the not-found page under a 200 status rather than a 404 —
 * Next marks that page noindex, which is what matters for a missing prompt.
 */
export default function PromptLoading() {
  return (
    <div className="mx-auto max-w-3xl" aria-busy="true" aria-label="Loading prompt">
      <div className="skeleton h-8 w-24 rounded-full" />

      <div className="mb-7 mt-5 sm:mb-9">
        <div className="skeleton mb-5 h-1 w-20 rounded-full" />
        <div className="skeleton h-8 w-3/4 sm:h-10" />
        <div className="skeleton mt-3 h-5 w-1/2" />
        <div className="mt-5 flex gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
          <div className="skeleton h-4 w-14" />
          <div className="skeleton h-8 w-20 rounded-full" />
        </div>
        <div className="space-y-2.5 px-4 py-4 sm:px-5">
          <div className="skeleton h-3.5 w-full" />
          <div className="skeleton h-3.5 w-full" />
          <div className="skeleton h-3.5 w-11/12" />
          <div className="skeleton h-3.5 w-2/3" />
        </div>
      </div>
    </div>
  );
}
