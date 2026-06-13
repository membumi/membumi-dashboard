import { NextResponse } from "next/server";

// Response envelope matching the Flutter client's dio_client expectations:
// { success, data, message, meta }
export function ok<T>(data: T, meta?: unknown) {
  return NextResponse.json({ success: true, data, message: null, meta: meta ?? null });
}

export function fail(message: string, status = 400) {
  return NextResponse.json(
    { success: false, data: null, message, meta: null },
    { status }
  );
}
