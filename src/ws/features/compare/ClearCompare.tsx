"use client";
import { useRouter } from "next/navigation";
import { buttonClass } from "@ws/components/ui";
import { clearCompare } from "./store";

export function ClearCompare() {
  const router = useRouter();
  return <button type="button" className={buttonClass({ variant: "ghost", size: "sm" })} onClick={() => { clearCompare(); router.push("/search"); }}>Clear and close</button>;
}
