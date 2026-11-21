'use client';

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-control bg-forest-700 px-3 py-2 text-body font-semibold text-white">
      {label}
    </button>
  );
}
