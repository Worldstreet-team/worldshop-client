"use client";

import { RouteError } from "@ws/features/errors/RouteError";

export default function SearchError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError what="these results" reset={reset} />;
}
