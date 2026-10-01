import Inbox from '@/features/chat/components/Inbox';
import { VendorPageHead } from '@/features/stores/components/vendor/VendorPage';

export default function VendorMessages() {
  return (
    <div className="ws-vxpage ws-vxpage--inbox">
      <VendorPageHead
        title="Messages"
        description="Reply with the listing context still visible. Replying quickly improves your response rate, which buyers see on your shop."
      />
      <Inbox side="selling" />
    </div>
  );
}
