import TrendingPageShell from "@/components/trending-page-shell";
import TrendingSkeleton from "@/components/trending-skeleton";
import "./trending.css";

export default function Loading() {
  return <TrendingPageShell><TrendingSkeleton /></TrendingPageShell>;
}
