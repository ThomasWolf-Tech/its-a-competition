import type { SVGProps } from "react";

const paths = {
  trophy: "M7 3h10v5a5 5 0 0 1-10 0V3ZM7 5H3v2a4 4 0 0 0 5 4M17 5h4v2a4 4 0 0 1-5 4M12 13v5m-4 3v-3h8v3M6 21h12",
  search: "m21 21-4.4-4.4M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z",
  plus: "M12 5v14M5 12h14",
  flame: "M12 3c2 5 6 6 6 11a6 6 0 1 1-12 0c0-2 1-4 3-6 0 3 1 4 2 4 2-3 1-5 1-9Z",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  chevron: "m9 5 7 7-7 7",
  close: "m6 6 12 12M6 18 18 6",
  moon: "M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z",
  sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  bracket: "M3 3h5v6H3M3 15h5v6H3M8 6h7v12H8M15 12h6",
  spark: "m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3Z",
  check: "m5 12 4 4L19 6",
  pause: "M8 5v14M16 5v14",
  play: "m8 4 12 8-12 8V4Z",
} as const;

export type IconName = keyof typeof paths;
export default function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
