import Link from "next/link";

/**
 * The "← Library" link at the top of every inner page. Truncates, because the
 * edit page labels it with the prompt's title, which can be long.
 */
export default function BackLink({
  href = "/",
  children = "Library",
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link href={href} className="btn btn-ghost btn-sm -ml-3 max-w-full">
      <span aria-hidden>←</span> <span className="truncate">{children}</span>
    </Link>
  );
}
