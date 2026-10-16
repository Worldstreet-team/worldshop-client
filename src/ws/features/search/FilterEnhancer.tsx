"use client";

import { localFetch } from "@ws/compat/localApi";
import { useEffect } from "react";
import { rules } from "@ws/config/marketplace-rules";
import { formatCount } from "@ws/lib/format";

/* Script for the filter form (the form works without it):
   - rail: ticking a box or choosing a radio applies at once (eBay); the Apply button
     is hidden once this runs.
   - sheet: the "Show N results" button counts as you tick, from /api/search-count, so
     the buyer sees the result before leaving the sheet (spec §6 FilterSheet).
   - both: empty fields and the default radius stay out of the URL, and a sheet closes
     when it's applied. */
export function FilterEnhancer({ formId, live }: { formId: string; live: boolean }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    form.dataset.js = "true";
    const query = () => {
      const qs = new URLSearchParams();
      for (const [k, v] of new FormData(form)) {
        if (typeof v !== "string" || v === "" || (k === "radius" && v === String(rules.location.defaultRadiusKm))) continue;
        qs.append(k, v);
      }
      return qs;
    };

    let timer = 0;
    let ctrl: AbortController | undefined;
    const recount = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        ctrl?.abort();
        ctrl = new AbortController();
        const button = form.querySelector<HTMLButtonElement>(".ws-filters__show");
        localFetch(`/api/search-count?${query()}`, { signal: ctrl.signal })
          .then((r) => r.json())
          .then(({ total }: { total: number }) => {
            if (button) button.textContent = `Show ${formatCount(total)} ${total === 1 ? "result" : "results"}`;
          })
          .catch(() => {});
      }, 250);
    };

    const onChange = (e: Event) => {
      const t = e.target as HTMLInputElement;
      if (live) recount();
      else if (t.type === "checkbox" || t.type === "radio") form.requestSubmit();
    };
    const onInput = () => live && recount();
    // Leave empties and the default radius out of the URL; close a sheet once applied.
    const onSubmit = () => {
      const off: HTMLInputElement[] = [];
      for (const el of form.querySelectorAll<HTMLInputElement>("input")) {
        const skip = (el.type === "number" && el.value === "") || (el.name === "within" && el.value === "" && el.checked) || (el.name === "radius" && el.checked && el.value === String(rules.location.defaultRadiusKm));
        if (skip && !el.disabled) {
          el.disabled = true;
          off.push(el);
        }
      }
      setTimeout(() => off.forEach((el) => (el.disabled = false)), 0);
      form.closest("dialog")?.close();
    };
    form.addEventListener("change", onChange);
    form.addEventListener("input", onInput);
    form.addEventListener("submit", onSubmit, true);
    return () => {
      clearTimeout(timer);
      ctrl?.abort();
      form.removeEventListener("change", onChange);
      form.removeEventListener("input", onInput);
      form.removeEventListener("submit", onSubmit, true);
    };
  }, [formId, live]);
  return null;
}
