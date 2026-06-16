export function isAuthorized(secret: string | null): boolean {
  const token = process.env.ADMIN_ACCESS_TOKEN ?? process.env.INGEST_ADMIN_SECRET ?? process.env.ADMIN_SECRET;
  if (!token) return false;
  return secret === token;
}
