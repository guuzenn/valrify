import { sql } from "drizzle-orm";
import { entities, reports, transactionConfirmations } from "./schema";

export const publicEntityCondition = sql`(
  exists (select 1 from ${reports} where ${reports.entityId} = ${entities.id} and ${reports.status} = 'PUBLISHED')
  or exists (select 1 from ${transactionConfirmations} where ${transactionConfirmations.entityId} = ${entities.id} and ${transactionConfirmations.status} = 'APPROVED')
)`;
