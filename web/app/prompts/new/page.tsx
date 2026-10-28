import { redirect } from "next/navigation";
import BackLink from "@/components/BackLink";
import PromptForm from "@/components/PromptForm";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "New prompt", robots: { index: false, follow: false } };

export default async function NewPromptPage() {
  // The API refuses the write anyway; this just sends you somewhere useful
  // instead of letting you fill in a form that cannot be saved.
  if (!(await isAdmin())) redirect("/admin?next=/prompts/new");

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink />
      <h1 className="mb-7 mt-4 text-2xl font-semibold tracking-tight sm:mb-9 sm:text-3xl">
        New prompt
      </h1>
      <PromptForm />
    </div>
  );
}
