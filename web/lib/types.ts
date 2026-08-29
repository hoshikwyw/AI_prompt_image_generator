export interface EditInput {
  /** Source photo bytes, already resized to suit the provider. */
  image: Buffer;
  mimeType: string;
  /** Actual pixel dims of `image` — needed for tile-based cost maths. */
  inputWidth: number;
  inputHeight: number;
  prompt: string;
  outWidth: number;
  outHeight: number;
}

export interface EditResult {
  image: Buffer;
  mimeType: string;
  costUsd: number;
  ms: number;
}

export type ProviderId = "cloudflare" | "gemini";

export interface ImageProvider {
  readonly id: ProviderId;
  readonly label: string;
  readonly model: string;
  /** Longest edge the provider accepts for an input image. */
  readonly maxInputEdge: number;
  configured(): boolean;
  edit(input: EditInput): Promise<EditResult>;
}

export class ProviderError extends Error {
  status?: number;
  body?: string;
  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.body = body;
  }
}

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface Job {
  id: string;
  status: JobStatus;
  styleSlug: string;
  styleTitle: string;
  provider: ProviderId;
  model: string;
  /** Frozen copy of the prompt actually used, so later edits don't rewrite history. */
  promptSnapshot: string;
  createdAt: string;
  completedAt?: string;
  ms?: number;
  costUsd?: number;
  error?: string;
  outputMime?: string;
}
