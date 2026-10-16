import type { Metadata } from "next";
import { NotificationsPage } from "@ws/features/shell/NotificationBell";

export const metadata: Metadata = { title: "Notifications", robots: { index: false, follow: false } };

export default function Page() {
  return <NotificationsPage />;
}
