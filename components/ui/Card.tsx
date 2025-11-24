"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  padded?: boolean;
}

export function Card({ children, className = "", as: Tag = "div", padded = true }: CardProps) {
  return (
    <Tag
      className={`rounded-3xl border border-slate-600/70 bg-slate-700/60 backdrop-blur-md shadow-lg shadow-black/40 transition hover:border-slate-500/60 ${
        padded ? "p-6" : ""
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  hint?: string;
  accentClass?: string;
}

export function StatCard({ label, value, icon, hint, accentClass = "text-green-400" }: StatCardProps) {
  return (
    <Card className="group">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span className={`flex items-center justify-center rounded-lg bg-slate-600/60 p-3 ${accentClass}`}>{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{value}</p>
      {hint ? <p className="mt-2 text-[11px] text-slate-300">{hint}</p> : null}
    </Card>
  );
}
