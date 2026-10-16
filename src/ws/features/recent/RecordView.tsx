"use client";

import { useEffect } from "react";
import { recordView } from "./store";

/** On a listing page: remember it for the Recently viewed rail. */
export function RecordView({ id }: { id: string }) {
  useEffect(() => recordView(id), [id]);
  return null;
}
