"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeReturnPath } from "@ws/features/location/return-path";
import { VIEW_COOKIE, parseView } from "./view";

/** ViewToggle's submit: remember grid or list, then go back to the same results. */
export async function setView(formData: FormData) {
  (await cookies()).set(VIEW_COOKIE, parseView(String(formData.get("view") ?? "")), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: import.meta.env.PROD,
  });
  redirect(safeReturnPath(formData.get("return")));
}
