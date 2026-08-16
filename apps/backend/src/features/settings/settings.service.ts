import type { GymInfoDto, RoleName, SettingDto } from "@gym/shared";
import { errors } from "../../core/errors/app-error.js";
import type { SettingRecord, SettingsRepository } from "./settings.repository.js";
import type { AuditWriter } from "../../features/member/member.service.js";
import type { RequestActor, RequestContext } from "../../core/types/auth.js";
import { invalidateDashboardAndReports, type CacheService } from "../../core/cache/cache.service.js";

export class SettingsService {
  public constructor(
    private readonly repository: SettingsRepository,
    private readonly auditWriter: AuditWriter,
    private readonly dashboardReportCache?: CacheService
  ) {}

  public async list(actor: RequestActor): Promise<{ data: SettingDto[] }> {
    ensureAdminOrAbove(actor.role);
    return { data: (await this.repository.list()).map(toSettingDto) };
  }

  public async get(key: string, actor: RequestActor): Promise<SettingDto> {
    ensureAdminOrAbove(actor.role);
    const setting = await this.repository.find(key);
    if (!setting) {
      throw errors.notFound("Setting not found");
    }
    return toSettingDto(setting);
  }

  public async gymInfo(actor: RequestActor): Promise<GymInfoDto> {
    const [details, hours] = await Promise.all([
      this.repository.find("gym-details"),
      this.repository.find("business-hours")
    ]);
    return {
      ...toGymDetails(details?.value),
      businessHours: toBusinessHours(hours?.value)
    };
  }

  public async update(key: string, value: unknown, actor: RequestActor, context: RequestContext): Promise<SettingDto> {
    ensureAdminOrAbove(actor.role);
    const setting = await this.repository.upsert(key, value, actor.id);
    await Promise.all([
      this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "SETTING_UPDATED",
      entity: "Setting",
      entityId: key,
      metadata: { key },
      ...context
    }),
      invalidateDashboardAndReports(this.dashboardReportCache)
    ]);
    return toSettingDto(setting);
  }
}

function toSettingDto(setting: SettingRecord): SettingDto {
  return {
    key: setting.key,
    value: setting.value,
    updatedBy: setting.updatedBy,
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString()
  };
}

function ensureAdminOrAbove(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN") {
    return;
  }
  throw errors.forbidden();
}


function toGymDetails(value: unknown): Pick<GymInfoDto, "name" | "phone" | "email" | "address"> {
  if (!isRecord(value)) {
    return { name: "ValorFitness", phone: "", email: "", address: "" };
  }
  return {
    name: toText(value.name, "ValorFitness"),
    phone: toText(value.phone, ""),
    email: toText(value.email, ""),
    address: toText(value.address, "")
  };
}

function toBusinessHours(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {
      monday: "06:00-22:00",
      tuesday: "06:00-22:00",
      wednesday: "06:00-22:00",
      thursday: "06:00-22:00",
      friday: "06:00-22:00",
      saturday: "08:00-20:00",
      sunday: "08:00-14:00"
    };
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toText(item, "")]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toText(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}
