import Inbox from '@/features/chat/components/Inbox';
import CategoryHead from '@/features/catalog/components/CategoryHead';
import { usePageTitle } from '@/shared/hooks/usePageTitle';

/** Buyer inbox: conversations this user started with sellers. */
export default function AccountMessages() {
  usePageTitle('Messages');
  return (
    <div className="ws-wrap ws-cx ws-acctinbox">
      <CategoryHead crumbs={[{ label: 'My account', to: '/account' }, { label: 'Messages' }]} title="Messages">
        Your conversations with sellers, with the listing each one is about.
      </CategoryHead>
      <Inbox side="buying" />
    </div>
  );
}
