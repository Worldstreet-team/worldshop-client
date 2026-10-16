/* Recently viewed ids, mirrored into a cookie so the home page can render the rail on
   the server, first in B1 order, with the other rails leaving those listings out
   (R-013) and no pop-in after load. Ids only, dot-separated. */
export const RECENT_COOKIE = "ws-recent";
const ID = /^[A-Za-z0-9]{1,32}$/;

export const encodeRecent = (ids: readonly string[]) => ids.join(".");
export const decodeRecent = (value: string | undefined) => (value ?? "").split(".").filter((id) => ID.test(id));
