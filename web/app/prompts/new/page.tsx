import Link from "next/link";
import PromptForm from "@/components/PromptForm";

export const metadata = { title: "New prompt — Promptbook" };

export default function NewPromptPage() {
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
