const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function onRequestPost({request,env}) {
  if (!env.DB) return json({error:'Database unavailable'},503);
  const ct=request.headers.get('content-type')||'';
  if (!ct.includes('application/json')) return json({error:'JSON required'},415);
  if (Number(request.headers.get('content-length')||0)>30000) return json({error:'Too large'},413);
  let body; try {body=await request.json()}catch{return json({error:'Invalid JSON'},400)}
  const name=String(body?.name||'').trim(),age=Number(body?.age),answers=body?.answers;
  if (!name||name.length>100||!Number.isInteger(age)||age<23||age>40||!answers||typeof answers!=='object'||Array.isArray(answers))return json({error:'Invalid input'},400);
  if (answers.name!==name||Number(answers.age)!==age||!answers.selfType||!answers.jcti)return json({error:'Incomplete input'},400);
  const serialized=JSON.stringify(answers);
  if (serialized.length>20000)return json({error:'Too large'},413);
  try {await env.DB.prepare('INSERT INTO responses (name,age,answers_json) VALUES (?,?,?)').bind(name,age,serialized).run();return json({ok:true},201)}catch{return json({error:'Save failed'},503)}
}
export function onRequestGet(){return json({error:'Method not allowed'},405)}
