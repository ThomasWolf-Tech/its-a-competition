import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth-form";
import { requireUser } from "@/lib/auth";
export const metadata: Metadata = { title: "Reset password | It’s a Competition", robots: { index: false, follow: false } };
export default function Page() { return <main id="main-content" className="auth-shell"><Suspense fallback={<p role="status">Checking your reset link…</p>}><Reset /></Suspense></main>; }
async function Reset() { await requireUser("/account"); return <AuthForm reset />; }
