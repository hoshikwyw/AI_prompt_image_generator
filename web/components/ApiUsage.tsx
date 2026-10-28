import { RATE_LIMIT, rateLimitConfigured, readUsage } from "@/lib/rate-limit";

const DAYS = 7;

const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Public API traffic for the admin page: requests per day for the last week,
 * and which endpoints they went to. Counts only what reached the server —
 * responses the CDN served from cache never run the counter, so real use is
 * higher than this, and that is the point of caching.
 */
export default async function ApiUsage() {
  if (!rateLimitConfigured()) {
    return (
      <div className="card px-5 py-4 text-sm">
        <p className="font-medium">API usage counting is off</p>
        <p className="mt-1 text-muted">
          Add <code className="font-mono">UPSTASH_REDIS_REST_URL</code> and{" "}
          <code className="font-mono">UPSTASH_REDIS_REST_TOKEN</code> from a free Upstash database to
          turn on the {RATE_LIMIT}-a-minute fair-use limit and these counts.
        </p>
      </div>
    );
  }

  const days = await readUsage(DAYS);
  if (!days) {
    return (
      <div className="card px-5 py-4 text-sm">
        <p className="font-medium">API usage is unavailable right now</p>
        <p className="mt-1 text-muted">Upstash did not answer. The API itself is unaffected.</p>
      </div>
    );
  }

  const week = days.reduce((sum, d) => sum + d.total, 0);
  const peak = Math.max(1, ...days.map((d) => d.total));
  const endpoints = Object.entries(
    days.reduce<Record<string, number>>((acc, d) => {
      for (const [name, n] of Object.entries(d.byEndpoint)) acc[name] = (acc[name] ?? 0) + n;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="card px-5 py-4 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium">API requests, last {DAYS} days</p>
        <p className="text-muted">
          <strong className="text-foreground">{week.toLocaleString("en-GB")}</strong> total
        </p>
      </div>

      <ul className="mt-4 space-y-1.5" aria-label="Requests per day">
        {days.map((d) => (
          <li key={d.day} className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-3">
            <span className="text-muted">{dayFmt.format(new Date(`${d.day}T00:00:00Z`))}</span>
            <span className="h-2 overflow-hidden rounded-full bg-raised" aria-hidden>
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${(d.total / peak) * 100}%` }}
              />
            </span>
            <span className="text-right tabular-nums">{d.total.toLocaleString("en-GB")}</span>
          </li>
        ))}
      </ul>

      {endpoints.length > 0 && (
        <p className="mt-4 text-muted">
          By endpoint:{" "}
          {endpoints.map(([name, n], i) => (
            <span key={name}>
              {i > 0 && " · "}
              <code className="font-mono text-foreground">{name}</code> {n.toLocaleString("en-GB")}
            </span>
          ))}
        </p>
      )}

      <p className="mt-3 text-xs text-subtle">
        Counts requests that reached the server. Ones the CDN answered from cache are not counted —
        real use is higher.
      </p>
    </div>
  );
}
