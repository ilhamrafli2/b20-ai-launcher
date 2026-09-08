import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function stripHtml(s:string){return s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim()}

export async function GET(){
  try{
    const urls=[
      'https://www.google.com/alerts/feeds/00000000000000000000/00000000000000000000',
      'https://cointelegraph.com/rss/tag/memecoin',
      'https://cryptoslate.com/feed/memecoins/',
    ];
    const results=await Promise.all(urls.slice(1).map(async url=>{
      const r=await fetch(url,{headers:{accept:'application/rss+xml, application/xml, text/xml'},next:{revalidate:300}});
      if(!r.ok) return '';
      return r.text();
    }));
    const news:{title:string;source:string}[]=[];
    const seen=new Set<string>();
    for(const [idx,xml] of results.entries()){
      const source=idx===0?'Cointelegraph':'CryptoSlate';
      for(const m of xml.matchAll(/<item[\s\S]*?<\/item>/gi)){
        const block=m[0];
        const tm=block.match(/<title>([\s\S]*?)<\/title>/i);
        if(!tm) continue;
        const title=stripHtml(tm[1]);
        const key=title.toLowerCase();
        if(title&& !seen.has(key)){seen.add(key);news.push({title,source});}
      }
    }
    return NextResponse.json({ok:true,count:news.length,news:news.slice(0,30)});
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:'News feed unavailable',news:[]},{status:502});
  }
}
