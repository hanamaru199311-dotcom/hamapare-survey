const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
const encoder=new TextEncoder();
function constantTimeEqual(a,b){const x=encoder.encode(a),y=encoder.encode(b);let diff=x.length^y.length;const n=Math.max(x.length,y.length);for(let i=0;i<n;i++)diff|=(x[i]||0)^(y[i]||0);return diff===0}
export async function onRequestGet({request,env}){
 const expected=env.ADMIN_KEY;
 const supplied=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
 if(!expected||expected.length<32||!supplied||!constantTimeEqual(supplied,expected))return respond({error:'Forbidden'},403);
 if(!env.DB)return respond({error:'Database unavailable'},503);
 try{
  const data=await env.DB.prepare('SELECT id, name, age, submitted_at, answers_json FROM responses ORDER BY id DESC LIMIT 5000').all();
  return respond({ok:true,responses:data.results.map(r=>({id:r.id,name:r.name,age:r.age,submitted_at:r.submitted_at,answers:JSON.parse(r.answers_json)}))});
 }catch{return respond({error:'Database error'},503)}
}
export const onRequestPost=()=>respond({error:'Method not allowed'},405);
