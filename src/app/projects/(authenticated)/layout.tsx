import type { ReactNode } from "react";

import { AuthenticatedAppLayout } from "@/components/layouts/authenticated-app-layout";

type ProjectsAuthenticatedLayoutProps = {
  children: ReactNode;
};

export default function ProjectsAuthenticatedLayout({ children }: ProjectsAuthenticatedLayoutProps) {
  return <AuthenticatedAppLayout>{children}</AuthenticatedAppLayout>;
}
