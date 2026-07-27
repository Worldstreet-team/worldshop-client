import Inbox from '@/components/chat/Inbox';

/** Buyer inbox — conversations this user started with sellers. */
export default function AccountMessages() {
  return (
    // `.container` because MainLayout, unlike VendorLayout, adds no gutters of
    // its own — without it the page sits flush against the viewport edge.
    <div className="container account-messages" style={{ paddingBlock: '1.5rem' }}>
      <div className="page-header">
        <h1>My Messages</h1>
        <p style={{ color: '#667085' }}>
          Your conversations with sellers about their listings.
        </p>
      </div>
      <Inbox side="buying" />
    </div>
  );
}
