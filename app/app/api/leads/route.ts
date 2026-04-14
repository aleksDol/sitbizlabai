import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateCreateLeadPayload } from "@/lib/lead-validation";

function withCors(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateCreateLeadPayload(body);

    if (!validation.ok) {
      return withCors(NextResponse.json({ errors: validation.errors }, { status: 400 }));
    }

    const lead = await prisma.lead.create({ data: validation.data });
    return withCors(NextResponse.json(lead, { status: 201 }));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return withCors(NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }));
    }

    console.error("POST /api/leads error:", error);
    return withCors(NextResponse.json({ error: "Internal server error." }, { status: 500 }));
  }
}

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
    });
    return withCors(NextResponse.json(leads));
  } catch (error) {
    console.error("GET /api/leads error:", error);
    return withCors(NextResponse.json({ error: "Internal server error." }, { status: 500 }));
  }
}

