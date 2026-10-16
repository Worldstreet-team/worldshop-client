import { rules } from "@ws/config/marketplace-rules";

/*
 * Whether this device should get a live 3D scene or the static fallback. Pure: the
 * caller passes what the browser reports, so the rules are unit-tested without one.
 * Anything unknown (Safari has no deviceMemory) counts as capable; WebGL is the one
 * hard requirement.
 */

export type DeviceReport = {
  webgl: boolean;
  reducedMotion: boolean;
  saveData?: boolean;
  deviceMemoryGb?: number;
  cores?: number;
};

export type Verdict = { ok: true } | { ok: false; reason: "no-webgl" | "reduced-motion" | "save-data" | "low-memory" | "few-cores" };

export function judge3D(d: DeviceReport): Verdict {
  if (!d.webgl) return { ok: false, reason: "no-webgl" };
  if (d.reducedMotion) return { ok: false, reason: "reduced-motion" };
  if (d.saveData) return { ok: false, reason: "save-data" };
  if (d.deviceMemoryGb !== undefined && d.deviceMemoryGb < rules.three.minDeviceMemoryGb) return { ok: false, reason: "low-memory" };
  if (d.cores !== undefined && d.cores < rules.three.minCores) return { ok: false, reason: "few-cores" };
  return { ok: true };
}

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

/** Reads the report from the browser. Client only. */
export function reportDevice(): DeviceReport {
  const nav = navigator as Nav;
  let webgl = false;
  try {
    webgl = !!document.createElement("canvas").getContext("webgl2");
  } catch {
    webgl = false;
  }
  return {
    webgl,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: nav.connection?.saveData,
    deviceMemoryGb: nav.deviceMemory,
    cores: nav.hardwareConcurrency || undefined,
  };
}
