import { repos } from "@ws/lib/data";
import type { DealListing } from "./NegotiationHub";
/** Only the listing context needed by the local negotiation adapter crosses the boundary. */
export async function dealListings(): Promise<DealListing[]> {
  return (await repos.listings.list({ status: ["live", "reserved", "sold", "paused", "ended"] })).map((l) => ({
    id: l.id, seller_id: l.seller_id, price_minor: l.price_minor, qty: l.qty, status: l.status, category_id: l.category_id, title: l.title, slug: l.slug, shop_name: l.seller.shop_name,
    photo: l.media[0] && { url: l.media[0].url, alt: l.media[0].alt },
    seller: { handle: l.seller.handle, verified: l.seller.verified, top_rated: l.seller.top_rated, feedback: l.seller.feedback, reply_hours: l.seller.reply_hours, joined_at: l.seller.joined_at },
  }));
}
