import Inbox from '@/components/chat/Inbox';

/**
 * Vendor inbox — buyers asking about this store's listings.
 *
 * Answering these is what produces the response rate shown on the public store
 * page, and an unanswered thread counts against it.
 */
export default function VendorMessages() {
  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">Messages</h1>
          <p className="ws-page__sub">
            Buyers contact you here first. Replying quickly improves your response
            rate, which buyers can see on your store page.
          </p>
        </div>
      </div>
      <Inbox side="selling" />
    </div>
  );
}
