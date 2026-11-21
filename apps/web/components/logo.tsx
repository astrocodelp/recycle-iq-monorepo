/** RecycleIQ mark (verbatim geometry from the design system): forest tile, white recycling loop,
 * lime leaf that doubles as the tail of the Q. Minimum 24px. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="riq-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1C7A44" />
          <stop offset="1" stopColor="#0F4A27" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9.5" fill="url(#riq-mark)" />
      <path d="M22.2 11.6A8 8 0 1 0 24 16.4" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M23.4 6.9 23.2 12.6 17.6 11.7Z" fill="#fff" />
      <path d="M17.2 17.2C19.6 15.6 24.4 15.8 25.4 21.6 19.6 22.6 16.6 20.4 17.2 17.2Z" fill="#C7F36B" />
      <path d="M18.4 18.6 22.6 20.4" stroke="#166534" strokeWidth="1" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-tight">
        <div className="text-[15px] font-extrabold tracking-[-0.03em] text-ink">
          Recycle<span className="text-forest-500">IQ</span>
        </div>
        {subtitle && <div className="text-[10px] font-bold tracking-[0.12em] text-muted uppercase">{subtitle}</div>}
      </div>
    </div>
  );
}
