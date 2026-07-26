import { Pool } from 'pg';

interface AuditParams {
  actorId: string | null;
  actorName: string;
  action: string;
  entity: string;
  entityRef: string;
  entityId?: string | null;
  clientName?: string | null;
  meta?: any;
}

// Fire-and-forget audit trail write, shared by every route that wants its actions to show
// up on the System Audit Logs dashboard — callers don't await this, matching the existing
// non-blocking convention already used for Google Chat / Discord alerts elsewhere.
export function logAudit(pool: Pool, params: AuditParams): void {
  pool.query(
    `INSERT INTO public.audit_log (actor_id, actor_name, action, entity, entity_ref, entity_id, client_name, meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      params.actorId,
      params.actorName,
      params.action,
      params.entity,
      params.entityRef,
      params.entityId || null,
      params.clientName || null,
      params.meta ? JSON.stringify(params.meta) : null,
    ]
  ).catch(err => console.error(`Failed to write audit log (${params.entity}/${params.action}):`, err));
}
