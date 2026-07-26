import Inbox from '@/components/chat/Inbox';

/** Buyer inbox — conversations this user started with sellers. */
export default function AccountMessages() {
  return (
    <div className="account-messages">
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
