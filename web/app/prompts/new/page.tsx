import Link from "next/link";
import { redirect } from "next/navigation";
import PromptForm from "@/components/PromptForm";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "New prompt — Promptbook" };

export default async function NewPromptPage() {
  // The API refuses the write anyway; this just sends you somewhere useful
  // instead of letting you fill in a form that cannot be saved.
  if (!(await isAdmin())) redirect("/admin?next=/prompts/new");

  return (
    <div>
      <Link href="/" className="text-sm text-muted transition hover:text-foreground">
        ← Library
      </Link>
      <h1 className="mb-8 mt-4 text-3xl font-semibold tracking-tight">New prompt</h1>
      <PromptForm />
    </div>
  );
}
