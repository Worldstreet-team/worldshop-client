import { cookies } from "next/headers";
import { RECENT_COOKIE, decodeRecent } from "./cookie";

/** This buyer's recently viewed listing ids, newest first. */
export async function getRecentlyViewed() {
  return decodeRecent((await cookies()).get(RECENT_COOKIE)?.value);
}
