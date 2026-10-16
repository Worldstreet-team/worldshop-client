/*
 * next/headers in the browser. The "server" helpers that read cookies run on the
 * client here, so cookies() reads and writes document.cookie. httpOnly cannot apply
 * from script and is dropped; nothing the UI keeps in these cookies is secret (an
 * area id, a grid/list choice, hidden and recently viewed listing ids).
 */

type SetOptions = { path?: string; maxAge?: number; sameSite?: "lax" | "strict" | "none"; secure?: boolean; httpOnly?: boolean };

function read(): Map<string, string> {
  const jar = new Map<string, string>();
  for (const part of document.cookie.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const name = part.slice(0, i).trim();
    if (name) jar.set(name, decodeURIComponent(part.slice(i + 1).trim()));
  }
  return jar;
}

const jar = {
  get(name: string) {
    const value = read().get(name);
    return value === undefined ? undefined : { name, value };
  },
  getAll() {
    return [...read()].map(([name, value]) => ({ name, value }));
  },
  has(name: string) {
    return read().has(name);
  },
  set(name: string, value: string, opts: SetOptions = {}) {
    const parts = [`${name}=${encodeURIComponent(value)}`, `path=${opts.path ?? "/"}`];
    if (opts.maxAge !== undefined) parts.push(`max-age=${opts.maxAge}`);
    parts.push(`samesite=${opts.sameSite ?? "lax"}`);
    if (location.protocol === "https:") parts.push("secure");
    document.cookie = parts.join("; ");
  },
  delete(name: string) {
    document.cookie = `${name}=; path=/; max-age=0`;
  },
};

export async function cookies() {
  return jar;
}

/** Only lib/site.ts asks, for the origin of shareable links. */
export async function headers() {
  const values = new Map([
    ["host", location.host],
    ["x-forwarded-proto", location.protocol.replace(":", "")],
  ]);
  return { get: (name: string) => values.get(name.toLowerCase()) ?? null };
}
