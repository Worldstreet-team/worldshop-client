import Inbox from '@/features/chat/components/Inbox';

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
