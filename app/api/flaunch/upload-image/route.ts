import { NextResponse } from 'next/server';

export const runtime='nodejs';
const FLAUNCH_UPLOAD='https://mcp.flaunch.gg/v1/upload-image';

export async function POST(request:Request){
  try{
    const {imageUrl}=await request.json() as {imageUrl?:string};
    if(!imageUrl) return NextResponse.json({error:'imageUrl is required.'},{status:400});
    const image=await fetch(new URL(imageUrl,request.url));
    if(!image.ok) throw new Error(`Image fetch failed (${image.status}).`);
    const contentType=image.headers.get('content-type')||'image/png';
    const bytes=new Uint8Array(await image.arrayBuffer());
    const base64=Buffer.from(bytes).toString('base64');
    const upstream=await fetch(FLAUNCH_UPLOAD,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({base64Image:`data:${contentType};base64,${base64}`}),cache:'no-store'});
    const text=await upstream.text();
    return new Response(text,{status:upstream.status,headers:{'content-type':upstream.headers.get('content-type')||'application/json'}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500})}
}
