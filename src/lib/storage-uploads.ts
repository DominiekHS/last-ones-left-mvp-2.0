/**
 * Gedeelde upload-helpers voor Supabase Storage.
 *
 * Doel (Security hardening #9):
 * - Server-side wordt al afgedwongen via storage-policies (zie docs/storage.md):
 *   write-acties vereisen `authenticated` + `merchant`-rol + pad-prefix `{auth.uid()}/...`.
 * - Deze client-side helper is "belt & suspenders": valideert mime + size en
 *   genereert een veilige, gerandomiseerde bestandsnaam zodat:
 *     1) gebruiker geen extensie / inhoud kan spoofen
 *     2) gebruiker geen path-traversal of overschrijven van andermans bestanden kan triggeren
 *     3) cachebusting "for free" werkt
 *
 * Buckets: `deal-images` en `merchant-logos` zijn beide PUBLIC READ — bewuste keuze
 * omdat deal-foto's en logo's in `<img>` tags staan, ook voor uitgelogde bezoekers.
 */
import { supabase } from "@/integrations/supabase/client";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type UploadBucket = "deal-images" | "merchant-logos";

export interface ValidationError {
  ok: false;
  message: string;
}
export interface ValidationOk {
  ok: true;
  ext: string;
}

/** Valideert mime en size. Geeft een veilige extensie terug op basis van de mime-type — niet de bestandsnaam (anti-spoof). */
export function validateImageFile(file: File): ValidationError | ValidationOk {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: "Bestand te groot (max 5MB)" };
  }
  if (!ALLOWED_IMAGE_MIME.includes(file.type as typeof ALLOWED_IMAGE_MIME[number])) {
    return { ok: false, message: "Alleen JPG, PNG of WEBP toegestaan" };
  }
  return { ok: true, ext: MIME_TO_EXT[file.type] };
}

/** UUID met fallback voor browsers zonder crypto.randomUUID. */
function safeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface UploadOptions {
  bucket: UploadBucket;
  userId: string;
  file: File;
  /** Optioneel sub-pad onder `{userId}/...`, bv. `payment-steps` of `logo`. */
  subfolder?: string;
  /** Vaste filename (zonder ext) — alleen voor logo waar we willen overschrijven. */
  fixedName?: string;
  /** Vereist als fixedName gebruikt wordt. */
  upsert?: boolean;
}

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Uploadt een afbeelding naar de gegeven bucket onder `{userId}/[subfolder/]<random>.<ext>`.
 * Throwt met een gebruikersvriendelijke melding bij validatie- of upload-fouten.
 */
export async function uploadImage(opts: UploadOptions): Promise<UploadResult> {
  const validation = validateImageFile(opts.file);
  if (!validation.ok) throw new Error(validation.message);
  const ext = validation.ext;

  const baseName = opts.fixedName ?? safeUuid();
  const segments = [opts.userId];
  if (opts.subfolder) segments.push(opts.subfolder);
  segments.push(`${baseName}.${validation.ext}`);
  const path = segments.join("/");

  const { error } = await supabase.storage
    .from(opts.bucket)
    .upload(path, opts.file, {
      upsert: opts.upsert ?? false,
      contentType: opts.file.type,
    });
  if (error) throw new Error(error.message || "Upload mislukt");

  const { data } = supabase.storage.from(opts.bucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
