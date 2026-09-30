import type { ReactNode } from "react";

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function InboxIcon() {
  return (
    <Svg>
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M5.5 5h13L21 13v6H3v-6z" />
    </Svg>
  );
}

export function AlertIcon() {
  return (
    <Svg>
      <path d="M12 3 2.5 20h19z" />
      <path d="M12 10v4" />
      <path d="M12 17.5v.01" />
    </Svg>
  );
}
