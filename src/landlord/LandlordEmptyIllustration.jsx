export function LandlordEmptyIllustration({ className = "ld-empty-illustration-svg" }) {
  return (
    <svg
      viewBox="0 0 400 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Background House Silhouettes */}
      {/* Far left house backdrop */}
      <path d="M 85 148 L 85 96 L 110 78 L 135 96 L 135 148 Z" fill="#f1f5f9" />
      {/* Center left house */}
      <path d="M 135 148 L 135 72 L 170 52 L 205 72 L 205 148 Z" fill="#eceff1" />
      <rect x="148" y="82" width="12" height="15" fill="#ffffff" rx="1" />
      <rect x="174" y="82" width="12" height="15" fill="#ffffff" rx="1" />
      <rect x="148" y="106" width="12" height="15" fill="#ffffff" rx="1" />
      <rect x="174" y="106" width="12" height="15" fill="#ffffff" rx="1" />

      {/* Center right house */}
      <path d="M 205 148 L 205 80 L 240 64 L 275 80 L 275 148 Z" fill="#e8edf2" />
      <rect x="218" y="88" width="12" height="15" fill="#ffffff" rx="1" />
      <rect x="244" y="88" width="12" height="15" fill="#ffffff" rx="1" />
      <rect x="218" y="110" width="12" height="15" fill="#ffffff" rx="1" />
      <rect x="244" y="110" width="12" height="15" fill="#ffffff" rx="1" />
      {/* Far right house backdrop */}
      <path d="M 275 148 L 275 96 L 298 80 L 320 96 L 320 148 Z" fill="#f1f5f9" />

      {/* Birds in sky */}
      <path d="M 148 42 Q 151 38 154 42 Q 157 38 160 42" fill="none" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 218 50 Q 221 46 224 50 Q 227 46 230 50" fill="none" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 252 34 Q 255 30 258 34 Q 261 30 264 34" fill="none" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />

      {/* Bench 1 (left) */}
      <rect x="172" y="123" width="24" height="2.8" rx="0.8" fill="#94a3b8" />
      <rect x="172" y="127.5" width="24" height="2.8" rx="0.8" fill="#94a3b8" />
      <rect x="170" y="132.5" width="28" height="3" rx="0.8" fill="#64748b" />
      <line x1="173" y1="123" x2="173" y2="148" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="195" y1="123" x2="195" y2="148" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />

      {/* Bench 2 (right) */}
      <rect x="214" y="123" width="24" height="2.8" rx="0.8" fill="#94a3b8" />
      <rect x="214" y="127.5" width="24" height="2.8" rx="0.8" fill="#94a3b8" />
      <rect x="212" y="132.5" width="28" height="3" rx="0.8" fill="#64748b" />
      <line x1="215" y1="123" x2="215" y2="148" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="237" y1="123" x2="237" y2="148" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />

      {/* Tree 1 (far left, medium) */}
      <path d="M 98 62 A 17 36 0 0 0 98 134 Z" fill="#00a8e8" />
      <path d="M 98 62 A 17 36 0 0 1 98 134 Z" fill="#0284c7" />
      <line x1="98" y1="148" x2="98" y2="80" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="98" y1="110" x2="89" y2="98" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="98" y1="95" x2="107" y2="84" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />

      {/* Tree 2 (inner left, tall) */}
      <path d="M 136 34 A 25 50 0 0 0 136 134 Z" fill="#00a8e8" />
      <path d="M 136 34 A 25 50 0 0 1 136 134 Z" fill="#0284c7" />
      <line x1="136" y1="148" x2="136" y2="58" stroke="#1e293b" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="136" y1="102" x2="122" y2="86" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="136" y1="80" x2="150" y2="65" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />

      {/* Tree 3 (inner right, tall) */}
      <path d="M 264 34 A 25 50 0 0 0 264 134 Z" fill="#00a8e8" />
      <path d="M 264 34 A 25 50 0 0 1 264 134 Z" fill="#0284c7" />
      <line x1="264" y1="148" x2="264" y2="58" stroke="#1e293b" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="264" y1="102" x2="250" y2="86" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="264" y1="80" x2="278" y2="65" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />

      {/* Tree 4 (far right, medium) */}
      <path d="M 302 62 A 17 36 0 0 0 302 134 Z" fill="#00a8e8" />
      <path d="M 302 62 A 17 36 0 0 1 302 134 Z" fill="#0284c7" />
      <line x1="302" y1="148" x2="302" y2="80" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="302" y1="110" x2="293" y2="98" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="302" y1="95" x2="311" y2="84" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />

      {/* Dark shrubs at base of trees */}
      <ellipse cx="110" cy="136" rx="9" ry="16" fill="#1e293b" />
      <ellipse cx="290" cy="136" rx="9" ry="16" fill="#1e293b" />

      {/* Ground Line */}
      <line x1="30" y1="148" x2="370" y2="148" stroke="#cbd5e1" strokeWidth="1.2" />

      {/* Small dark ground details / pebbles */}
      <ellipse cx="162" cy="148" rx="4" ry="2.5" fill="#1e293b" />
      <ellipse cx="202" cy="148" rx="3.5" ry="2" fill="#1e293b" />
      <ellipse cx="242" cy="148" rx="4" ry="2.5" fill="#1e293b" />
    </svg>
  );
}
