import assert from 'node:assert/strict';
const base='http://localhost:3000/api/workouts';
const signIn=await fetch('http://localhost:3000/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=signIn.headers.get('set-cookie').split(';')[0];
const row={id:crypto.randomUUID(),date:'2026-09-12',exercise:'저장 확인용 운동',reps:30,stretched:false};
async function call(method,path='',body,user='qa-workout-user'){
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:user==='qa-workout-user'?cookie:''},body:body?JSON.stringify(body):undefined});
 return {status:r.status,data:await r.json()};
}
try{
 assert.equal((await call('POST','',row)).status,200);
 assert.equal((await call('POST','',row)).status,200);
 let list=await call('GET',`?date=${row.date}`);
 assert.equal(list.status,200);assert.equal(list.data.filter(w=>w.id===row.id).length,1);
 assert.equal((await call('GET',`?date=${row.date}`,null,'anonymous')).status,401);
 assert.equal((await call('GET','?date=2026-09-13')).data.some(w=>w.id===row.id),false);
 assert.equal((await call('POST','',{...row,reps:-1})).status,400);
 assert.equal((await call('PATCH','',{id:row.id,stretched:true})).status,200);
 assert.equal((await call('GET',`?date=${row.date}`)).data.find(w=>w.id===row.id).stretched,true);
 console.log('PASS: save, reload, duplicate retry, date filter, anonymous rejection, validation, stretching update');
}finally{assert.equal((await call('DELETE','',{id:row.id})).status,200);}
assert.equal((await call('GET',`?date=${row.date}`)).data.some(w=>w.id===row.id),false);
console.log('PASS: deletion');
