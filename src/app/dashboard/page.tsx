import { redirect } from "next/navigation";

export default function DashboardCompatibilityRedirect() {
  redirect("/projects");
}
