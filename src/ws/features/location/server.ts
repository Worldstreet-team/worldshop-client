import { cookies } from "next/headers";
import { IP_FALLBACK_AREA, findArea, type Anchor } from "@ws/lib/areas";
import { AREA_COOKIE } from "./cookie";

/** The buyer's anchor: their chosen area, else the city inferred from IP (mocked as Lagos). */
export async function getAnchor(): Promise<{ anchor: Anchor; inferred: boolean }> {
  const chosen = findArea((await cookies()).get(AREA_COOKIE)?.value);
  return chosen ? { anchor: chosen, inferred: false } : { anchor: findArea(IP_FALLBACK_AREA)!, inferred: true };
}
