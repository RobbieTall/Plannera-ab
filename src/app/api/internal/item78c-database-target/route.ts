import { databaseTargetDiagnostic } from "@/lib/item78c-database-target-diagnostic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return databaseTargetDiagnostic(request, process.env);
}
