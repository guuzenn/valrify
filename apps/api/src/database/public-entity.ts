import { sql, type SQLWrapper } from "drizzle-orm";
import { entities, identifiers, reportIdentifiers, reportParties, reports } from "./schema";

export const reportInvolvesEntity = (entityId: number | SQLWrapper) => sql`(${reports.entityId} = ${entityId} or exists (select 1 from ${reportParties} rp where rp.report_id = ${reports.id} and rp.entity_id = ${entityId}))`;
export const reportIdentifierForEntity = (entityId: number | SQLWrapper) => sql`coalesce(${reportIdentifiers.entityId}, ${reports.entityId}) = ${entityId}`;

export const publicEntityCondition = sql`(
  exists (select 1 from ${reports} where ${reportInvolvesEntity(entities.id)} and ${reports.status} = 'PUBLISHED')
)`;

// Keep internal identity links, but hide withdrawn identifiers unless another published report supports them.
export const publicIdentifierCondition = sql`(
  not exists (select 1 from ${reportIdentifiers} ri join ${reports} r on r.id = ri.report_id
    where ri.identifier_id = ${identifiers.id} and coalesce(ri.entity_id, r.entity_id) = ${entities.id} and r.status = 'WITHDRAWN')
  or exists (select 1 from ${reportIdentifiers} ri join ${reports} r on r.id = ri.report_id
    where ri.identifier_id = ${identifiers.id} and coalesce(ri.entity_id, r.entity_id) = ${entities.id} and r.status = 'PUBLISHED')
)`;
