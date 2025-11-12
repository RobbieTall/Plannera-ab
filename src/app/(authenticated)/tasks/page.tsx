import { Metadata } from "next";

import { TasksView } from "@/components/tasks/tasks-view";

export const metadata: Metadata = {
  title: "Tasks | Plannera",
};

export default function TasksPage() {
  return <TasksView />;
}
