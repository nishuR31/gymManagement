import type { InquiryStatus } from "@gym/shared";
import type {
  CreateInquiryInput,
  InquiryListFilters,
  InquiryRecord,
  InquiryRepository
} from "../src/repositories/inquiry.repository.js";

export class InMemoryInquiryRepository implements InquiryRepository {
  public readonly inquiries = new Map<string, InquiryRecord>();

  private sequence = 0;

  public async create(input: CreateInquiryInput): Promise<InquiryRecord> {
    const inquiry: InquiryRecord = {
      id: this.nextId(),
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
      status: "NEW",
      createdAt: new Date()
    };
    this.inquiries.set(inquiry.id, inquiry);
    return inquiry;
  }

  public async list(filters: InquiryListFilters): Promise<{ inquiries: InquiryRecord[]; total: number }> {
    const rows = [...this.inquiries.values()]
      .filter((inquiry) => !filters.status || inquiry.status === filters.status)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    return {
      inquiries: rows.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize),
      total: rows.length
    };
  }

  public async markRead(id: string): Promise<InquiryRecord | null> {
    const inquiry = this.inquiries.get(id);
    if (!inquiry) {
      return null;
    }
    const updated: InquiryRecord = {
      ...inquiry,
      status: "READ" satisfies InquiryStatus
    };
    this.inquiries.set(id, updated);
    return updated;
  }

  public async delete(id: string): Promise<InquiryRecord | null> {
    const inquiry = this.inquiries.get(id);
    if (!inquiry) {
      return null;
    }
    this.inquiries.delete(id);
    return inquiry;
  }

  private nextId(): string {
    this.sequence += 1;
    return `inquiry-${this.sequence}`;
  }
}
