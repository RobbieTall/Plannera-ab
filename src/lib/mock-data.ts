import type { DateRangeFilter } from "./utils";

export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus = "todo" | "in-progress" | "completed" | "blocked";
export type ProjectStatus = "active" | "on-hold" | "completed" | "archived";
export type ProjectPriority = "high" | "medium" | "low";

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
  assignee?: TeamMember | null;
  tags?: string[];
  estimatedHours?: number | null;
}

export interface ProjectActivity {
  id: string;
  summary: string;
  detail: string;
  timestamp: string;
  actor: TeamMember;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  location?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  color: string;
  tags: string[];
  tasks: Task[];
  teamMembers: TeamMember[];
  createdAt: string;
  activity: ProjectActivity[];
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
  {
    id: "task-031",
    title: "Energy modeling kickoff",
    description: "Begin energy performance modeling for smart district pilot.",
    priority: "high",
    status: "in-progress",
    dueDate: "2024-10-30",
    projectId: "proj-lumina",
    assignee: memberById["tm-10"],
  },
  {
    id: "task-032",
    title: "Community arts outreach",
    description: "Plan programming calendar with local arts partners.",
    priority: "medium",
    status: "todo",
    dueDate: "2024-11-16",
    projectId: "proj-terrace",
    assignee: memberById["tm-9"],
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
  "proj-lumina": ["tm-2", "tm-4", "tm-7", "tm-10"],
  "proj-terrace": ["tm-3", "tm-6", "tm-8", "tm-9"],
};

const mapProjectMembers = (ids: string[]): TeamMember[] =>
  ids.map((id) => memberById[id]).filter((member): member is TeamMember => Boolean(member));

const buildActivities = (
  entries: Array<{ id: string; summary: string; detail: string; timestamp: string; actorId: string }>,
): ProjectActivity[] =>
  entries
    .map((entry) => {
      const actor = memberById[entry.actorId];
      if (!actor) {
        return null;
      }
      return {
        id: entry.id,
        summary: entry.summary,
        detail: entry.detail,
        timestamp: entry.timestamp,
        actor,
      } satisfies ProjectActivity;
    })
    .filter((activity): activity is ProjectActivity => Boolean(activity));

const projectActivities: Record<string, ProjectActivity[]> = {
  "proj-aurora": buildActivities([
    {
      id: "act-aurora-1",
      summary: "Design package approved",
      detail: "City planning board signed off on schematic design updates.",
      timestamp: "2024-09-18T09:00:00Z",
      actorId: "tm-1",
    },
    {
      id: "act-aurora-2",
      summary: "Resident advisory session",
      detail: "Captured insights from mixed-income resident workshop.",
      timestamp: "2024-09-12T14:30:00Z",
      actorId: "tm-2",
    },
    {
      id: "act-aurora-3",
      summary: "Funding milestone met",
      detail: "Released tranche two after achieving energy compliance targets.",
      timestamp: "2024-09-05T16:45:00Z",
      actorId: "tm-5",
    },
  ]),
  "proj-evergreen": buildActivities([
    {
      id: "act-evergreen-1",
      summary: "Waiting on permit",
      detail: "City requested additional transport study before greenlighting phase 2.",
      timestamp: "2024-09-20T10:15:00Z",
      actorId: "tm-7",
    },
    {
      id: "act-evergreen-2",
      summary: "Community open house",
      detail: "Gathered 120 survey responses from neighborhood listening session.",
      timestamp: "2024-09-08T18:00:00Z",
      actorId: "tm-9",
    },
  ]),
  "proj-harbor": buildActivities([
    {
      id: "act-harbor-1",
      summary: "Facade materials locked",
      detail: "Selected recycled aluminum panels with sustainability committee.",
      timestamp: "2024-09-16T13:20:00Z",
      actorId: "tm-6",
    },
    {
      id: "act-harbor-2",
      summary: "Tenant communications",
      detail: "Issued October leasing update and timeline adjustments.",
      timestamp: "2024-09-22T09:40:00Z",
      actorId: "tm-8",
    },
  ]),
  "proj-metro": buildActivities([
    {
      id: "act-metro-1",
      summary: "Utility relocation paused",
      detail: "Awaiting clearance from transit authority before trench work resumes.",
      timestamp: "2024-09-14T11:00:00Z",
      actorId: "tm-3",
    },
    {
      id: "act-metro-2",
      summary: "Funding review",
      detail: "Finance flagged contingency burn rate for executive review.",
      timestamp: "2024-09-09T15:00:00Z",
      actorId: "tm-4",
    },
  ]),
  "proj-solaris": buildActivities([
    {
      id: "act-solaris-1",
      summary: "Lab layout iteration",
      detail: "Incorporated modular partition feedback from R&D teams.",
      timestamp: "2024-09-17T17:25:00Z",
      actorId: "tm-7",
    },
    {
      id: "act-solaris-2",
      summary: "Carbon workshop",
      detail: "Ran deep dive on embodied carbon options with analytics group.",
      timestamp: "2024-09-13T12:00:00Z",
      actorId: "tm-10",
    },
  ]),
  "proj-riverstone": buildActivities([
    {
      id: "act-riverstone-1",
      summary: "Boardwalk opened",
      detail: "Celebrated ribbon cutting with city partners and tenants.",
      timestamp: "2024-07-30T19:00:00Z",
      actorId: "tm-5",
    },
    {
      id: "act-riverstone-2",
      summary: "Final punch list",
      detail: "Closed out final punch items and archived documentation.",
      timestamp: "2024-08-12T09:30:00Z",
      actorId: "tm-8",
    },
  ]),
  "proj-skyline": buildActivities([
    {
      id: "act-skyline-1",
      summary: "Digital twin sync",
      detail: "Twin environment updated with latest mechanical revisions.",
      timestamp: "2024-09-19T08:30:00Z",
      actorId: "tm-10",
    },
    {
      id: "act-skyline-2",
      summary: "Wellness program brief",
      detail: "HR committee aligned on amenity mix for tenants.",
      timestamp: "2024-09-11T14:45:00Z",
      actorId: "tm-2",
    },
  ]),
  "proj-heritage": buildActivities([
    {
      id: "act-heritage-1",
      summary: "Historical review",
      detail: "Cultural board requested additional documentation before demo.",
      timestamp: "2024-09-15T10:10:00Z",
      actorId: "tm-9",
    },
    {
      id: "act-heritage-2",
      summary: "Archive digitization",
      detail: "Digitized 320 artifacts for virtual exhibit planning.",
      timestamp: "2024-09-06T16:05:00Z",
      actorId: "tm-8",
    },
  ]),
  "proj-lumina": buildActivities([
    {
      id: "act-lumina-1",
      summary: "Innovation grant awarded",
      detail: "Secured climate innovation grant to fund microgrid pilot.",
      timestamp: "2024-09-21T09:50:00Z",
      actorId: "tm-4",
    },
    {
      id: "act-lumina-2",
      summary: "Pilot district tour",
      detail: "Hosted delegation of smart city leaders for site walkthrough.",
      timestamp: "2024-09-18T18:10:00Z",
      actorId: "tm-7",
    },
  ]),
  "proj-terrace": buildActivities([
    {
      id: "act-terrace-1",
      summary: "Landscape concept refined",
      detail: "Incorporated community garden tiers into concept plan.",
      timestamp: "2024-09-20T08:55:00Z",
      actorId: "tm-6",
    },
    {
      id: "act-terrace-2",
      summary: "Arts collective onboarded",
      detail: "Signed memorandum of understanding with arts council.",
      timestamp: "2024-09-16T13:15:00Z",
      actorId: "tm-9",
    },
  ]),
};

export const projects: Project[] = [
  {
    id: "proj-aurora",
    name: "Aurora Housing Revamp",
    description: "Modernizing mixed-income housing with smart amenities and communal spaces.",
    location: "Bondi, NSW",
    status: "active",
    priority: "high",
    progress: 0.72,
    startDate: "2023-08-01",
    endDate: "2025-03-31",
    color: "#2563eb",
    tags: ["Housing", "Smart Living"],
    tasks: tasks.filter((task) => task.projectId === "proj-aurora"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-aurora"]),
    createdAt: "2024-01-15",
    activity: projectActivities["proj-aurora"],
  },
  {
    id: "proj-evergreen",
    name: "Evergreen Community Hub",
    description: "Transforming an old mall into a community-driven innovation hub.",
    location: "Fortitude Valley, QLD",
    status: "on-hold",
    priority: "medium",
    progress: 0.58,
    startDate: "2023-04-10",
    endDate: "2025-01-30",
    color: "#16a34a",
    tags: ["Community", "Innovation", "Adaptive Reuse"],
    tasks: tasks.filter((task) => task.projectId === "proj-evergreen"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-evergreen"]),
    createdAt: "2024-02-10",
    activity: projectActivities["proj-evergreen"],
  },
  {
    id: "proj-harbor",
    name: "Harborfront Residences",
    description: "Premium waterfront living with retail activation at ground level.",
    location: "St Kilda, VIC",
    status: "active",
    priority: "medium",
    progress: 0.64,
    startDate: "2023-06-01",
    endDate: "2024-12-15",
    color: "#0ea5e9",
    tags: ["Waterfront", "Residential"],
    tasks: tasks.filter((task) => task.projectId === "proj-harbor"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-harbor"]),
    createdAt: "2023-12-04",
    activity: projectActivities["proj-harbor"],
  },
  {
    id: "proj-metro",
    name: "Metro Transit Upgrade",
    description: "Upgrading city transit interchanges with mixed-use development.",
    location: "Parramatta, NSW",
    status: "active",
    priority: "high",
    progress: 0.41,
    startDate: "2022-11-01",
    endDate: "2025-08-01",
    color: "#f97316",
    tags: ["Transit", "Infrastructure"],
    tasks: tasks.filter((task) => task.projectId === "proj-metro"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-metro"]),
    createdAt: "2023-11-18",
    activity: projectActivities["proj-metro"],
  },
  {
    id: "proj-solaris",
    name: "Solaris Innovation Center",
    description: "Net-zero innovation campus with modular lab and workspace zones.",
    location: "Southbank, VIC",
    status: "active",
    priority: "high",
    progress: 0.67,
    startDate: "2024-01-05",
    endDate: "2025-09-30",
    color: "#facc15",
    tags: ["Innovation", "Net-zero"],
    tasks: tasks.filter((task) => task.projectId === "proj-solaris"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-solaris"]),
    createdAt: "2024-03-05",
    activity: projectActivities["proj-solaris"],
  },
  {
    id: "proj-riverstone",
    name: "Riverstone Waterfront",
    description: "Mixed-use waterfront boardwalk with retail and public amenities.",
    location: "Newcastle, NSW",
    status: "completed",
    priority: "medium",
    progress: 1,
    startDate: "2022-02-14",
    endDate: "2024-07-30",
    color: "#0f172a",
    tags: ["Waterfront", "Retail"],
    tasks: tasks.filter((task) => task.projectId === "proj-riverstone"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-riverstone"]),
    createdAt: "2023-07-22",
    activity: projectActivities["proj-riverstone"],
  },
  {
    id: "proj-skyline",
    name: "Skyline Workspace",
    description: "Flexible workspace tower with integrated wellness programs.",
    location: "Brisbane CBD, QLD",
    status: "active",
    priority: "medium",
    progress: 0.53,
    startDate: "2024-02-20",
    endDate: "2025-11-15",
    color: "#8b5cf6",
    tags: ["Workplace", "Wellness"],
    tasks: tasks.filter((task) => task.projectId === "proj-skyline"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-skyline"]),
    createdAt: "2024-04-16",
    activity: projectActivities["proj-skyline"],
  },
  {
    id: "proj-heritage",
    name: "Heritage Library Restoration",
    description: "Revitalizing historic library into a modern cultural landmark.",
    location: "Adelaide, SA",
    status: "on-hold",
    priority: "high",
    progress: 0.45,
    startDate: "2023-05-18",
    endDate: "2025-04-30",
    color: "#fb7185",
    tags: ["Cultural", "Restoration"],
    tasks: tasks.filter((task) => task.projectId === "proj-heritage"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-heritage"]),
    createdAt: "2023-10-01",
    activity: projectActivities["proj-heritage"],
  },
  {
    id: "proj-lumina",
    name: "Lumina Smart District",
    description: "Deploying smart infrastructure and public realm tech across a downtown grid.",
    location: "Melbourne CBD, VIC",
    status: "active",
    priority: "high",
    progress: 0.36,
    startDate: "2024-06-12",
    endDate: "2026-01-19",
    color: "#ef4444",
    tags: ["Smart City", "Energy"],
    tasks: tasks.filter((task) => task.projectId === "proj-lumina"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-lumina"]),
    createdAt: "2024-06-15",
    activity: projectActivities["proj-lumina"],
  },
  {
    id: "proj-terrace",
    name: "Terrace Arts Center",
    description: "Converting an industrial terrace into a creative campus with public gardens.",
    location: "Fremantle, WA",
    status: "archived",
    priority: "medium",
    progress: 0.2,
    startDate: "2021-09-05",
    endDate: null,
    color: "#14b8a6",
    tags: ["Arts", "Community"],
    tasks: tasks.filter((task) => task.projectId === "proj-terrace"),
    teamMembers: mapProjectMembers(projectMemberIds["proj-terrace"]),
    createdAt: "2022-03-28",
    activity: projectActivities["proj-terrace"],
  },
];
