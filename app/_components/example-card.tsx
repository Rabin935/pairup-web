"use client";

export default function ExampleCard() {
  return (
    <div className="rounded-2xl border border-primary/20 bg-surface p-6 shadow-sm transition-colors dark:bg-surface">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        Featured
      </p>
      <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
        Dark mode ready card
      </h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        This card adapts its background, border, and text when the theme changes.
      </p>
      <button
        type="button"
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Action
      </button>
    </div>
  );
}
