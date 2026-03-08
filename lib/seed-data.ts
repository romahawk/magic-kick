import { format, addDays, startOfWeek } from "date-fns"
import type { Task, Goal, Project, Achievement, ScheduleItem, Resource, JournalEntry, Profile } from "./types"
import { DEFAULT_SYSTEM_CONFIG } from "./execution-os"

const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
const d = (offset: number) => format(addDays(weekStart, offset), "yyyy-MM-dd")
const today = format(new Date(), "yyyy-MM-dd")

export const seedProfile: Profile = {
  name: "Alex",
  onboardingCompleted: true,
  systemConfig: DEFAULT_SYSTEM_CONFIG,
  level: 7,
  xpTotal: 1840,
  xpThisWeek: 310,
  streakDays: 12,
}

export const seedTasks: Task[] = [
  { id: "t1", title: "Implement Stripe webhook handler", category: "Build", dueDate: today, estimateMin: 60, pomodorosPlanned: 2, completed: false, linkedProjectId: "p1", xpValue: 40 },
  { id: "t2", title: "Write landing page copy + hero section", category: "Marketing", dueDate: today, estimateMin: 45, pomodorosPlanned: 2, completed: false, linkedProjectId: "p1", xpValue: 30 },
  { id: "t3", title: "Morning workout – strength", category: "Health", dueDate: today, estimateMin: 50, completed: false, xpValue: 20 },
  { id: "t4", title: "Reply to 3 cold outreach emails", category: "Sales", dueDate: today, estimateMin: 20, completed: true, xpValue: 15 },
  { id: "t5", title: "Record short product demo video", category: "Marketing", dueDate: d(1), estimateMin: 90, pomodorosPlanned: 3, completed: false, linkedProjectId: "p1", xpValue: 35 },
  { id: "t6", title: "Fix auth bug on mobile Safari", category: "Build", dueDate: today, estimateMin: 30, completed: true, xpValue: 25 },
  { id: "t7", title: "Publish weekly build-in-public tweet thread", category: "Marketing", dueDate: d(1), estimateMin: 25, completed: false, xpValue: 15 },
  { id: "t8", title: "User interview – potential enterprise lead", category: "Research", dueDate: d(2), estimateMin: 45, completed: false, xpValue: 30 },
  { id: "t9", title: "Review and merge open PRs", category: "Build", dueDate: d(2), estimateMin: 30, completed: false, linkedProjectId: "p1", xpValue: 20 },
  { id: "t10", title: "Draft investor update email", category: "Growth", dueDate: d(3), estimateMin: 40, completed: false, xpValue: 25 },
]

export const seedGoals: Goal[] = [
  { id: "g1", title: "Launch MVP and get first 50 paying users", horizon: "mid", category: "Product", targetDate: d(45), priority: "high", notes: "Focus on activation — free trial to paid conversion", status: "active", progress: 42 },
  { id: "g2", title: "Reach $5K MRR", horizon: "mid", category: "Revenue", targetDate: d(90), priority: "high", notes: "Current: $1,200 MRR. Need 3–4 more mid-tier customers.", status: "active", progress: 24 },
  { id: "g3", title: "Build audience to 5K followers on X", horizon: "mid", category: "Marketing", targetDate: d(60), priority: "medium", notes: "Post daily, engage in founder/dev communities", status: "active", progress: 60 },
  { id: "g4", title: "Ship v2 with team collaboration features", horizon: "long", category: "Product", targetDate: d(120), priority: "high", notes: "Key for enterprise deals — multiplayer editing + roles", status: "active", progress: 10 },
  { id: "g5", title: "Apply to Y Combinator", horizon: "long", category: "Growth", priority: "medium", notes: "Next batch application opens in 3 months", status: "wishlist", progress: 0 },
  { id: "g6", title: "Write a technical book or course", horizon: "long", category: "Learning", priority: "low", notes: "Passive income + authority building", status: "wishlist", progress: 0 },
]

export const seedProjects: Project[] = [
  { id: "p1", title: "SaaS MVP Launch", objective: "Ship and market v1 to first 50 paying customers", weekStartISO: d(0), weekEndISO: d(6), milestones: [
    { id: "m1", title: "Stripe billing live", dayIndex: 0, completed: true },
    { id: "m2", title: "Landing page live", dayIndex: 1, completed: false },
    { id: "m3", title: "Product Hunt draft ready", dayIndex: 3, completed: false },
    { id: "m4", title: "Launch day", dayIndex: 5, completed: false },
  ], color: "bg-chart-1", status: "active", weeklyOutcome: "Finalize launch-ready billing and landing page" },
  { id: "p2", title: "Content Engine", objective: "Build consistent inbound via blog + social", weekStartISO: d(0), weekEndISO: d(6), milestones: [
    { id: "m5", title: "Publish SEO article #3", dayIndex: 1, completed: false },
    { id: "m6", title: "Tweet thread + LinkedIn post", dayIndex: 3, completed: false },
    { id: "m7", title: "Record YouTube devlog", dayIndex: 5, completed: false },
  ], color: "bg-chart-4", status: "active", weeklyOutcome: "Publish one article and one distribution batch" },
]

export const seedAchievements: Achievement[] = [
  { id: "a1", type: "badge", title: "7-Day Streak", date: d(-5), description: "Showed up and shipped 7 days straight", xpAwarded: 100, unlocked: true },
  { id: "a2", type: "badge", title: "14-Day Streak", date: "", description: "Two full weeks of consistent execution", xpAwarded: 200, unlocked: false },
  { id: "a3", type: "badge", title: "First Paying Customer", date: d(-14), description: "Someone paid real money for your product", xpAwarded: 250, unlocked: true },
  { id: "a4", type: "medal", title: "Product Hunt Top 5", date: d(-30), description: "Landed in the top 5 products of the day", xpAwarded: 300, unlocked: true },
  { id: "a5", type: "badge", title: "Pomodoro Machine", date: d(-3), description: "Completed 5 focused Pomodoro sessions in a day", xpAwarded: 60, unlocked: true },
  { id: "a6", type: "diploma", title: "Shipped 100 Commits", date: d(-10), description: "100 commits pushed to production branch", xpAwarded: 150, unlocked: true },
  { id: "a7", type: "badge", title: "$1K MRR", date: d(-20), description: "Hit your first $1,000 in monthly recurring revenue", xpAwarded: 400, unlocked: true },
  { id: "a8", type: "badge", title: "Consistency King", date: "", description: "Maintain a 30-day streak", xpAwarded: 300, unlocked: false },
]

export const seedSchedule: ScheduleItem[] = [
  { id: "s1", title: "Deep Work — Stripe integration", type: "study", startISO: `${today}T08:00`, endISO: `${today}T10:00`, color: "bg-chart-1" },
  { id: "s2", title: "Async standup + Slack triage", type: "school", startISO: `${today}T10:15`, endISO: `${today}T10:45`, color: "bg-chart-3" },
  { id: "s3", title: "User interview call", type: "study", startISO: `${today}T14:00`, endISO: `${today}T14:45`, color: "bg-chart-2" },
  { id: "s4", title: "Gym – strength training", type: "sport", startISO: `${today}T17:00`, endISO: `${today}T18:00`, color: "bg-chart-4" },
  { id: "s5", title: "Deep Work — landing page copy", type: "study", startISO: `${d(1)}T08:00`, endISO: `${d(1)}T10:30`, color: "bg-chart-1" },
  { id: "s6", title: "1:1 with advisor", type: "school", startISO: `${d(1)}T11:00`, endISO: `${d(1)}T11:45`, color: "bg-chart-3" },
  { id: "s7", title: "Content creation block", type: "hobby", startISO: `${d(2)}T15:00`, endISO: `${d(2)}T16:30`, color: "bg-chart-5" },
]

export const seedResources: Resource[] = [
  { id: "r1", category: "Build", title: "Stripe Docs", url: "https://stripe.com/docs", description: "Payments, subscriptions, webhooks", tags: ["payments", "saas"] },
  { id: "r2", category: "Build", title: "Vercel Docs", url: "https://vercel.com/docs", description: "Deployment, edge functions, analytics", tags: ["deployment", "next.js"] },
  { id: "r3", category: "Growth", title: "Indie Hackers", url: "https://indiehackers.com", description: "Founder stories, revenue numbers, community", tags: ["entrepreneurship", "saas"] },
  { id: "r4", category: "Growth", title: "Y Combinator Startup Library", url: "https://www.ycombinator.com/library", description: "Essays and talks from YC founders", tags: ["startups", "growth"] },
  { id: "r5", category: "Marketing", title: "Exploding Topics", url: "https://explodingtopics.com", description: "Trending topics before they blow up", tags: ["seo", "content"] },
  { id: "r6", category: "Build", title: "Shadcn UI", url: "https://ui.shadcn.com", description: "Copy-paste component library for React", tags: ["ui", "react"] },
  { id: "r7", category: "Growth", title: "Lenny's Newsletter", url: "https://lennysnewsletter.com", description: "Product growth strategy and benchmarks", tags: ["product", "growth"] },
]

export const seedJournal: JournalEntry[] = [
  { id: "j1", dateISO: today, type: "daily", mood: 4, highlights: "Stripe billing is finally live. Had a great user call — they confirmed the pain point is real.", challenges: "Landing page copy is still weak. Need to rewrite the value prop — too generic.", nextSteps: "Send landing page draft to 3 trusted users for brutal feedback tonight.", gratitude: "Grateful for the solo founder communities that share real revenue numbers. It keeps me grounded." },
  { id: "j2", dateISO: d(-1), type: "daily", mood: 3, highlights: "Fixed the Safari auth bug. Shipped two small UX improvements based on user feedback.", challenges: "Distracted in the afternoon. Wasted ~90 min on Twitter vs. building.", nextSteps: "Block social media from 8am–12pm. Use the time for deep work only.", gratitude: "Had a good gym session. Physical energy directly impacts mental clarity." },
  { id: "j3", dateISO: d(-7), type: "weekly", mood: 4, highlights: "Crossed $1,200 MRR. Closed two new customers from inbound. Product Hunt prep is on track.", challenges: "Scope creep on v2 features. Keep shipping what's needed for now, not what's exciting.", nextSteps: "Freeze v2 feature list. Focus 100% on launch and customer success this week.", gratitude: "Every user who pays is a vote of confidence. Remember why this matters." },
]
