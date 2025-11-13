"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, description, children }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Plannera.ai</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h3>
            {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-1 text-slate-500 transition hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}
