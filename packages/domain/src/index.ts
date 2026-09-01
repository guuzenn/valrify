export const identifierTypes = ["PHONE","BANK_ACCOUNT","BANK_ACCOUNT_NAME","EWALLET","EWALLET_ACCOUNT_NAME","DISCORD","FACEBOOK_NAME","FACEBOOK_URL","RIOT_ID","RIOT_NICKNAME","PERSON_NAME","OTHER"] as const;
export type IdentifierType = (typeof identifierTypes)[number];
export const roles = ["USER","VERIFIED_MIDDLEMAN","MODERATOR","ADMIN"] as const;
export type Role = (typeof roles)[number];
export const reportStatuses = ["SUBMITTED","UNDER_REVIEW","NEEDS_INFO","VERIFIED","REJECTED","WITHDRAWN","PUBLISHED"] as const;
export type ReportStatus = (typeof reportStatuses)[number];
export const reportCategories = ["PAYMENT_FRAUD","FAKE_MIDDLEMAN","HACKBACK","ACCOUNT_MISMATCH","OTHER"] as const;
export type ReportCategory = (typeof reportCategories)[number];
export const labelReportCategory=(category:string)=>({PAYMENT_FRAUD:"Penipuan pembayaran",FAKE_MIDDLEMAN:"Rekber palsu",HACKBACK:"Hackback",ACCOUNT_MISMATCH:"Data akun tidak sesuai",OTHER:"Masalah lainnya",ACCOUNT_PURCHASE:"Transaksi pembelian akun",ACCOUNT_SALE:"Transaksi penjualan akun",ACCOUNT_TRADE:"Transaksi tukar akun",MIDDLEMAN:"Transaksi melalui rekber"} as Record<string,string>)[category]??"Kategori tidak diketahui";
export const titleReportCategory=(category:ReportCategory)=>({PAYMENT_FRAUD:"Pembayaran dilakukan, transaksi tidak diselesaikan",FAKE_MIDDLEMAN:"Dugaan penyamaran sebagai rekber",HACKBACK:"Akun diambil kembali setelah transaksi",ACCOUNT_MISMATCH:"Data akun tidak sesuai kesepakatan",OTHER:"Masalah dalam transaksi akun"} as Record<ReportCategory,string>)[category];

export function normalizeIdentifier(type: IdentifierType, value: string): string {
  const trimmed=value.trim();
  if(type==="PHONE"){const digits=trimmed.replace(/\D/g,"");return digits.startsWith("0")?`62${digits.slice(1)}`:digits;}
  if(type==="BANK_ACCOUNT"||type==="EWALLET")return trimmed.replace(/[\s-]/g,"").toLowerCase();
  if(type==="FACEBOOK_URL"){try{const url=new URL(/^https?:\/\//i.test(trimmed)?trimmed:`https://${trimmed}`);return `${url.hostname.toLowerCase().replace(/^www\./,"")}${url.pathname.replace(/\/$/,"").toLowerCase()}`;}catch{return trimmed.toLowerCase().replace(/^https?:\/\/(www\.)?/,"").replace(/\/$/,"");}}
  return trimmed.toLocaleLowerCase("id-ID").replace(/\s+/g," ");
}
export function searchVariants(value:string){return [...new Set(identifierTypes.map((type)=>normalizeIdentifier(type,value)).filter(Boolean))];}
export function maskIdentifier(type:IdentifierType,value:string,provider?:string|null){const normalized=normalizeIdentifier(type,value);if(type==="PHONE"||type==="EWALLET"){const local=normalized.startsWith("62")?`0${normalized.slice(2)}`:normalized;return local.length>8?`${local.slice(0,4)}••••${local.slice(-4)}`:"••••••••";}if(type==="BANK_ACCOUNT"){const masked=normalized.length>8?`${normalized.slice(0,4)}••••${normalized.slice(-4)}`:"••••••••";return provider?`${provider.toUpperCase()} · ${masked}`:masked;}return value.trim();}
export function publicIdentifierValue(type:IdentifierType,value:string,provider:string|null|undefined,status:ReportStatus|null,directlyAttached:boolean){if(status==="PUBLISHED"&&directlyAttached){const visible=value.trim();return type==="BANK_ACCOUNT"&&provider?`${provider.toUpperCase()} · ${visible}`:visible;}return maskIdentifier(type,value,provider);}
export function getRisk(publishedReports:number){if(publishedReports>=2)return{level:"HIGH" as const,label:"RISIKO TINGGI",explanation:`Ada ${publishedReports} laporan yang sudah dicek admin.`};if(publishedReports===1)return{level:"CAUTION" as const,label:"PERLU PERHATIAN",explanation:"Ada 1 laporan yang sudah dicek admin."};return{level:"NONE" as const,label:"TIDAK ADA LAPORAN",explanation:"Belum ada laporan yang lolos pengecekan. Bukan berarti pasti aman."};}
const transitions:Record<ReportStatus,ReportStatus[]>={SUBMITTED:["UNDER_REVIEW","REJECTED","WITHDRAWN"],UNDER_REVIEW:["NEEDS_INFO","VERIFIED","REJECTED"],NEEDS_INFO:["UNDER_REVIEW","REJECTED","WITHDRAWN"],VERIFIED:["PUBLISHED","REJECTED"],REJECTED:[],WITHDRAWN:[],PUBLISHED:[]};
export const canTransition=(from:ReportStatus,to:ReportStatus)=>transitions[from].includes(to);
export const canModerate=(role:Role)=>role==="MODERATOR"||role==="ADMIN";
export const canManageRoles=(role:Role)=>role==="ADMIN";
export function publicUploaderAttribution(displayName:string,role:Role){if(role==="ADMIN")return{displayName,role,roleLabel:"Admin",isTrustedRole:true};if(role==="MODERATOR")return{displayName,role,roleLabel:"Moderator",isTrustedRole:true};if(role==="VERIFIED_MIDDLEMAN")return{displayName,role,roleLabel:"Verified Middleman",isTrustedRole:true};return{displayName:"Anggota komunitas",role:"USER" as const,roleLabel:"Community",isTrustedRole:false};}
export const formatRupiah=(value:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);
export const formatIndonesianDate=(value:string|Date|null|undefined)=>{if(!value)return"Tidak dicantumkan";const date=value instanceof Date?value:new Date(value);if(Number.isNaN(date.getTime()))return"Tidak dicantumkan";return new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(date);};
export const labelIdentifierType=(type:string)=>({PHONE:"WhatsApp",BANK_ACCOUNT:"Rekening",BANK_ACCOUNT_NAME:"Nama pemilik rekening",EWALLET:"E-wallet",EWALLET_ACCOUNT_NAME:"Nama pemilik e-wallet",DISCORD:"Discord",FACEBOOK_NAME:"Nama Facebook",FACEBOOK_URL:"Profil Facebook",RIOT_ID:"Username Riot",RIOT_NICKNAME:"Nickname / Riot ID",PERSON_NAME:"Alias / nama asli",OTHER:"Username lain"} as Record<string,string>)[type]??type;
