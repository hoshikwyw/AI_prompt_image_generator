import { cache } from "react";
import { getPrompt } from "@/lib/store";

/**
 * One read of the prompt per request, shared by the layout, generateMetadata
 * and the page — each of which needs it, and which used to fetch it apart.
 */
export const loadPrompt = cache(getPrompt);
