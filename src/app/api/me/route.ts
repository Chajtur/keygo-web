import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/server/auth";

export async function GET() {
  const customer = await getCurrentCustomer();
  return customer
    ? NextResponse.json(customer)
    : NextResponse.json({ error: "No autenticado." }, { status: 401 });
}
