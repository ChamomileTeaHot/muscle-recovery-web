import { getDB } from '@/lib/db';
import { validDate, validWorkout } from '@/lib/workouts';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function handle(request:Request) {
 const user=request.headers.get('oai-authenticated-user-id');
 if(!user)return json({error:'로그인 후 운동 기록을 사용할 수 있어요.'},401);
 const url=new URL(request.url);
 if(request.method!=='GET'&&(request.headers.get('sec-fetch-site')==='cross-site'||(request.headers.get('origin')&&request.headers.get('origin')!==url.origin)))return json({error:'요청을 확인해 주세요.'},403);
 try {
  const db=getDB();
  if(request.method==='GET') {
   const date=url.searchParams.get('date');
   if(!validDate(date))return json({error:'날짜를 확인해 주세요.'},400);
   const {results}=await db.prepare('SELECT id,date,exercise,reps,stretched FROM workouts WHERE user_id=? AND date=? ORDER BY created_at DESC,id').bind(user,date).all();
   return json(results.map(w=>({...w,stretched:!!w.stretched})));
  }
  let body:any;
  try{body=await request.json();}catch{return json({error:'입력 내용을 확인해 주세요.'},400);}
  if(request.method==='POST') {
   if(!validWorkout(body))return json({error:'날짜, 운동 종목, 횟수를 확인해 주세요.'},400);
   await db.prepare('INSERT INTO workouts (id,user_id,date,exercise,reps,stretched,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(body.id,user,body.date,body.exercise.trim(),body.reps,Number(body.stretched),new Date().toISOString()).run();
   return json({ok:true});
  }
  if(!body||typeof body.id!=='string')return json({error:'기록을 확인해 주세요.'},400);
  if(request.method==='PATCH') {
   if(typeof body.stretched!=='boolean')return json({error:'스트레칭 여부를 확인해 주세요.'},400);
   await db.prepare('UPDATE workouts SET stretched=? WHERE id=? AND user_id=?').bind(Number(body.stretched),body.id,user).run();
  }else await db.prepare('DELETE FROM workouts WHERE id=? AND user_id=?').bind(body.id,user).run();
  return json({ok:true});
 }catch(error){console.error('Workout storage failed',error);return json({error:'기록을 불러오거나 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'},503);}
}
export const GET=handle, POST=handle, PATCH=handle, DELETE=handle;
