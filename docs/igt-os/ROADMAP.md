# ROADMAP model

Implemented: roadmap placement of ACCEPTED client change requests - `change_requests.roadmap_bucket` in (none, now, next, later), set
only by an explicit decision (non-material: ops or leadership; material: admin/super_admin after a completed impact analysis).
Accepted requests link to tasks (`linked_task_ids`), so assignees see the request next to their work.

Not yet implemented (see OPERATIONS_GAPS #3): a roadmap view, ON TRACK / AT RISK / BLOCKED / DONE states with visible reasons,
and progress derived from real milestones/tasks (never a typed percentage). Rule when built: status derives from linked tasks
(overdue -> AT RISK, blocked/open blocker -> BLOCKED, all done -> DONE) and always shows why.
