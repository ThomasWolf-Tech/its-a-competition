import type { Metadata } from "next";
import CustomBracket from "@/components/custom-bracket";
export const metadata: Metadata = { title: "Your bracket preview | It’s a Competition", robots: { index: false, follow: false } };
export default function CustomBracketPage() { return <main id="main-content" className="page-shell"><CustomBracket /></main>; }
