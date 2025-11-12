import { Metadata } from "next";

import { CalendarView } from "@/components/calendar/calendar-view";

export const metadata: Metadata = {
  title: "Calendar | Plannera",
};

export default function CalendarPage() {
  return <CalendarView />;
}
