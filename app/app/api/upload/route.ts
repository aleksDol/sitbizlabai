import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isAdminSessionValue } from "@/lib/admin-session";
import { uploadImageToYandexStorage } from "@/lib/yandex-storage";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!isAdminSessionValue(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    if (!isImageFile(file)) {
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 10MB." }, { status: 400 });
    }

    const url = await uploadImageToYandexStorage(file);
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    const message = error instanceof Error && error.message ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
