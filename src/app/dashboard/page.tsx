import { Metadata } from "next";

import { ProjectsDashboard } from "@/components/dashboard/projects-dashboard";

export const metadata: Metadata = {
  title: "My Projects | Plannera",
};

export default function DashboardPage() {
  return <ProjectsDashboard />;
}
