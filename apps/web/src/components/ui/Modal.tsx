import type { ReactNode } from "react";
import { Button } from "./Button";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "default" | "wide";
}

export function Modal({ title, open, onClose, children, size = "default" }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-background/80 backdrop-blur-sm/75 p-4 backdrop-blur-xs">
      <section className={`bg-card max-h-[calc(100vh-2rem)] w-full min-w-0 overflow-hidden rounded-lg border border-border shadow-xl ${size === "wide" ? "max-w-5xl" : "max-w-lg"}`}>
        <div className="dark-band-gradient flex min-w-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
          <h3 className="min-w-0 truncate text-base font-bold text-foreground">{title}</h3>
          <Button type="button" variant="ghost" className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-foreground" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[calc(100vh-5rem)] overflow-y-auto p-3">{children}</div>
      </section>
    </div>
  );
}
