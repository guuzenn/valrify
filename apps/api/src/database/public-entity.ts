import { sql } from "drizzle-orm";
import { entities, identifiers, reportIdentifiers, reports, transactionConfirmations } from "./schema";

export const publicEntityCondition = sql`(
  exists (select 1 from ${reports} where ${reports.entityId} = ${entities.id} and ${reports.status} = 'PUBLISHED')
  or exists (select 1 from ${transactionConfirmations} where ${transactionConfirmations.entityId} = ${entities.id} and ${transactionConfirmations.status} = 'APPROVED')
)`;

// Keep internal identity links, but hide withdrawn identifiers unless another published report supports them.
export const publicIdentifierCondition = sql`(
  not exists (select 1 from ${reportIdentifiers} ri join ${reports} r on r.id = ri.report_id
    where ri.identifier_id = ${identifiers.id} and r.entity_id = ${entities.id} and r.status = 'WITHDRAWN')
  or exists (select 1 from ${reportIdentifiers} ri join ${reports} r on r.id = ri.report_id
    where ri.identifier_id = ${identifiers.id} and r.entity_id = ${entities.id} and r.status = 'PUBLISHED')
)`;
