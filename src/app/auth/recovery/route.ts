import type { NextRequest } from "next/server";
import { completeAuth } from "@/lib/auth-callback";
export async function GET(request: NextRequest) { return completeAuth(request, true); }
