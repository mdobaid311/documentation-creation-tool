import { NextResponse } from "next/server";

// The capture extension calls /api/recordings from a chrome-extension:// origin,
// so those endpoints need permissive CORS. Tighten this for production.
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function json(data: unknown, init?: ResponseInit & { cors?: boolean }) {
  const headers = init?.cors ? CORS_HEADERS : undefined;
  return NextResponse.json(data, { ...init, headers });
}

export function error(message: string, status = 400, cors = false) {
  return NextResponse.json(
    { error: message },
    { status, headers: cors ? CORS_HEADERS : undefined }
  );
}

export function corsPreflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
