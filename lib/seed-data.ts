import { format, addDays, startOfWeek } from "date-fns"
import type { Task, Goal, Project, Achievement, ScheduleItem, Resource, JournalEntry, Profile } from "./types"

const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
const d = (offset: number) => format(addDays(weekStart, offset), "yyyy-MM-dd")
const today = format(new Date(), "yyyy-MM-dd")

export const seedProfile: Profile = {
  name: "Kyryll",
  onboardingCompleted: true,
  level: 4,
  xpTotal: 720,
  xpThisWeek: 185,
  streakDays: 5,
}

export const seedTasks: Task[] = [
  { id: "t1", title: "Algorithms practice - Binary Trees", category: "Learning", dueDate: today, estimateMin: 45, pomodorosPlanned: 2, completed: false, linkedProjectId: "p1", xpValue: 30 },
  { id: "t2", title: "Read Physics chapter 12", category: "Learning", dueDate: today, estimateMin: 30, completed: false, xpValue: 20 },
  { id: "t3", title: "Football training drills", category: "Sport", dueDate: today, estimateMin: 60, completed: false, xpValue: 25 },
  { id: "t4", title: "Clean room & organize desk", category: "Family/Home", dueDate: d(1), completed: false, xpValue: 10 },
  { id: "t5", title: "Build portfolio project page", category: "Learning", dueDate: d(2), estimateMin: 90, pomodorosPlanned: 3, completed: false, linkedProjectId: "p1", xpValue: 40 },
  { id: "t6", title: "Math homework - Calculus", category: "Learning", dueDate: d(1), estimateMin: 40, completed: true, xpValue: 20 },
  { id: "t7", title: "Research summer CS camps", category: "Hobby", dueDate: d(3), completed: false, xpValue: 15 },
  { id: "t8", title: "Sprint intervals at track", category: "Sport", dueDate: d(3), estimateMin: 45, completed: false, xpValue: 25 },
  { id: "t9", title: "Plan family weekend trip", category: "Travel", dueDate: d(4), completed: false, xpValue: 10 },
  { id: "t10", title: "Guitar practice - new song", category: "Hobby", dueDate: d(5), estimateMin: 30, completed: false, xpValue: 15 },
]

export const seedGoals: Goal[] = [
  { id: "g1", title: "Master Data Structures & Algorithms", horizon: "mid", category: "CS", targetDate: d(60), priority: "high", notes: "Complete 50 LeetCode problems", status: "active", progress: 35 },
  { id: "g2", title: "Get into CS program at university", horizon: "long", category: "Education", targetDate: "2027-09-01", priority: "high", notes: "Maintain GPA, build portfolio, get recommendations", status: "active", progress: 20 },
  { id: "g3", title: "Run 5K under 22 minutes", horizon: "mid", category: "Sport", targetDate: d(45), priority: "medium", notes: "Current PB: 24:10", status: "active", progress: 55 },
  { id: "g4", title: "Build 3 full-stack projects", horizon: "mid", category: "CS", targetDate: d(90), priority: "high", notes: "Portfolio pieces for applications", status: "active", progress: 15 },
  { id: "g5", title: "Learn Japanese basics", horizon: "long", category: "Language", priority: "low", notes: "Would love to visit Japan", status: "wishlist", progress: 0 },
  { id: "g6", title: "Start a tech YouTube channel", horizon: "long", category: "CS", priority: "low", notes: "Share learning journey", status: "wishlist", progress: 0 },
]

export const seedProjects: Project[] = [
  { id: "p1", title: "Portfolio Website", objective: "Build personal dev portfolio with Next.js", weekStartISO: d(0), weekEndISO: d(6), milestones: [
    { id: "m1", title: "Design mockup", dayIndex: 0, completed: true },
    { id: "m2", title: "Setup project", dayIndex: 1, completed: true },
    { id: "m3", title: "Build pages", dayIndex: 3, completed: false },
    { id: "m4", title: "Deploy", dayIndex: 5, completed: false },
  ], color: "bg-chart-1" },
  { id: "p2", title: "5K Training Plan", objective: "Week 6 of 10-week plan", weekStartISO: d(0), weekEndISO: d(6), milestones: [
    { id: "m5", title: "Easy run 3K", dayIndex: 1, completed: false },
    { id: "m6", title: "Interval training", dayIndex: 3, completed: false },
    { id: "m7", title: "Long run 5K", dayIndex: 5, completed: false },
  ], color: "bg-chart-4" },
]

export const seedAchievements: Achievement[] = [
  { id: "a1", type: "badge", title: "3-Day Streak", date: d(-5), description: "Completed tasks 3 days in a row", xpAwarded: 50, unlocked: true },
  { id: "a2", type: "badge", title: "7-Day Streak", date: "", description: "Complete tasks 7 days in a row", xpAwarded: 100, unlocked: false },
  { id: "a3", type: "badge", title: "First Project Milestone", date: d(-3), description: "Completed your first project milestone", xpAwarded: 30, unlocked: true },
  { id: "a4", type: "badge", title: "10 Learning Tasks", date: d(-2), description: "Completed 10 learning tasks", xpAwarded: 75, unlocked: true },
  { id: "a5", type: "badge", title: "Pomodoro Master", date: "", description: "Complete 5 pomodoros in one day", xpAwarded: 60, unlocked: false },
  { id: "a6", type: "medal", title: "Regional Math Olympiad - 3rd Place", date: "2025-11-15", description: "Placed 3rd in regional math competition", xpAwarded: 150, unlocked: true },
  { id: "a7", type: "diploma", title: "Web Dev Bootcamp Certificate", date: "2025-12-01", description: "Completed online web development bootcamp", xpAwarded: 200, unlocked: true },
  { id: "a8", type: "badge", title: "Consistency King", date: "", description: "Maintain a 14-day streak", xpAwarded: 150, unlocked: false },
]

export const seedSchedule: ScheduleItem[] = [
  { id: "s1", title: "Math Class", type: "school", startISO: `${today}T08:00`, endISO: `${today}T09:30`, color: "bg-chart-3" },
  { id: "s2", title: "Physics Class", type: "school", startISO: `${today}T10:00`, endISO: `${today}T11:30`, color: "bg-chart-3" },
  { id: "s3", title: "CS Study Session", type: "study", startISO: `${today}T14:00`, endISO: `${today}T16:00`, color: "bg-chart-1" },
  { id: "s4", title: "Football Practice", type: "sport", startISO: `${today}T17:00`, endISO: `${today}T18:30`, color: "bg-chart-4" },
  { id: "s5", title: "English Class", type: "school", startISO: `${d(1)}T08:00`, endISO: `${d(1)}T09:30`, color: "bg-chart-3" },
  { id: "s6", title: "Gym Session", type: "sport", startISO: `${d(1)}T16:00`, endISO: `${d(1)}T17:30`, color: "bg-chart-4" },
  { id: "s7", title: "Guitar Lesson", type: "hobby", startISO: `${d(2)}T18:00`, endISO: `${d(2)}T19:00`, color: "bg-chart-5" },
]

export const seedResources: Resource[] = [
  { id: "r1", category: "CS", title: "LeetCode", url: "https://leetcode.com", description: "Algorithm practice platform", tags: ["algorithms", "interviews"] },
  { id: "r2", category: "CS", title: "Next.js Documentation", url: "https://nextjs.org/docs", description: "Official Next.js docs", tags: ["react", "web-dev"] },
  { id: "r3", category: "CS", title: "freeCodeCamp", url: "https://freecodecamp.org", description: "Free coding curriculum", tags: ["web-dev", "free"] },
  { id: "r4", category: "Sport", title: "5K Training Guide", url: "https://example.com/5k", description: "10-week beginner to intermediate plan", tags: ["running", "fitness"] },
  { id: "r5", category: "School", title: "Khan Academy - Calculus", url: "https://khanacademy.org", description: "Free math courses", tags: ["math", "free"] },
  { id: "r6", category: "Tools", title: "Notion Templates", url: "https://notion.so", description: "Productivity templates", tags: ["productivity"] },
  { id: "r7", category: "CS", title: "The Odin Project", url: "https://theodinproject.com", description: "Full stack curriculum", tags: ["web-dev", "free"] },
]

export const seedJournal: JournalEntry[] = [
  { id: "j1", dateISO: today, type: "daily", mood: 4, highlights: "Crushed the binary tree problems. Feeling confident about CS path.", challenges: "Physics chapter was tough, need to rewatch the lecture.", nextSteps: "Finish portfolio design mockup tonight.", gratitude: "Grateful for the online CS community and free resources." },
  { id: "j2", dateISO: d(-1), type: "daily", mood: 3, highlights: "Good football training session. Beat my sprint time.", challenges: "Struggled with calculus homework.", nextSteps: "Ask teacher for help with integration by parts.", gratitude: "Family support for my goals." },
  { id: "j3", dateISO: d(-7), type: "weekly", mood: 4, highlights: "Completed 5 LeetCode problems. Started portfolio project. PB on 3K run.", challenges: "Time management between school and coding projects.", nextSteps: "Set up strict Pomodoro schedule. Start with hardest tasks first.", gratitude: "Getting closer to my goals every week." },
]
