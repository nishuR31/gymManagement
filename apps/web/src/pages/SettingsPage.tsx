import type { SettingDto } from "@gym/shared";
import { useEffect, useMemo, useState } from "react";
import { Building2, Clock3, FileText, Percent, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { SkeletonRows } from "../components/ui/Skeleton";
import * as settingsApi from "../features/settings/settingsApi";
import { useAppSelector } from "../store/hooks";
import { getApiErrorMessage } from "../utils/apiError";
import { formatDateTime, readableStatus } from "../utils/format";
import { isAdminRole } from "../utils/roles";

const defaultKeys = ["gym-details", "business-hours", "tax-rate", "receipt-template", "general-config"] as const;
const firstDefaultKey = defaultKeys[0];

export function SettingsPage() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const [settings, setSettings] = useState<SettingDto[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>(firstDefaultKey);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const selected = useMemo(() => settings.find((setting) => setting.key === selectedKey), [selectedKey, settings]);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const rows = await settingsApi.listSettings();
      setSettings(rows);
      const firstKey = rows[0]?.key ?? firstDefaultKey;
      setSelectedKey((current) => current || firstKey);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load settings"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setDraft(JSON.stringify(selected?.value ?? defaultValueForKey(selectedKey), null, 2));
  }, [selected, selectedKey]);

  const keys = useMemo(() => [...new Set([...defaultKeys, ...settings.map((setting) => setting.key)])], [settings]);

  const save = async (): Promise<void> => {
    try {
      const value = JSON.parse(draft) as unknown;
      const setting = await settingsApi.updateSetting(selectedKey, value);
      setSettings((current) => {
        const remaining = current.filter((item) => item.key !== setting.key);
        return [...remaining, setting].sort((a, b) => a.key.localeCompare(b.key));
      });
      toast.success("Setting saved");
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Setting value must be valid JSON");
        return;
      }
      toast.error(getApiErrorMessage(error, "Could not save setting"));
    }
  };

  const handleClearCache = () => {
    const theme = localStorage.getItem("gymos-theme");
    localStorage.clear();
    sessionStorage.clear();
    if (theme) {
      localStorage.setItem("gymos-theme", theme);
    }
    window.location.reload();
  };

  return (
    <section className="grid max-w-7xl gap-6 animate-fade-in">
      <div className="card-base p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Control Room</p>
          <h2 className="mt-2 text-3xl font-black text-foreground">Settings</h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">Grouped gym details, business rules, receipts, and runtime configuration. Advanced values still save as JSON so the backend contract stays flexible.</p>
        </div>
        <div className="shrink-0">
          <Button variant="outline" onClick={handleClearCache} className="btn-outline h-9 px-4">
            Clear App Cache
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card title="Setting Groups">
          {loading ? <SkeletonRows rows={5} /> : null}
          {!loading && keys.length === 0 ? <EmptyState title="No settings found" /> : null}
          <div className="grid gap-2">
            {keys.map((key) => (
              (() => {
                const Icon = iconForKey(key);
                return (
              <button
                key={key}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold transition focus-visible:focus-ring ${
                  selectedKey === key ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
                onClick={() => setSelectedKey(key)}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate">{readableStatus(key)}</span>
                  <span className={`mt-0.5 block truncate text-xs ${selectedKey === key ? "text-foreground/70" : "text-muted-foreground"}`}>{descriptionForKey(key)}</span>
                </span>
              </button>
                );
              })()
            ))}
          </div>
        </Card>

        <Card
          title={readableStatus(selectedKey)}
          action={
            isAdminRole(role) ? (
              <Button className="h-9 px-3" onClick={() => void save()}>
                Save
              </Button>
            ) : null
          }
        >
          <div className="grid gap-3">
            <div className="card-base rounded-md p-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Editing</p>
              <Input label="Key" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)} disabled={!isAdminRole(role)} />
              <Button variant="secondary" className="mt-3 h-9 px-3" onClick={() => setDraft(JSON.stringify(defaultValueForKey(selectedKey), null, 2))} disabled={!isAdminRole(role)}>
                Use Template
              </Button>
            </div>
            <label className="grid gap-2 text-sm font-medium text-foreground">
              <span>Value JSON</span>
              <textarea
                className="input-base numeric min-h-80 resize-y"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={!isAdminRole(role)}
              />
            </label>
            {selected ? (
              <p className="text-xs font-semibold text-muted-foreground">
                Last updated {formatDateTime(selected.updatedAt)} by <span className="numeric">{selected.updatedBy ?? "system"}</span>
              </p>
            ) : (
              <p className="text-xs font-semibold text-muted-foreground">This key will be created when saved.</p>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}

function iconForKey(key: string) {
  if (key.includes("gym")) {
    return Building2;
  }
  if (key.includes("hours")) {
    return Clock3;
  }
  if (key.includes("tax")) {
    return Percent;
  }
  if (key.includes("receipt")) {
    return FileText;
  }
  return Settings;
}

function descriptionForKey(key: string): string {
  if (key.includes("gym")) {
    return "Name, contact, and address";
  }
  if (key.includes("hours")) {
    return "Daily opening windows";
  }
  if (key.includes("tax")) {
    return "Billing percentage";
  }
  if (key.includes("receipt")) {
    return "Printed receipt copy";
  }
  return "Custom runtime JSON";
}

function defaultValueForKey(key: string): unknown {
  if (key === "gym-details") {
    return { name: "Single Gym", phone: "", email: "", address: "" };
  }
  if (key === "business-hours") {
    return { monday: "06:00-22:00", tuesday: "06:00-22:00", wednesday: "06:00-22:00", thursday: "06:00-22:00", friday: "06:00-22:00", saturday: "08:00-20:00", sunday: "08:00-14:00" };
  }
  if (key === "tax-rate") {
    return { percent: 0 };
  }
  if (key === "receipt-template") {
    return { footer: "Thank you for training with us." };
  }
  return {};
}
