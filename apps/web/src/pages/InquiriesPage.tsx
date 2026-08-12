import type { InquiryDto, InquiryStatus, PaginatedInquiryDto } from "@gym/shared";
import { inquiryStatuses } from "@gym/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { StatusBadge } from "../components/ui/StatusBadge";
import * as inquiryApi from "../features/inquiries/inquiryApi";
import { getApiErrorMessage } from "../utils/apiError";
import { formatDateTime } from "../utils/format";

export function InquiriesPage() {
  const [status, setStatus] = useState<InquiryStatus | "">("");
  const [page, setPage] = useState(1);
  const [inquiries, setInquiries] = useState<PaginatedInquiryDto | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (nextPage = page): Promise<void> => {
    setLoading(true);
    try {
      setInquiries(
        await inquiryApi.listInquiries({
          page: nextPage,
          pageSize: 50,
          ...(status ? { status } : {})
        })
      );
      setPage(nextPage);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load inquiries"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
  }, [status]);

  const markRead = async (inquiry: InquiryDto): Promise<void> => {
    try {
      await inquiryApi.markInquiryRead(inquiry.id);
      toast.success("Inquiry marked read");
      void load(page);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update inquiry"));
    }
  };

  const deleteInquiry = async (inquiry: InquiryDto): Promise<void> => {
    if (!window.confirm(`Delete inquiry from ${inquiry.name}?`)) {
      return;
    }
    try {
      await inquiryApi.deleteInquiry(inquiry.id);
      toast.success("Inquiry deleted");
      void load(page);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not delete inquiry"));
    }
  };

  return (
    <section className="grid max-w-7xl gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-5">
        <div>
          <h2 className="text-2xl font-bold text-ink">Inquiries</h2>
          <p className="mt-1 text-sm text-ink-muted">Public contact form submissions from ValorFitness visitors</p>
        </div>
        <label className="grid gap-2 text-sm font-medium text-ink">
          <span>Status</span>
          <select className="h-11 rounded-md border border-line bg-panel px-3" value={status} onChange={(event) => setStatus(event.target.value as InquiryStatus | "")}>
            <option value="">All</option>
            {inquiryStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <Card title="Submissions">
        {loading ? <SkeletonRows /> : null}
        {!loading && (inquiries?.data.length ?? 0) === 0 ? <EmptyState title="No inquiries found" /> : null}
        <div className="grid gap-3">
          {inquiries?.data.map((inquiry) => (
            <div key={inquiry.id} className="rounded-md border border-line bg-surface p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="font-bold text-ink">{inquiry.name}</p>
                    <StatusBadge status={inquiry.status} />
                  </div>
                  <p className="font-mono text-xs font-semibold text-ink-faint">{inquiry.email} · {inquiry.phone}</p>
                  <p className="mt-3 text-sm leading-6 text-ink-muted">{inquiry.message}</p>
                  <p className="mt-2 text-xs font-semibold text-ink-faint">{formatDateTime(inquiry.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {inquiry.status === "NEW" ? (
                    <Button variant="secondary" className="h-9 px-3" onClick={() => void markRead(inquiry)}>
                      Mark Read
                    </Button>
                  ) : null}
                  <Button variant="secondary" className="h-9 px-3 text-accent" onClick={() => void deleteInquiry(inquiry)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm text-ink-muted">
          <span>
            Page {inquiries?.pagination.page ?? page} of {Math.max(1, inquiries?.pagination.totalPages ?? 1)}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" className="h-9 px-3" disabled={page <= 1} onClick={() => void load(page - 1)}>
              Previous
            </Button>
            <Button
              variant="secondary"
              className="h-9 px-3"
              disabled={page >= (inquiries?.pagination.totalPages ?? 1)}
              onClick={() => void load(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
