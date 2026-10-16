"use client";
import { rules } from "@ws/config/marketplace-rules";
import type { Photo } from "./model";

/*
 * PhotoUploader processing (S2 step 1, R-114), all in the browser: the photo is decoded
 * upright (EXIF orientation), re-encoded as JPEG, which also strips EXIF/GPS, and
 * compressed to ≤ 300 KB. Durable uploads need an upload service; this demo keeps the
 * web version on the device.
 */
const MAX_BYTES = 300_000;
const EDGES = [1280, 1024, 800];

function encode(source: CanvasImageSource, width: number, height: number, rotate = false) {
  const canvas = document.createElement("canvas");
  [canvas.width, canvas.height] = rotate ? [height, width] : [width, height];
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can’t process photos.");
  if (rotate) { ctx.translate(height, 0); ctx.rotate(Math.PI / 2); }
  ctx.drawImage(source, 0, 0, width, height);
  for (const quality of [0.82, 0.72, 0.6]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    const bytes = Math.ceil((url.length - url.indexOf(",") - 1) * 3 / 4);
    if (bytes <= MAX_BYTES) return { url, width: canvas.width, height: canvas.height, bytes };
  }
  return null;
}

export async function processPhoto(file: File): Promise<Photo> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn’t a photo.`);
  if (file.size > rules.seller.photoMaxMb * 1_000_000) throw new Error(`${file.name} is over ${rules.seller.photoMaxMb} MB.`);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { throw new Error(`${file.name} couldn’t be opened. Try a JPEG or PNG.`); }
  const long = Math.max(bitmap.width, bitmap.height);
  if (long < rules.seller.photoMinPx) { bitmap.close(); throw new Error(`${file.name} is too small: use at least ${rules.seller.photoMinPx}px on the long side.`); }
  for (const edge of EDGES) {
    const scale = Math.min(1, edge / long);
    const out = encode(bitmap, Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
    if (out) { bitmap.close(); return out; }
  }
  bitmap.close();
  throw new Error(`${file.name} couldn’t be compressed enough.`);
}

/** Turns a processed photo a quarter clockwise. */
export async function rotatePhoto(photo: Photo): Promise<Photo> {
  const img = new Image();
  img.src = photo.url;
  await img.decode();
  return encode(img, photo.width, photo.height, true) ?? photo;
}
