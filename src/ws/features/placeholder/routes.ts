import {
  AccountIcon,
  ChatDotsIcon,
  HandshakeAgreementDealIcon,
  MenuSquareIcon,
} from "@ws/components/icons";

/*
 * Pages that links will point to before they're built (audit F5: no dead links, no
 * badge without a panel). Each says which build phase brings it (PLAN §3) and what it
 * will do, so a tap never ends on a 404. Routes follow flows Part F.
 */

export type ComingId = keyof typeof COMING;

export const COMING = {
  categories: { title: "All categories", icon: MenuSquareIcon, phase: 2, body: "Every category and subcategory, with how many listings each has near you." },
  inbox: { title: "Inbox", icon: ChatDotsIcon, phase: 4, body: "Messages with buyers and sellers, each pinned to its listing." },
  offers: { title: "Offers", icon: HandshakeAgreementDealIcon, phase: 4, body: "Offers you've made and received, with counter-offers and deadlines." },
  account: { title: "Your account", icon: AccountIcon, phase: 4, body: "Sign in, your profile, addresses and payment methods." },
} as const;
