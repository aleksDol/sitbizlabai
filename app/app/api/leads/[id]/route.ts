import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLeadId, validateUpdateLeadPayload } from "@/lib/lead-validation";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

function withCors(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,PATCH,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

async function getIdFromContext(context: RouteContext): Promise<string | null> {
  const params = await Promise.resolve(context.params);
  return parseLeadId(params.id);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = await getIdFromContext(context);
    if (!id) {
      return withCors(NextResponse.json({ error: "Invalid lead id." }, { status: 400 }));
    }

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return withCors(NextResponse.json({ error: "Lead not found." }, { status: 404 }));
    }

    return withCors(NextResponse.json(lead));
  } catch (error) {
    console.error("GET /api/leads/[id] error:", error);
    return withCors(NextResponse.json({ error: "Internal server error." }, { status: 500 }));
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const id = await getIdFromContext(context);
    if (!id) {
      return withCors(NextResponse.json({ error: "Invalid lead id." }, { status: 400 }));
    }

    const body = await request.json();
    const validation = validateUpdateLeadPayload(body);
    if (!validation.ok) {
      return withCors(NextResponse.json({ errors: validation.errors }, { status: 400 }));
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: validation.data,
    });

    return withCors(NextResponse.json(updatedLead));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return withCors(NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }));
    }

    console.error("PATCH /api/leads/[id] error:", error);
    return withCors(NextResponse.json({ error: "Internal server error." }, { status: 500 }));
  }
}

