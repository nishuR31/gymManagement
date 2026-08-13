import type { AuditLogDto, PaginatedAuditLogDto } from "@gym/shared";
import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { SkeletonRows } from "../components/ui/Skeleton";
import { listActivityLogs } from "../features/activity/activityApi";
import { getApiErrorMessage } from "../utils/apiError";
import { formatDateTime, formatRelativeTime } from "../utils/format";

export function ActivityLogsPage() {
  const [logs, setLogs] = useState<PaginatedAuditLogDto | null>(null);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (nextPage = page): Promise<void> => {
    setLoading(true);
    try {
      setLogs(
        await listActivityLogs({
          page: nextPage,
          pageSize: 50,
          ...(action.trim() ? { action: action.trim() } : {}),
          ...(entity.trim() ? { entity: entity.trim() } : {}),
          ...(userId.trim() ? { userId: userId.trim() } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {})
        })
      );
      setPage(nextPage);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load activity logs"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
  }, []);

  return (
    <section className="grid max-w-7xl gap-6 animate-fade-in">
      <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Audit Trail</p>
        <h2 className="mt-2 text-3xl font-black text-foreground">Activity Logs</h2>
        <p className="mt-1 text-sm text-muted-foreground">Audit trail across auth, members, payments, inventory, and settings</p>
      </div>

      <Card title="Filters">
        <div className="grid gap-3 md:grid-cols-5">
          <Input label="Action" value={action} onChange={(event) => setAction(event.target.value)} />
          <Input label="Entity" value={entity} onChange={(event) => setEntity(event.target.value)} />
          <Input label="User ID" value={userId} onChange={(event) => setUserId(event.target.value)} />
          <Input label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => void load(1)}>Apply Filters</Button>
        </div>
      </Card>

      <Card title="Audit Trail">
        {loading ? <SkeletonRows /> : null}
        {!loading && (logs?.data.length ?? 0) === 0 ? <EmptyState title="No activity found" /> : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs?.data.map((log) => (
                <ActivityRow key={log.id} log={log} expanded={expandedId === log.id} onToggle={() => setExpandedId((current) => current === log.id ? null : log.id)} />
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={logs?.pagination.page ?? page}
          totalPages={logs?.pagination.totalPages ?? 1}
          onPage={(nextPage) => void load(nextPage)}
        />
      </Card>
    </section>
  );
}

function ActivityRow({ log, expanded, onToggle }: { log: AuditLogDto; expanded: boolean; onToggle: () => void }) {
  return (
    <Fragment>
      <tr className="transition hover:bg-secondary/35">
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-secondary text-primary">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-bold text-foreground">{log.action}</span>
          </div>
        </td>
        <td className="px-3 py-3 text-muted-foreground">
          {log.entity ?? "System"}
          {log.entityId ? <span className="numeric block max-w-48 truncate text-xs text-muted-foreground">{log.entityId}</span> : null}
        </td>
        <td className="numeric px-3 py-3 text-xs text-muted-foreground">{log.userId ?? "system"}</td>
        <td className="px-3 py-3 text-muted-foreground">
          <span title={formatDateTime(log.createdAt)}>{formatRelativeTime(log.createdAt)}</span>
        </td>
        <td className="px-3 py-3 text-right">
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-primary hover:text-foreground focus-visible:focus-ring" onClick={onToggle} aria-label={expanded ? "Hide activity details" : "Show activity details"}>
            <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr>
          <td colSpan={5} className="px-3 pb-3">
            <div className="grid gap-3 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground md:grid-cols-2">
              <div>
                <p className="font-bold uppercase text-muted-foreground">Request Context</p>
                <p className="numeric mt-2 break-all">IP: {log.ipAddress ?? "none"}</p>
                <p className="mt-1 break-all">Agent: {log.userAgent ?? "none"}</p>
              </div>
              <div>
                <p className="font-bold uppercase text-muted-foreground">Metadata</p>
                <pre className="numeric mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-secondary p-2">{JSON.stringify(log.metadata ?? {}, null, 2)}</pre>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
      <span>
        Page {page} of {Math.max(1, totalPages)}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" className="h-9 px-3" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" className="h-9 px-3" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
