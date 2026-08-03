import Inbox from '@/components/chat/Inbox';

/** Buyer inbox — conversations this user started with sellers. */
export default function AccountMessages() {
  return (
    // `.ws-page` because MainLayout, unlike VendorLayout, adds no gutters of
    // its own — without it the page sits flush against the viewport edge.
    <div className="ws-page">
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">My Messages</h1>
          <p className="ws-page__sub">
            Your conversations with sellers about their listings.
          </p>
        </div>
      </div>
      <Inbox side="buying" />
    </div>
  );
}
