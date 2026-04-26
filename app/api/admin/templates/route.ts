import { NextResponse } from "next/server";
import { createTemplateFromPool, deleteTemplate, listPlayoffTemplates, renameTemplate } from "@/lib/data";

function isAuthorized(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  const requestSecret = request.headers.get("x-admin-secret");
  return Boolean(adminSecret && requestSecret === adminSecret);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const templates = await listPlayoffTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load templates." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as { poolId?: string; name?: string };
  if (!body.poolId || !body.name?.trim()) {
    return NextResponse.json({ error: "poolId and name are required." }, { status: 400 });
  }

  try {
    const template = await createTemplateFromPool(body.poolId, body.name);
    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create template." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as { templateId?: string; name?: string };
  if (!body.templateId || !body.name?.trim()) {
    return NextResponse.json({ error: "templateId and name are required." }, { status: 400 });
  }

  try {
    const template = await renameTemplate(body.templateId, body.name);
    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to rename template." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as { templateId?: string };
  if (!body.templateId) {
    return NextResponse.json({ error: "templateId is required." }, { status: 400 });
  }

  try {
    await deleteTemplate(body.templateId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete template." },
      { status: 500 }
    );
  }
}
