import type { NotificationCategory, NotificationDto, NotificationPriority, PaginatedNotificationDto } from "@gym/shared";
import { notificationCategories, notificationPriorities } from "@gym/shared";
import { useEffect, useState } from "react";
import { Bell, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { SkeletonRows } from "../components/ui/Skeleton";
import { StatusBadge } from "../components/ui/StatusBadge";
import * as notificationApi from "../features/notifications/notificationApi";
import { useAppSelector } from "../store/hooks";
import { getApiErrorMessage } from "../utils/apiError";
import { formatDateTime, formatRelativeTime } from "../utils/format";
import { isAdminRole } from "../utils/roles";

export function NotificationsPage() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const [notifications, setNotifications] = useState<PaginatedNotificationDto | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = async (nextPage = page): Promise<void> => {
    setLoading(true);
    try {
      const [rows, count] = await Promise.all([
        notificationApi.listNotifications({ unreadOnly, page: nextPage, pageSize: 20 }),
        notificationApi.getUnreadNotificationCount()
      ]);
      setNotifications(rows);
      setUnreadCount(count);
      setPage(nextPage);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load notifications"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
  }, [unreadOnly]);

  const markRead = async (notification: NotificationDto): Promise<void> => {
    try {
      await notificationApi.markNotificationRead(notification.id);
      toast.success("Notification marked read");
      void load(page);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not mark notification read"));
    }
  };

  return (
    <section className="grid max-w-6xl gap-6 animate-fade-in">
      <div className="bg-card flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border p-4 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Message Center</p>
          <h2 className="mt-2 text-3xl font-black text-foreground">Notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground"><span className="numeric">{unreadCount}</span> unread notifications</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setUnreadOnly((value) => !value)}>
            {unreadOnly ? "Show All" : "Unread Only"}
          </Button>
          {isAdminRole(role) ? <Button onClick={() => setCreateOpen(true)}><Bell className="h-4 w-4" aria-hidden="true" />New Notification</Button> : null}
        </div>
      </div>

      <Card title={unreadOnly ? "Unread" : "All Notifications"}>
        {loading ? <SkeletonRows /> : null}
        {!loading && (notifications?.data.length ?? 0) === 0 ? <EmptyState title="No notifications found" /> : null}
        <div className="grid gap-3">
          {notifications?.data.map((notification) => (
            <div key={notification.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="font-bold text-foreground">{notification.title}</p>
                    <StatusBadge status={notification.priority} />
                    <span className="rounded bg-line-faint px-2 py-1 text-xs font-bold text-muted-foreground">{notification.category}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.body}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground" title={formatDateTime(notification.createdAt)}>{formatRelativeTime(notification.createdAt)}</p>
                </div>
                {!notification.readAt ? (
                  <Button variant="secondary" className="h-9 px-3" onClick={() => void markRead(notification)}>
                    Mark Read
                  </Button>
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground" title={formatDateTime(notification.readAt)}>Read {formatRelativeTime(notification.readAt)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
          <span>
            Page {notifications?.pagination.page ?? page} of {Math.max(1, notifications?.pagination.totalPages ?? 1)}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" className="h-9 px-3" disabled={page <= 1} onClick={() => void load(page - 1)}>
              Previous
            </Button>
            <Button
              variant="secondary"
              className="h-9 px-3"
              disabled={page >= (notifications?.pagination.totalPages ?? 1)}
              onClick={() => void load(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <CreateNotificationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          void load(1);
        }}
      />
    </section>
  );
}

function CreateNotificationModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState("");
  const [category, setCategory] = useState<NotificationCategory>("SYSTEM");
  const [priority, setPriority] = useState<NotificationPriority>("NORMAL");

  const submit = async (): Promise<void> => {
    try {
      await notificationApi.createNotification({
        title,
        body,
        category,
        priority,
        ...(userId.trim() ? { userId: userId.trim() } : {})
      });
      toast.success("Notification created");
      setTitle("");
      setBody("");
      setUserId("");
      onSaved();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not create notification"));
    }
  };

  return (
    <Modal title="New Notification" open={open} onClose={onClose}>
      <div className="grid gap-3">
        <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
        <label className="grid gap-2 text-sm font-medium text-foreground">
          <span>Body</span>
          <textarea
            className="min-h-28 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <Input label="Target User ID" placeholder="Blank sends gym-wide" value={userId} onChange={(event) => setUserId(event.target.value)} />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-foreground">
            <span>Category</span>
            <select className="h-11 rounded-md border border-border bg-surface/70 px-3 outline-none transition hover:border-brand/50 focus:border-brand focus:ring-2 focus:ring-brand/25" value={category} onChange={(event) => setCategory(event.target.value as NotificationCategory)}>
              {notificationCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-foreground">
            <span>Priority</span>
            <select className="h-11 rounded-md border border-border bg-surface/70 px-3 outline-none transition hover:border-brand/50 focus:border-brand focus:ring-2 focus:ring-brand/25" value={priority} onChange={(event) => setPriority(event.target.value as NotificationPriority)}>
              {notificationPriorities.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <Button onClick={() => void submit()} disabled={!title.trim() || !body.trim()}>
          <Send className="h-4 w-4" aria-hidden="true" />
          Create Notification
        </Button>
      </div>
    </Modal>
  );
}
