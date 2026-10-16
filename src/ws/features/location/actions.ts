"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findArea } from "@ws/lib/areas";
import { parseRadius, radiusParam } from "@ws/lib/search/radius";
import { rules } from "@ws/config/marketplace-rules";
import { AREA_COOKIE, AREA_COOKIE_MAX_AGE } from "./cookie";
import { safeReturnPath } from "./return-path";

/**
 * ShipToSelector's submit: remembers the area and goes back to the page the buyer was
 * on with the chosen radius. A preference, so no sign-in; every input is validated
 * because Server Actions are reachable by any POST.
 */
export async function setLocation(formData: FormData) {
  const area = findArea(String(formData.get("area") ?? ""));
  const radius = parseRadius(String(formData.get("radius") ?? ""));
  if (area) {
    (await cookies()).set(AREA_COOKIE, area.id, {
      path: "/",
      maxAge: AREA_COOKIE_MAX_AGE,
      sameSite: "lax",
      httpOnly: true,
      secure: import.meta.env.PROD,
    });
  }
  const back = new URL(safeReturnPath(formData.get("return")), "http://local");
  if (radius === rules.location.defaultRadiusKm) back.searchParams.delete("radius");
  else back.searchParams.set("radius", radiusParam(radius));
  back.searchParams.delete("page");
  redirect(back.pathname + back.search);
}
