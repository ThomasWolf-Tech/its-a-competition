import type { Metadata } from "next";
import BracketBuilder from "@/components/bracket-builder";
export const metadata: Metadata = { title: "Create a bracket | It’s a Competition", description: "Name your showdown, add your competitors, and choose a trophy." };
export default function CreatePage() { return <main id="main-content"><BracketBuilder /></main>; }
