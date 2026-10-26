import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site-header";
import Icon from "@/components/icon";
import "./globals.css";

export const metadata: Metadata = {
  title: "It's a Competition — May the Best Anything Win",
  description: "A friendly place to settle the score. Explore competition brackets, back your favorites, and find out who comes out on top.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" data-theme="dark" data-scroll-behavior="smooth"><body><SiteHeader />{children}<footer className="main-footer"><Link href="/" className="footer-brand"><Icon name="bracket" /> it’s a competition.</Link><span>Big opinions. Good company.</span><Link href="/bracket">Try the bracket demo <Icon name="arrow" /></Link></footer></body></html>;
}
