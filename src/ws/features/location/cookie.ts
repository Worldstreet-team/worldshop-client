/* The buyer's chosen area (R-001). A cookie, so the server can render "near you"
   results; the radius stays in the URL (R-011). Area ids only, never coordinates. */
export const AREA_COOKIE = "ws-area";
export const AREA_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
