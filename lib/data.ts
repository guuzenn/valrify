import { env } from "cloudflare:workers";
import { maskIdentifier, normalizeIdentifier, searchVariants, type IdentifierType, type Role } from "./domain";

const schema = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'USER', email_verified_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS entities (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS identifiers (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, raw_value TEXT NOT NULL, normalized_value TEXT NOT NULL, masked_value TEXT NOT NULL, provider TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(type, normalized_value))`,
  `CREATE INDEX IF NOT EXISTS identifiers_normalized_idx ON identifiers(normalized_value)`,
  `CREATE TABLE IF NOT EXISTS entity_identifiers (entity_id INTEGER NOT NULL REFERENCES entities(id), identifier_id INTEGER NOT NULL REFERENCES identifiers(id), is_primary INTEGER NOT NULL DEFAULT 0, UNIQUE(entity_id, identifier_id))`,
  `CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, public_id TEXT NOT NULL UNIQUE, reporter_id TEXT NOT NULL REFERENCES users(id), entity_id INTEGER REFERENCES entities(id), title TEXT NOT NULL, chronology TEXT NOT NULL, public_summary TEXT NOT NULL DEFAULT '', transaction_date TEXT, transaction_value INTEGER NOT NULL DEFAULT 0, alleged_loss INTEGER NOT NULL DEFAULT 0, transaction_type TEXT NOT NULL DEFAULT 'ACCOUNT_PURCHASE', status TEXT NOT NULL DEFAULT 'SUBMITTED', published_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status)`,
  `CREATE TABLE IF NOT EXISTS report_identifiers (report_id INTEGER NOT NULL REFERENCES reports(id), identifier_id INTEGER NOT NULL REFERENCES identifiers(id), UNIQUE(report_id, identifier_id))`,
  `CREATE TABLE IF NOT EXISTS report_evidence (id INTEGER PRIMARY KEY AUTOINCREMENT, report_id INTEGER NOT NULL REFERENCES reports(id), storage_key TEXT NOT NULL, file_name TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER NOT NULL, evidence_type TEXT NOT NULL DEFAULT 'OTHER', caption TEXT NOT NULL DEFAULT '', is_public_approved INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS report_status_history (id INTEGER PRIMARY KEY AUTOINCREMENT, report_id INTEGER NOT NULL REFERENCES reports(id), from_status TEXT, to_status TEXT NOT NULL, actor_id TEXT NOT NULL REFERENCES users(id), note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS moderation_actions (id INTEGER PRIMARY KEY AUTOINCREMENT, report_id INTEGER REFERENCES reports(id), actor_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL, rationale TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS transaction_confirmations (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id), entity_id INTEGER NOT NULL REFERENCES entities(id), transaction_date TEXT, amount INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
];
let init: Promise<void> | null = null;
export function db() { if (!env.DB) throw new Error("D1 binding DB tidak tersedia."); return env.DB; }

export async function ensureDatabase() {
  init ??= (async () => {
    for (const statement of schema) await db().prepare(statement).run();
    await seedDemo();
  })();
  return init;
}

async function seedDemo() {
  const d = db();
  await d.prepare(`INSERT OR IGNORE INTO users (id,email,display_name,role,email_verified_at) VALUES ('demo-reporter','reporter.demo@vlrfy.invalid','Anggota Demo','USER',CURRENT_TIMESTAMP)`).run();
  await d.prepare(`INSERT OR IGNORE INTO entities (id,slug,display_name,description) VALUES (1,'arkanusa-demo','ArkaNusa Demo','Profil fiktif untuk demonstrasi data pengembangan VLRFY.')`).run();
  await d.prepare(`INSERT OR IGNORE INTO identifiers (id,type,raw_value,normalized_value,masked_value) VALUES (1,'PHONE','0800 0000 0901','6280000000901','0800••••0901')`).run();
  await d.prepare(`UPDATE identifiers SET normalized_value='6280000000901' WHERE id=1 AND raw_value='0800 0000 0901'`).run();
  await d.prepare(`INSERT OR IGNORE INTO identifiers (id,type,raw_value,normalized_value,masked_value) VALUES (2,'RIOT_ID','ArkaNusa#DEMO','arkanusa#demo','ArkaNusa#DEMO')`).run();
  await d.prepare(`INSERT OR IGNORE INTO entity_identifiers (entity_id,identifier_id,is_primary) VALUES (1,1,1),(1,2,0)`).run();
  await d.prepare(`INSERT OR IGNORE INTO reports (id,public_id,reporter_id,entity_id,title,chronology,public_summary,transaction_date,alleged_loss,status,published_at) VALUES (1,'VLR-DEMO-0001','demo-reporter',1,'Akun tidak diterima setelah pembayaran','Data kronologi fiktif untuk demo.','Pelapor menyatakan pembayaran telah dikirim, tetapi akses akun yang disepakati tidak diterima. Bukti transaksi dan percakapan telah ditinjau moderator.','2026-08-12',850000,'PUBLISHED','2026-08-14T09:00:00Z')`).run();
  await d.prepare(`INSERT OR IGNORE INTO report_identifiers (report_id,identifier_id) VALUES (1,1),(1,2)`).run();
}

export async function provisionUser(input:{id:string;email:string;displayName:string;bootstrapAdmin:boolean}) {
  const d=db();
  const desired=input.bootstrapAdmin?"ADMIN":"USER";
  await d.prepare(`INSERT OR IGNORE INTO users (id,email,display_name,role,email_verified_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP)`).bind(input.id,input.email,input.displayName,desired).run();
  if(input.bootstrapAdmin) await d.prepare(`UPDATE users SET role='ADMIN',display_name=? WHERE id=?`).bind(input.displayName,input.id).run();
  else await d.prepare(`UPDATE users SET display_name=? WHERE id=?`).bind(input.displayName,input.id).run();
  return (await d.prepare(`SELECT id,email,display_name as displayName,role FROM users WHERE id=?`).bind(input.id).first()) as {id:string;email:string;displayName:string;role:Role};
}

export async function searchPublic(query:string) {
  await ensureDatabase();
  const variants=searchVariants(query); if(!variants.length) return [];
  const marks=variants.map(()=>"?").join(",");
  const rows=await db().prepare(`SELECT DISTINCT i.id as identifierId,i.type,i.masked_value as maskedValue,e.id as entityId,e.slug,e.display_name as displayName,(SELECT COUNT(DISTINCT r.id) FROM reports r JOIN report_identifiers ri2 ON ri2.report_id=r.id JOIN entity_identifiers ei2 ON ei2.entity_id=e.id WHERE r.status='PUBLISHED' AND (r.entity_id=e.id OR ri2.identifier_id=ei2.identifier_id)) as reportCount FROM identifiers i LEFT JOIN entity_identifiers ei ON ei.identifier_id=i.id LEFT JOIN entities e ON e.id=ei.entity_id WHERE i.normalized_value IN (${marks}) OR (i.type IN ('PERSON_NAME','FACEBOOK_NAME','DISCORD','RIOT_ID','OTHER') AND lower(i.raw_value)=lower(?))`).bind(...variants,query.trim()).all();
  return rows.results as unknown as Array<{identifierId:number;type:string;maskedValue:string;entityId:number;slug:string;displayName:string;reportCount:number}>;
}

export async function getEntity(slug:string) {
  await ensureDatabase(); const d=db();
  const entity=await d.prepare(`SELECT id,slug,display_name as displayName,description,created_at as createdAt FROM entities WHERE slug=?`).bind(slug).first(); if(!entity)return null;
  const identifiers=await d.prepare(`SELECT i.type,i.masked_value as maskedValue FROM identifiers i JOIN entity_identifiers ei ON ei.identifier_id=i.id WHERE ei.entity_id=? ORDER BY ei.is_primary DESC,i.id`).bind(entity.id).all();
  const reports=await d.prepare(`SELECT id,public_id as publicId,title,public_summary as publicSummary,alleged_loss as allegedLoss,published_at as publishedAt FROM reports WHERE entity_id=? AND status='PUBLISHED' ORDER BY published_at DESC`).bind(entity.id).all();
  return {...entity,identifiers:identifiers.results,reports:reports.results,reportCount:reports.results.length};
}

export async function getPublicCase(publicId:string) {
  await ensureDatabase(); const d=db();
  const report=await d.prepare(`SELECT r.id,r.public_id as publicId,r.title,r.public_summary as publicSummary,r.transaction_date as transactionDate,r.alleged_loss as allegedLoss,r.transaction_type as transactionType,r.published_at as publishedAt,e.slug,e.display_name as entityName FROM reports r LEFT JOIN entities e ON e.id=r.entity_id WHERE r.public_id=? AND r.status='PUBLISHED'`).bind(publicId).first(); if(!report)return null;
  const identifiers=await d.prepare(`SELECT i.type,i.masked_value as maskedValue FROM identifiers i JOIN report_identifiers ri ON ri.identifier_id=i.id WHERE ri.report_id=?`).bind(report.id).all();
  return {...report,identifiers:identifiers.results};
}

export async function listReviewQueue() {
  await ensureDatabase();
  const rows=await db().prepare(`SELECT r.id,r.public_id as publicId,r.title,r.chronology,r.transaction_date as transactionDate,r.alleged_loss as allegedLoss,r.status,r.created_at as createdAt,e.display_name as entityName,u.display_name as reporterName FROM reports r JOIN users u ON u.id=r.reporter_id LEFT JOIN entities e ON e.id=r.entity_id WHERE r.status NOT IN ('PUBLISHED','WITHDRAWN') ORDER BY r.created_at ASC`).all();
  for(const row of rows.results as Array<Record<string,unknown>>) {
    const ids=await db().prepare(`SELECT i.type,i.masked_value as maskedValue FROM identifiers i JOIN report_identifiers ri ON ri.identifier_id=i.id WHERE ri.report_id=?`).bind(row.id).all();
    const evidence=await db().prepare(`SELECT id,file_name as fileName,mime_type as mimeType,size,evidence_type as evidenceType FROM report_evidence WHERE report_id=?`).bind(row.id).all();
    row.identifiers=ids.results; row.evidence=evidence.results;
  }
  return rows.results;
}

export async function createReport(input:{reporterId:string;entityName:string;title:string;chronology:string;transactionDate:string;allegedLoss:number;transactionType:string;identifiers:Array<{type:IdentifierType;value:string;provider?:string}>;files:File[]}) {
  await ensureDatabase(); const d=db(); const slug=`${input.entityName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"profil"}-${crypto.randomUUID().slice(0,6)}`;
  const entityResult=await d.prepare(`INSERT INTO entities (slug,display_name) VALUES (?,?)`).bind(slug,input.entityName).run(); const entityId=Number(entityResult.meta.last_row_id);
  const publicId=`VLR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random()*900+100)}`;
  const reportResult=await d.prepare(`INSERT INTO reports (public_id,reporter_id,entity_id,title,chronology,transaction_date,alleged_loss,transaction_type,status) VALUES (?,?,?,?,?,?,?,?,'SUBMITTED')`).bind(publicId,input.reporterId,entityId,input.title,input.chronology,input.transactionDate||null,input.allegedLoss,input.transactionType).run(); const reportId=Number(reportResult.meta.last_row_id);
  for(const item of input.identifiers){ const normalized=normalizeIdentifier(item.type,item.value); const masked=maskIdentifier(item.type,item.value,item.provider); await d.prepare(`INSERT OR IGNORE INTO identifiers (type,raw_value,normalized_value,masked_value,provider) VALUES (?,?,?,?,?)`).bind(item.type,item.value,normalized,masked,item.provider||null).run(); const found=await d.prepare(`SELECT id FROM identifiers WHERE type=? AND normalized_value=?`).bind(item.type,normalized).first<{id:number}>(); if(found){await d.prepare(`INSERT OR IGNORE INTO entity_identifiers (entity_id,identifier_id) VALUES (?,?)`).bind(entityId,found.id).run();await d.prepare(`INSERT OR IGNORE INTO report_identifiers (report_id,identifier_id) VALUES (?,?)`).bind(reportId,found.id).run();}}
  for(const file of input.files){ const key=`reports/${reportId}/${crypto.randomUUID()}`; await env.EVIDENCE.put(key,file.stream(),{httpMetadata:{contentType:file.type},customMetadata:{originalName:file.name}}); await d.prepare(`INSERT INTO report_evidence (report_id,storage_key,file_name,mime_type,size) VALUES (?,?,?,?,?)`).bind(reportId,key,file.name,file.type,file.size).run(); }
  await d.prepare(`INSERT INTO report_status_history (report_id,to_status,actor_id,note) VALUES (?,'SUBMITTED',?,'Laporan dikirim')`).bind(reportId,input.reporterId).run();
  return {id:reportId,publicId};
}

export async function moderateReport(input:{reportId:number;actorId:string;decision:"PUBLISH"|"REJECT";summary:string;rationale:string}) {
  await ensureDatabase(); const d=db(); const report=await d.prepare(`SELECT status FROM reports WHERE id=?`).bind(input.reportId).first<{status:string}>(); if(!report)throw new Error("Laporan tidak ditemukan"); if(!["SUBMITTED","UNDER_REVIEW","VERIFIED"].includes(report.status))throw new Error("Status laporan tidak dapat diubah"); const next=input.decision==="PUBLISH"?"PUBLISHED":"REJECTED";
  await d.prepare(`UPDATE reports SET status=?,public_summary=?,published_at=CASE WHEN ?='PUBLISHED' THEN CURRENT_TIMESTAMP ELSE published_at END,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(next,input.summary,next,input.reportId).run();
  await d.batch([d.prepare(`INSERT INTO report_status_history (report_id,from_status,to_status,actor_id,note) VALUES (?,?,?,?,?)`).bind(input.reportId,report.status,next,input.actorId,input.rationale),d.prepare(`INSERT INTO moderation_actions (report_id,actor_id,action,rationale) VALUES (?,?,?,?)`).bind(input.reportId,input.actorId,next==="PUBLISHED"?"REPORT_PUBLISHED":"REPORT_REJECTED",input.rationale)]);
}

export async function getEvidence(id:number){await ensureDatabase(); const meta=await db().prepare(`SELECT storage_key as storageKey,file_name as fileName,mime_type as mimeType FROM report_evidence WHERE id=?`).bind(id).first<{storageKey:string;fileName:string;mimeType:string}>(); if(!meta)return null; const object=await env.EVIDENCE.get(meta.storageKey); return object?{meta,object}:null;}
