> ARCHIVED 2026-06-23: Magic Kick is not a product. Kept for history only. See README.md.

# Product Requirements Document - Magic Kick

**Version:** 1.1  
**Date:** 2026-03-08  
**Status:** Active  
**Owner:** Solo founder

## Problem

People do not need another disconnected productivity tool. They need an execution framework that turns goals into bounded work, bounded work into weekly outcomes, and weekly outcomes into clear daily action with feedback.

## Target User

Magic Kick must remain configurable enough to support:
- professionals
- students
- athletes
- entrepreneurs
- children and teens

Common traits:
- managing multiple priorities at once
- vulnerable to cognitive overload
- benefits from visible progress and streak feedback
- needs offline-first access across devices

## Product Position

Magic Kick is a configurable Execution OS, not a hardcoded workflow.

## Core Loop

1. Goals define strategic direction.
2. Projects represent active work areas.
3. Weekly Outcomes define proof of progress.
4. Daily Focus limits what the user should execute today.
5. Execution updates tasks, milestones, and schedule.
6. Feedback updates XP, streak, achievements, and cognitive load.

## Current Included Modules

| Module | Role in Execution OS |
|---|---|
| Command Center | Daily execution surface |
| Goals | Strategic direction |
| ToDo | Backlog and task inventory |
| Projects | Active work areas |
| Achievements | Motivation layer |
| Schedule | Time allocation |
| Resources | Knowledge base |
| Journal | Reflection layer |
| XP / Levels | Progress feedback |

## Current Deferred Modules

These must stay architecturally compatible but are not implemented now:
- achievement complexity
- family supervision logic
- team collaboration
- AI coach
- advanced analytics
- drag-and-drop dashboard customization
- public accountability

## Execution OS Requirements

### System Rules
- Rules must be stored as user-configurable system configuration.
- Rules must influence dashboard behavior, project capacity, daily focus limits, weekly outcome limits, and XP behavior.
- The intended future editing surface is `Settings -> System Rules`.

### Project Capacity
- Projects must support `active`, `paused`, `parked`, and `completed`.
- `parked` projects do not count toward cognitive load.
- Exceeding active project capacity must trigger a warning and reduce focus health.

### Weekly Outcomes
- Each project should carry a `weeklyOutcome`.
- Weekly outcomes act as the bridge between project planning and daily execution.

### Daily Focus
- Command Center must show a limited daily focus list selected from backlog and project-linked work.
- Items beyond the configured limit remain in the backlog.

### Gamification Alignment
- XP should reward execution:
  - daily focus completion
  - weekly outcome completion
  - streak consistency
- XP should not reward passive setup behavior such as task creation or project creation.

## Acceptance Criteria

1. Existing modules continue to work without data loss.
2. Existing users migrate automatically with safe defaults.
3. Command Center emphasizes execution over inventory browsing.
4. Project status and weekly outcome fields are available without breaking existing project records.
5. Cognitive load is visible and understandable without requiring analytics infrastructure.
6. Architecture remains compatible with a future multi-user workspace layer.
