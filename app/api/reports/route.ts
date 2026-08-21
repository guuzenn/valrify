import { getActor } from "../../../lib/auth";
import { createReport } from "../../../lib/data";
import { identifierTypes, type IdentifierType } from "../../../lib/domain";

const allowedMimes=new Set(["image/png","image/jpeg","image/webp","application/pdf"]);
export async function POST(request:Request){
  const actor=await getActor();if(!actor)return Response.json({error:"Silakan masuk sebelum mengirim laporan."},{status:401});
  try{
    const form=await request.formData();const entityName=String(form.get('entityName')||'').trim();const title=String(form.get('title')||'').trim();const chronology=String(form.get('chronology')||'').trim();const identifierType=String(form.get('identifierType')||'') as IdentifierType;const identifierValue=String(form.get('identifierValue')||'').trim();const transactionDate=String(form.get('transactionDate')||'');const allegedLoss=Number(form.get('allegedLoss')||0);const transactionType=String(form.get('transactionType')||'ACCOUNT_PURCHASE');const provider=String(form.get('provider')||'').trim();const files=form.getAll('evidence').filter((value):value is File=>value instanceof File&&value.size>0);
    if(entityName.length<2||entityName.length>80)return Response.json({error:"Nama profil tidak valid."},{status:400});
    if(title.length<8||title.length>120)return Response.json({error:"Judul harus 8–120 karakter."},{status:400});
    if(chronology.length<80||chronology.length>5000)return Response.json({error:"Kronologi harus 80–5.000 karakter."},{status:400});
    if(!identifierTypes.includes(identifierType)||!identifierValue)return Response.json({error:"Identifier wajib diisi."},{status:400});
    if(!Number.isFinite(allegedLoss)||allegedLoss<0||allegedLoss>1_000_000_000)return Response.json({error:"Nilai kerugian tidak valid."},{status:400});
    if(files.length<1||files.length>5)return Response.json({error:"Unggah 1–5 file bukti."},{status:400});
    if(files.some((file)=>file.size>5*1024*1024||!allowedMimes.has(file.type)))return Response.json({error:"File harus PNG, JPG, WEBP, atau PDF dan maksimal 5 MB."},{status:400});
    const report=await createReport({reporterId:actor.id,entityName,title,chronology,transactionDate,allegedLoss:Math.round(allegedLoss),transactionType,identifiers:[{type:identifierType,value:identifierValue,provider}],files});
    return Response.json(report,{status:201});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Laporan gagal disimpan."},{status:500})}
}
