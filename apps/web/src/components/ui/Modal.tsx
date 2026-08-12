import type { ReactNode } from "react";
import { Button } from "./Button";

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
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-backdrop/75 p-4 backdrop-blur-xs">
      <section className={`panel-gradient max-h-[calc(100vh-2rem)] w-full min-w-0 overflow-hidden rounded-lg border border-line shadow-xl ${size === "wide" ? "max-w-5xl" : "max-w-lg"}`}>
        <div className="dark-band-gradient flex min-w-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h3 className="min-w-0 truncate text-base font-bold text-ink">{title}</h3>
          <Button type="button" variant="secondary" className="h-9 px-3" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="max-h-[calc(100vh-6rem)] overflow-y-auto p-4">{children}</div>
      </section>
    </div>
  );
}
