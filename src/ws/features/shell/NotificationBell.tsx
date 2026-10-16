"use client";

import Link from "next/link";
import { useId } from "react";
import { BellIcon } from "@ws/components/icons";
import { buttonClass, Count } from "@ws/components/ui";
import { unreadCount, useMarkAllRead, useNotices, type Notice } from "@ws/features/notifications/store";
import { timeAgo } from "@ws/lib/format";

/* NotificationBell + NotificationPanel (spec §3.1): a popover on desktop. The badge is
   the number of unread items in this panel and nothing else (Part H guardrail). Phones
   get the Notifications page from the drawer and the Account tab (spec §16.2). */
export function NotificationBell() {
  const id = useId();
  const notices = useNotices();
  const unread = unreadCount(notices);
  const markAllRead = useMarkAllRead(notices);
  return (
    <>
      <button
        type="button"
        className={buttonClass({ variant: "quiet", size: "sm", icon: true, className: "ws-bell" })}
        popoverTarget={id}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="dialog"
      >
        <BellIcon />
        <Count value={unread} className="ws-bell__count" />
      </button>
      <div id={id} popover="auto" role="dialog" aria-label="Notifications" className="cx-menu ws-notices">
        <div className="ws-notices__head">
          <h2 className="ws-notices__title">Notifications</h2>
          {unread > 0 && (
            <button type="button" className="cx-link ws-notices__read" onClick={markAllRead}>
              Mark all read
            </button>
          )}
        </div>
        <NoticeList notices={notices} />
      </div>
    </>
  );
}

/** The notices themselves: the bell's panel and the /notifications page share it. */
export function NoticeList({ notices }: { notices: readonly Notice[] }) {
  if (notices.length === 0) return <p className="ws-notices__empty">Nothing yet. New messages from buyers and sellers, and price drops and new matches for things you&apos;ve saved, will show here.</p>;
  return (
    <ul className="ws-notices__list">
      {notices.map((n) => (
        <li key={n.id} data-unread={!n.read || undefined}>
          <Link href={n.href}>
            <span className="ws-notices__item-title">{n.title}</span>
            {n.body && <span className="ws-notices__item-body">{n.body}</span>}
            <span className="ws-notices__item-time">{timeAgo(n.at).short}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** /notifications: the full list, for phones where the header has no bell. */
export function NotificationsPage() {
  const notices = useNotices();
  const unread = unreadCount(notices);
  const markAllRead = useMarkAllRead(notices);
  return (
    <div className="ws-notices-page">
      <header className="ws-flow__head"><div><h1>Notifications</h1>{unread > 0 && <p>{unread} unread</p>}</div>{unread > 0 && <button type="button" className="cx-link" onClick={markAllRead}>Mark all as read</button>}</header>
      <NoticeList notices={notices} />
    </div>
  );
}
