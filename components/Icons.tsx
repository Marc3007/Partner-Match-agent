type IconProps = { className?: string; size?: number };

const base = (size = 18) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none' });

export function ArrowRightIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function CheckIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function ThumbsUpIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Zm0 0 4.5-8a2 2 0 0 1 2 2.2L12.8 9H18a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 16.6 20H10a3 3 0 0 1-3-3v-6Z" />
    </svg>
  );
}

export function ThumbsDownIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3Zm0 0-4.5 8a2 2 0 0 1-2-2.2l.7-3.8H6a2 2 0 0 1-2-2.4l1.4-7A2 2 0 0 1 7.4 4H14a3 3 0 0 1 3 3v6Z" />
    </svg>
  );
}

export function DownloadIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12m0 0 4.5-4.5M12 15 7.5 10.5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function SparkleIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="currentColor">
      <path d="M12 2l1.8 5.6L19.4 9.4 13.8 11.2 12 17l-1.8-5.8L4.6 9.4 10.2 7.6 12 2Z" />
    </svg>
  );
}

export function LayersIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  );
}

export function ShieldIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-3Z" />
    </svg>
  );
}
