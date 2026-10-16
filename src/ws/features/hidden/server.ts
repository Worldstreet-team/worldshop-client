import { cookies } from "next/headers";
import { HIDDEN_COOKIE, decodeHidden } from "./cookie";

/** What this buyer has hidden, for leaving it out of server-rendered results. */
export async function getHidden() {
  const h = decodeHidden((await cookies()).get(HIDDEN_COOKIE)?.value);
  return { listings: new Set(h.listings), sellers: new Set(h.sellers) };
}
