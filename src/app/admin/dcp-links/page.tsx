import { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { DcpLinksManager } from "./dcp-links-client";

export const metadata: Metadata = {
  title: "DCP Links Admin | Plannera",
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

export default async function DcpLinksAdminPage({ searchParams }: PageProps) {
  const token = typeof searchParams?.token === "string" ? searchParams.token : undefined;

  requireAdminAccess(token);

  const links = await prisma.developmentControlPlanLink.findMany({
    orderBy: { lgaCode: "asc" },
    select: {
      id: true,
      lgaCode: true,
      name: true,
      url: true,
    },
  });

  return <DcpLinksManager links={links} token={token!} />;
}
