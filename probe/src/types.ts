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

export interface ImageProvider {
  /** Short id used in filenames and the report. */
  readonly id: string;
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
