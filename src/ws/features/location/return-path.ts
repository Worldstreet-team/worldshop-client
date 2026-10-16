/** A same-site path to go back to, or "/" (no open redirects). */
export function safeReturnPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  try {
    const url = new URL(value, "http://local");
    return url.origin === "http://local" ? url.pathname + url.search : "/";
  } catch {
    return "/";
  }
}
