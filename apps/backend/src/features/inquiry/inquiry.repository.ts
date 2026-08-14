import type { InquiryStatus } from "@gym/shared";
import type { PrismaClient } from "@prisma/client";

export interface InquiryRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: InquiryStatus;
  createdAt: Date;
}

export interface CreateInquiryInput {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export interface InquiryListFilters {
  status?: InquiryStatus | undefined;
  page: number;
  pageSize: number;
}

export interface InquiryRepository {
  create(input: CreateInquiryInput): Promise<InquiryRecord>;
  list(filters: InquiryListFilters): Promise<{ inquiries: InquiryRecord[]; total: number }>;
  markRead(id: string): Promise<InquiryRecord | null>;
  delete(id: string): Promise<InquiryRecord | null>;
}

export class PrismaInquiryRepository implements InquiryRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async create(input: CreateInquiryInput): Promise<InquiryRecord> {
    const inquiry = await this.prisma.inquiry.create({
      data: input
    });
    return toInquiryRecord(inquiry);
  }

  public async list(filters: InquiryListFilters): Promise<{ inquiries: InquiryRecord[]; total: number }> {
    const where = filters.status ? { status: filters.status } : {};
    const [inquiries, total] = await Promise.all([
      this.prisma.inquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize
      }),
      this.prisma.inquiry.count({ where })
    ]);
    return { inquiries: inquiries.map(toInquiryRecord), total };
  }

  public async markRead(id: string): Promise<InquiryRecord | null> {
    const inquiry = await this.prisma.inquiry
      .update({
        where: { id },
        data: { status: "READ" }
      })
      .catch(() => null);
    return inquiry ? toInquiryRecord(inquiry) : null;
  }

  public async delete(id: string): Promise<InquiryRecord | null> {
    const inquiry = await this.prisma.inquiry.delete({ where: { id } }).catch(() => null);
    return inquiry ? toInquiryRecord(inquiry) : null;
  }
}

function toInquiryRecord(row: {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  createdAt: Date;
}): InquiryRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    status: row.status as InquiryStatus,
    createdAt: row.createdAt
  };
}
