import Inbox from '@/components/chat/Inbox';

/**
 * Vendor inbox — buyers asking about this store's listings.
 *
 * Answering these is what produces the response rate shown on the public store
 * page, and an unanswered thread counts against it.
 */
export default function VendorMessages() {
  return (
    <div className="vendor-messages">
      <div className="page-header">
        <h1>Messages</h1>
        <p style={{ color: '#667085' }}>
          Buyers contact you here first. Replying quickly improves your response
          rate, which buyers can see on your store page.
        </p>
      </div>
      <Inbox side="selling" />
    </div>
  );
}
