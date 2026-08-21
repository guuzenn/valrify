export const identifierTypes = ["PHONE","BANK_ACCOUNT","EWALLET","DISCORD","FACEBOOK_NAME","FACEBOOK_URL","RIOT_ID","PERSON_NAME","OTHER"] as const;
export type IdentifierType = (typeof identifierTypes)[number];
export const roles = ["USER","VERIFIED_MIDDLEMAN","MODERATOR","ADMIN"] as const;
export type Role = (typeof roles)[number];
export const reportStatuses = ["SUBMITTED","UNDER_REVIEW","NEEDS_INFO","VERIFIED","REJECTED","WITHDRAWN","PUBLISHED"] as const;
export type ReportStatus = (typeof reportStatuses)[number];

export function normalizeIdentifier(type: IdentifierType, value: string): string {
  const trimmed=value.trim();
  if(type==="PHONE"){const digits=trimmed.replace(/\D/g,"");return digits.startsWith("0")?`62${digits.slice(1)}`:digits;}
  if(type==="BANK_ACCOUNT"||type==="EWALLET")return trimmed.replace(/[\s-]/g,"").toLowerCase();
  if(type==="FACEBOOK_URL"){try{const url=new URL(/^https?:\/\//i.test(trimmed)?trimmed:`https://${trimmed}`);return `${url.hostname.toLowerCase().replace(/^www\./,"")}${url.pathname.replace(/\/$/,"").toLowerCase()}`;}catch{return trimmed.toLowerCase().replace(/^https?:\/\/(www\.)?/,"").replace(/\/$/,"");}}
  return trimmed.toLocaleLowerCase("id-ID").replace(/\s+/g," ");
}
export function searchVariants(value:string){return [...new Set(identifierTypes.map((type)=>normalizeIdentifier(type,value)).filter(Boolean))];}
export function maskIdentifier(type:IdentifierType,value:string,provider?:string|null){const normalized=normalizeIdentifier(type,value);if(type==="PHONE"||type==="EWALLET"){const local=normalized.startsWith("62")?`0${normalized.slice(2)}`:normalized;return local.length>8?`${local.slice(0,4)}••••${local.slice(-4)}`:"••••••••";}if(type==="BANK_ACCOUNT"){const masked=normalized.length>8?`${normalized.slice(0,4)}••••${normalized.slice(-4)}`:"••••••••";return provider?`${provider.toUpperCase()} · ${masked}`:masked;}return value.trim();}
export function getRisk(publishedReports:number){if(publishedReports>=2)return{level:"HIGH" as const,label:"RISIKO TINGGI",explanation:`Ditemukan ${publishedReports} laporan terverifikasi yang telah dipublikasikan.`};if(publishedReports===1)return{level:"CAUTION" as const,label:"PERLU PERHATIAN",explanation:"Ditemukan 1 laporan terverifikasi yang telah dipublikasikan."};return{level:"NONE" as const,label:"TIDAK ADA LAPORAN",explanation:"Tidak ditemukan laporan terverifikasi. Ini bukan jaminan bahwa transaksi bebas risiko."};}
const transitions:Record<ReportStatus,ReportStatus[]>={SUBMITTED:["UNDER_REVIEW","REJECTED","WITHDRAWN"],UNDER_REVIEW:["NEEDS_INFO","VERIFIED","REJECTED"],NEEDS_INFO:["UNDER_REVIEW","REJECTED","WITHDRAWN"],VERIFIED:["PUBLISHED","REJECTED"],REJECTED:[],WITHDRAWN:[],PUBLISHED:[]};
export const canTransition=(from:ReportStatus,to:ReportStatus)=>transitions[from].includes(to);
export const canModerate=(role:Role)=>role==="MODERATOR"||role==="ADMIN";
export const canManageRoles=(role:Role)=>role==="ADMIN";
export const formatRupiah=(value:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);
export const labelIdentifierType=(type:string)=>({PHONE:"WhatsApp",BANK_ACCOUNT:"Rekening",EWALLET:"E-wallet",DISCORD:"Discord",FACEBOOK_NAME:"Nama Facebook",FACEBOOK_URL:"Profil Facebook",RIOT_ID:"Riot ID",PERSON_NAME:"Nama",OTHER:"Username lain"} as Record<string,string>)[type]??type;
