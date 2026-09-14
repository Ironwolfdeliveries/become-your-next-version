import { NextResponse } from "next/server";
import { getMemberJourney } from "@/lib/member-journey";
export async function GET() {
  return NextResponse.json(await getMemberJourney(), { headers: { "Cache-Control": "private, no-store" } });
}
