/**
 * Socket.IO origin for the NestJS gateways. `NEXT_PUBLIC_API_URL` points at the
 * REST base (`…/v1`), but namespaces live at the server root, so the path is
 * stripped.
 */
export function socketOrigin(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";
  try {
    const url = new URL(base);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "http://localhost:3000";
  }
}
