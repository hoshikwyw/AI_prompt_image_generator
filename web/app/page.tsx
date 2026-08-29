import Link from "next/link";
import { activePrompts } from "@/lib/prompts";
import { listProviders } from "@/lib/providers";

export default function GalleryPage() {
  const styles = activePrompts();
  const configured = listProviders().filter((p) => p.configured());

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Pick a style</h1>
        <p className="mt-2 max-w-xl text-muted">
          Choose a look, upload a photo of yourself, and it gets restyled while keeping your face.
        </p>
      </div>

      {configured.length === 0 && (
        <div className="mb-8 rounded-xl border border-amber-900/60 bg-amber-950/30 px-5 py-4 text-sm">
          <p className="font-medium text-amber-200">No image provider configured</p>
          <p className="mt-1 text-amber-200/70">
            Copy <code className="font-mono">.env.example</code> to{" "}
            <code className="font-mono">.env.local</code> and add{" "}
            <code className="font-mono">CF_ACCOUNT_ID</code> +{" "}
            <code className="font-mono">CF_API_TOKEN</code> (free tier) or{" "}
            <code className="font-mono">GEMINI_API_KEY</code>.
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {styles.map((style) => (
          <Link
            key={style.slug}
            href={`/create/${style.slug}`}
            className="group overflow-hidden rounded-2xl border border-line bg-card transition hover:border-neutral-600"
          >
            <div className="relative aspect-4/5 overflow-hidden">
              {style.exampleImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={style.exampleImage}
                  alt={`${style.title} example`}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div
                  className={`flex h-full w-full items-center justify-center bg-linear-to-br ${style.accent}`}
                >
                  <span className="px-6 text-center text-sm font-medium text-white/80">
                    Example coming once you generate one
                  </span>
                </div>
              )}
              <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium capitalize backdrop-blur">
                {style.category}
              </span>
            </div>

            <div className="p-4">
              <h2 className="font-medium">{style.title}</h2>
              <p className="mt-1 text-sm text-muted">{style.blurb}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
