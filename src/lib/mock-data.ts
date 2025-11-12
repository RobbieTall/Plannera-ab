import type { DateRangeFilter } from "./utils";

export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus = "todo" | "in-progress" | "completed" | "blocked";
export type ProjectStatus = "on-track" | "at-risk" | "off-track" | "completed";

export interface TeamMember {
  id: string;
  name: string;
  avatarUrl: string;
  role: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  projectId: string;
  assignee: TeamMember;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  tasks: Task[];
  teamMembers: TeamMember[];
  createdAt: string;
}

export const dateRanges: Array<{ label: string; value: DateRangeFilter }> = [
  { label: "All dates", value: "all" },
  { label: "Overdue", value: "overdue" },
  { label: "This week", value: "this-week" },
  { label: "Next week", value: "next-week" },
  { label: "This month", value: "this-month" },
];

export const teamMembers: TeamMember[] = [
  {
    id: "tm-1",
    name: "Avery Johnson",
    avatarUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Avery+Johnson",
    role: "Product Manager",
  },
  {
    id: "tm-2",
    name: "Maya Patel",
    avatarUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Maya+Patel",
    role: "Design Lead",
  },
  {
    id: "tm-3",
    name: "Noah Williams",
    avatarUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Noah+Williams",
    role: "Site Supervisor",
  },
  {
    id: "tm-4",
    name: "Evelyn Chen",
    avatarUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Evelyn+Chen",
    role: "Finance Analyst",
  },
  {
    id: "tm-5",
    name: "Luca Rossi",
    avatarUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Luca+Rossi",
    role: "Operations",
  },
  {
    id: "tm-6",
    name: "Sophia Martinez",
    avatarUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Sophia+Martinez",
    role: "Architect",
  },
  {
    id: "tm-7",
    name: "Kai Nakamura",
    avatarUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Kai+Nakamura",
    role: "Planner",
  },
  {
    id: "tm-8",
    name: "Harper Singh",
    avatarUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Harper+Singh",
    role: "Project Coordinator",
  },
  {
    id: "tm-9",
    name: "Isla Thompson",
    avatarUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Isla+Thompson",
    role: "Research",
  },
  {
    id: "tm-10",
    name: "Mateo Alvarez",
    avatarUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Mateo+Alvarez",
    role: "Data Analyst",
  },
];

const memberById = Object.fromEntries(teamMembers.map((member) => [member.id, member])) as Record<string, TeamMember>;

export const tasks: Task[] = [
  {
    id: "task-001",
    title: "Zoning board submission",
    description: "Finalize documentation package and submit to zoning board for preliminary review.",
    priority: "high",
    status: "in-progress",
    dueDate: "2024-10-18",
    projectId: "proj-aurora",
    assignee: memberById["tm-1"],
  },
  {
    id: "task-002",
    title: "Community feedback digest",
    description: "Compile feedback from recent workshops into an actionable summary.",
    priority: "medium",
    status: "todo",
    dueDate: "2024-10-25",
    projectId: "proj-evergreen",
    assignee: memberById["tm-9"],
  },
  {
    id: "task-003",
    title: "Facade material review",
    description: "Review shortlisted facade materials with sustainability team.",
    priority: "low",
    status: "completed",
    dueDate: "2024-09-30",
    projectId: "proj-harbor",
    assignee: memberById["tm-6"],
  },
  {
    id: "task-004",
    title: "Cost variance analysis",
    description: "Analyze budget variance for Q3 and prepare mitigation options.",
    priority: "high",
    status: "blocked",
    dueDate: "2024-10-05",
    projectId: "proj-metro",
    assignee: memberById["tm-4"],
  },
  {
    id: "task-005",
    title: "Stakeholder update deck",
    description: "Prepare presentation for upcoming stakeholder steering committee.",
    priority: "medium",
    status: "in-progress",
    dueDate: "2024-10-12",
    projectId: "proj-aurora",
    assignee: memberById["tm-2"],
  },
  {
    id: "task-006",
    title: "Permit renewal request",
    description: "Submit renewal for expiring construction permits and track approvals.",
    priority: "high",
    status: "todo",
    dueDate: "2024-11-02",
    projectId: "proj-solaris",
    assignee: memberById["tm-3"],
  },
  {
    id: "task-007",
    title: "Digital twin sync",
    description: "Sync BIM updates with digital twin environment and notify partners.",
    priority: "medium",
    status: "in-progress",
    dueDate: "2024-10-14",
    projectId: "proj-skyline",
    assignee: memberById["tm-10"],
  },
  {
    id: "task-008",
    title: "Sustainability workshop",
    description: "Facilitate workshop on low-carbon materials with engineering team.",
    priority: "low",
    status: "todo",
    dueDate: "2024-11-08",
    projectId: "proj-evergreen",
    assignee: memberById["tm-7"],
  },
  {
    id: "task-009",
    title: "Vendor contract renewal",
    description: "Review contract terms with primary contractor before renewal.",
    priority: "high",
    status: "in-progress",
    dueDate: "2024-10-22",
    projectId: "proj-riverstone",
    assignee: memberById["tm-5"],
  },
  {
    id: "task-010",
    title: "Design QA checklist",
    description: "Complete QA checklist for level 12 design package.",
    priority: "medium",
    status: "completed",
    dueDate: "2024-09-20",
    projectId: "proj-skyline",
    assignee: memberById["tm-6"],
  },
  {
    id: "task-011",
    title: "Traffic impact report",
    description: "Finalize traffic study and align with transportation authority.",
    priority: "medium",
    status: "in-progress",
    dueDate: "2024-10-19",
    projectId: "proj-metro",
    assignee: memberById["tm-7"],
  },
  {
    id: "task-012",
    title: "Interior design mockups",
    description: "Deliver updated interior concepts for tenant review.",
    priority: "low",
    status: "todo",
    dueDate: "2024-11-12",
    projectId: "proj-aurora",
    assignee: memberById["tm-2"],
  },
  {
    id: "task-013",
    title: "Funding milestone documentation",
    description: "Prepare documentation for milestone funding release.",
    priority: "high",
    status: "completed",
    dueDate: "2024-09-15",
    projectId: "proj-riverstone",
    assignee: memberById["tm-4"],
  },
  {
    id: "task-014",
    title: "Tenant communications",
    description: "Send monthly project update to tenant representatives.",
    priority: "medium",
    status: "todo",
    dueDate: "2024-10-28",
    projectId: "proj-harbor",
    assignee: memberById["tm-8"],
  },
  {
    id: "task-015",
    title: "Historical compliance survey",
    description: "Conduct survey of heritage elements before demolition stage.",
    priority: "high",
    status: "blocked",
    dueDate: "2024-10-03",
    projectId: "proj-heritage",
    assignee: memberById["tm-9"],
  },
  {
    id: "task-016",
    title: "Landscape design briefing",
    description: "Coordinate briefing with landscape consultants for plaza redesign.",
    priority: "medium",
    status: "in-progress",
    dueDate: "2024-10-24",
    projectId: "proj-evergreen",
    assignee: memberById["tm-6"],
  },
  {
    id: "task-017",
    title: "QA site inspection",
    description: "Perform weekly QA inspection and log action items.",
    priority: "high",
    status: "in-progress",
    dueDate: "2024-10-11",
    projectId: "proj-solaris",
    assignee: memberById["tm-3"],
  },
  {
    id: "task-018",
    title: "Lease negotiation support",
    description: "Support commercial team with data for lease negotiations.",
    priority: "low",
    status: "todo",
    dueDate: "2024-11-18",
    projectId: "proj-skyline",
    assignee: memberById["tm-10"],
  },
  {
    id: "task-019",
    title: "Risk register refresh",
    description: "Update project risk register and flag new mitigation owners.",
    priority: "high",
    status: "in-progress",
    dueDate: "2024-10-09",
    projectId: "proj-aurora",
    assignee: memberById["tm-5"],
  },
  {
    id: "task-020",
    title: "Urban design board prep",
    description: "Prepare visuals and talking points for design board presentation.",
    priority: "medium",
    status: "todo",
    dueDate: "2024-11-05",
    projectId: "proj-heritage",
    assignee: memberById["tm-1"],
  },
  {
    id: "task-021",
    title: "Utility relocation plan",
    description: "Coordinate relocation schedule with utilities providers.",
    priority: "high",
    status: "blocked",
    dueDate: "2024-09-27",
    projectId: "proj-metro",
    assignee: memberById["tm-3"],
  },
  {
    id: "task-022",
    title: "Carbon impact modeling",
    description: "Model embodied carbon scenarios for design alternatives.",
    priority: "medium",
    status: "in-progress",
    dueDate: "2024-10-31",
    projectId: "proj-solaris",
    assignee: memberById["tm-10"],
  },
  {
    id: "task-023",
    title: "Wayfinding concept sketches",
    description: "Create preliminary wayfinding concepts for lobby areas.",
    priority: "low",
    status: "todo",
    dueDate: "2024-11-10",
    projectId: "proj-harbor",
    assignee: memberById["tm-2"],
  },
  {
    id: "task-024",
    title: "Schematic design sign-off",
    description: "Schedule and conduct schematic design sign-off meeting.",
    priority: "high",
    status: "completed",
    dueDate: "2024-09-10",
    projectId: "proj-aurora",
    assignee: memberById["tm-1"],
  },
  {
    id: "task-025",
    title: "Data room cleanup",
    description: "Archive outdated documents and reorganize shared folders.",
    priority: "low",
    status: "completed",
    dueDate: "2024-09-18",
    projectId: "proj-riverstone",
    assignee: memberById["tm-8"],
  },
  {
    id: "task-026",
    title: "Cultural advisory session",
    description: "Meet with cultural advisory board to review interpretive plan.",
    priority: "medium",
    status: "todo",
    dueDate: "2024-11-03",
    projectId: "proj-heritage",
    assignee: memberById["tm-9"],
  },
  {
    id: "task-027",
    title: "Lifecycle cost modeling",
    description: "Update lifecycle model with revised mechanical system specs.",
    priority: "high",
    status: "in-progress",
    dueDate: "2024-10-17",
    projectId: "proj-solaris",
    assignee: memberById["tm-4"],
  },
  {
    id: "task-028",
    title: "Innovation sprint planning",
    description: "Plan next innovation sprint with partner labs and define brief.",
    priority: "medium",
    status: "todo",
    dueDate: "2024-11-14",
    projectId: "proj-solaris",
    assignee: memberById["tm-7"],
  },
  {
    id: "task-029",
    title: "Wayleave agreement drafting",
    description: "Draft agreement for access through adjacent property.",
    priority: "medium",
    status: "in-progress",
    dueDate: "2024-10-20",
    projectId: "proj-metro",
    assignee: memberById["tm-5"],
  },
  {
    id: "task-030",
    title: "Tenant fit-out guidelines",
    description: "Create guidelines for tenant fit-out to align with sustainability goals.",
    priority: "low",
    status: "todo",
    dueDate: "2024-11-21",
    projectId: "proj-skyline",
    assignee: memberById["tm-6"],
  },
];

const projectMemberIds: Record<string, string[]> = {
  "proj-aurora": ["tm-1", "tm-2", "tm-5", "tm-6"],
  "proj-evergreen": ["tm-6", "tm-7", "tm-9"],
  "proj-harbor": ["tm-2", "tm-6", "tm-8"],
  "proj-metro": ["tm-3", "tm-4", "tm-5", "tm-7"],
  "proj-solaris": ["tm-3", "tm-4", "tm-7", "tm-10"],
  "proj-riverstone": ["tm-4", "tm-5", "tm-8"],
  "proj-skyline": ["tm-2", "tm-6", "tm-10"],
  "proj-heritage": ["tm-1", "tm-8", "tm-9"],
};

const mapProjectMembers = (ids: string[]): TeamMember[] =>
  ids.map((id) => memberById[id]).filter((member): member is TeamMember => Boolean(member));

export const projects: Project[] = [
  {
    id: "proj-aurora",
    name: "Aurora Housing Revamp",
    description: "Modernizing mixed-income housing with smart amenities and communal spaces.",
    status: "on-track",
    progress: 0.72,
    tasks: tasks.filter((task) => task.projectId === "proj-aurora"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-aurora"]),
    createdAt: "2024-01-15",
  },
  {
    id: "proj-evergreen",
    name: "Evergreen Community Hub",
    description: "Transforming an old mall into a community-driven innovation hub.",
    status: "at-risk",
    progress: 0.58,
    tasks: tasks.filter((task) => task.projectId === "proj-evergreen"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-evergreen"]),
    createdAt: "2024-02-10",
  },
  {
    id: "proj-harbor",
    name: "Harborfront Residences",
    description: "Premium waterfront living with retail activation at ground level.",
    status: "on-track",
    progress: 0.64,
    tasks: tasks.filter((task) => task.projectId === "proj-harbor"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-harbor"]),
    createdAt: "2023-12-04",
  },
  {
    id: "proj-metro",
    name: "Metro Transit Upgrade",
    description: "Upgrading city transit interchanges with mixed-use development.",
    status: "off-track",
    progress: 0.41,
    tasks: tasks.filter((task) => task.projectId === "proj-metro"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-metro"]),
    createdAt: "2023-11-18",
  },
  {
    id: "proj-solaris",
    name: "Solaris Innovation Center",
    description: "Net-zero innovation campus with modular lab and workspace zones.",
    status: "on-track",
    progress: 0.67,
    tasks: tasks.filter((task) => task.projectId === "proj-solaris"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-solaris"]),
    createdAt: "2024-03-05",
  },
  {
    id: "proj-riverstone",
    name: "Riverstone Waterfront",
    description: "Mixed-use waterfront boardwalk with retail and public amenities.",
    status: "completed",
    progress: 1,
    tasks: tasks.filter((task) => task.projectId === "proj-riverstone"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-riverstone"]),
    createdAt: "2023-07-22",
  },
  {
    id: "proj-skyline",
    name: "Skyline Workspace",
    description: "Flexible workspace tower with integrated wellness programs.",
    status: "at-risk",
    progress: 0.53,
    tasks: tasks.filter((task) => task.projectId === "proj-skyline"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-skyline"]),
    createdAt: "2024-04-16",
  },
  {
    id: "proj-heritage",
    name: "Heritage Library Restoration",
    description: "Revitalizing historic library into a modern cultural landmark.",
    status: "on-track",
    progress: 0.45,
    tasks: tasks.filter((task) => task.projectId === "proj-heritage"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-heritage"]),
    createdAt: "2023-10-01",
  },
];
