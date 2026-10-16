import { createApiRepos } from "./api";

/*
 * The one place the app picks its data adapter (PLAN §2.2). This is the live API;
 * the reference's in-memory mock adapter is not carried over.
 */
export const repos = createApiRepos();

export type { ListingFilter, Repos } from "./repo";
export { BUYER_VISIBLE, listingPath, parseListingParam } from "./repo";
export type * from "./types";
