# ROLE MATRIX (server-enforced, verified by `backend/tests/api.test.mjs` unless noted)

Roles: `super_admin` > `admin` > `ops` > `team` / `viewer`. (`super_admin` satisfies any `admin` gate.)

| Capability | super_admin | admin | ops | team |
|---|---|---|---|---|
| Grant/modify `super_admin` | yes | **no** | no | no |
| Create/update users, reset others' passwords, app secrets | yes | yes | no | no |
| Clients: commercial columns | yes | yes | yes | no (id, name, code, color) |
| Client invoices | yes | yes | yes | **no (403)** |
| Tasks: list | all | all | all | assigned or created |
| Tasks: update / timer / assets | any | any | any | assigned or created only |
| Task delete | yes | yes | yes | no |
| Audit log | yes | yes | yes | no |
| Meetings (transcripts) | all | all | all | own only |
| Command-center attention queue | yes | yes | yes | no (403) |
| AI routes (via ticket) | any authenticated active user, 30 req/min | | | |
| Integration pages (/social, /github) | admin/ops default; others via page_access grants | | | |

UNVERIFIED: `viewer` behaviour, page_access grants, leave-request approval, HR/finance (no server model yet).
