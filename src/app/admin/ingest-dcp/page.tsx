import { Metadata } from "next";
import { notFound } from "next/navigation";

import { getByronDcpCoverage } from "@/lib/dcp/byron-ingestion";

import { AdminByronIngestForm } from "./ingest-dcp-client";

export const metadata: Metadata = {
  title: "DCP Ingest Admin | Plannera",
};

type PageProps = {
  searchParams?: {
    token?: string;
  };
};

const requireAdminAccess = (tokenFromQuery: string | undefined) => {
  const expectedToken = process.env.ADMIN_ACCESS_TOKEN;

  if (!expectedToken || tokenFromQuery !== expectedToken) {
    notFound();
  }
};

export default async function DcpIngestAdminPage({ searchParams }: PageProps) {
  const token = typeof searchParams?.token === "string" ? searchParams.token : undefined;

  requireAdminAccess(token);

  const coverage = await getByronDcpCoverage();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">DCP ingestion</h1>
        <p className="text-sm text-slate-600">Trigger admin-only DCP ingest tasks.</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <p className="text-lg font-semibold text-slate-900">Byron DCP 2014</p>
          <p className="text-sm text-slate-600">Re-run ingestion to refresh DCP clauses and workspace chunks.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Clause rows</p>
            <p className="text-2xl font-semibold text-slate-900">{coverage.clauseCount}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">DCP clauses</p>
            <p className="text-2xl font-semibold text-slate-900">{coverage.dcpClauseCount}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Workspace chunks</p>
            <p className="text-2xl font-semibold text-slate-900">{coverage.chunkCount}</p>
          </div>
        </div>

        <AdminByronIngestForm token={token!} />
      </div>
    </div>
  );
}
