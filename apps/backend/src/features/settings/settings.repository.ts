import { Prisma, type PrismaClient } from "@prisma/client";

export interface SettingRecord {
  key: string;
  value: unknown;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingsRepository {
  list(): Promise<SettingRecord[]>;
  find(key: string): Promise<SettingRecord | null>;
  upsert(key: string, value: unknown, updatedBy: string): Promise<SettingRecord>;
}

export class PrismaSettingsRepository implements SettingsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async list(): Promise<SettingRecord[]> {
    return this.prisma.setting.findMany({ orderBy: { key: "asc" } });
  }

  public async find(key: string): Promise<SettingRecord | null> {
    return this.prisma.setting.findUnique({ where: { key } });
  }

  public async upsert(key: string, value: unknown, updatedBy: string): Promise<SettingRecord> {
    return this.prisma.setting.upsert({
      where: { key },
      create: {
        key,
        value: value as Prisma.InputJsonValue,
        updatedBy
      },
      update: {
        value: value as Prisma.InputJsonValue,
        updatedBy
      }
    });
  }
}
