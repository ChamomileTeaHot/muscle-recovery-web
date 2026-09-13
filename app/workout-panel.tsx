'use client';
import './workout.css';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { localDate } from '@/lib/nutrition';
import { type Workout } from '@/lib/workouts';

export default function WorkoutPanel({selected}:{selected?:string}) {
 const [date,setDate]=useState(''),[exercise,setExercise]=useState(''),[reps,setReps]=useState(''),[stretched,setStretched]=useState(false);
 const [rows,setRows]=useState<Workout[]>([]),[status,setStatus]=useState('loading'),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
 const pendingId=useRef<string|null>(null);
 useEffect(()=>setDate(localDate()),[]);
 useEffect(()=>{pendingId.current=null;},[date,exercise,reps,stretched]);
 useEffect(()=>{
  if(!date)return;
  const controller=new AbortController();setStatus('loading');setError('');
  fetch(`/api/workouts?date=${date}`,{signal:controller.signal}).then(async r=>{const data:any=await r.json();if(!r.ok)throw Error(data.error);return data as Workout[];}).then(data=>{setRows(data);setStatus('ready');}).catch(e=>{if(e.name!=='AbortError'){setStatus('error');setError(e.message);}});
  return()=>controller.abort();
 },[date,retry]);
 async function mutate(method:string,body:unknown) {
  setBusy(true);setError('');setMessage('');
  try {const r=await fetch('/api/workouts',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data:any=await r.json();if(!r.ok)throw Error(data.error);return true;}
  catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요. 다시 시도해 주세요.');return false;}
  finally{setBusy(false);}
 }
 async function save(){
  if(busy||!date||!exercise.trim()||!Number.isInteger(Number(reps))||Number(reps)<=0||Number(reps)>100000)return;
  pendingId.current??=crypto.randomUUID();
  const row={id:pendingId.current,date,exercise:exercise.trim(),reps:Number(reps),stretched};
  if(await mutate('POST',row)){pendingId.current=null;setReps('');setStretched(false);setMessage('운동 기록을 저장했어요.');setRetry(n=>n+1);}
 }
 return <section id="workout-log" className="nutrition-section workout-section" aria-labelledby="workout-title">
  <div className="intro"><p className="eyebrow">나의 운동 일지</p><h2 id="workout-title">운동 기록</h2><p>운동한 날짜와 종목, 총 반복 횟수를 남겨보세요.</p></div>
  <label className="nutrition-date">운동 날짜<input type="date" required value={date} disabled={busy} onChange={e=>{setDate(e.target.value);setMessage('');}}/></label>
  <form className="food-detail workout-form" onSubmit={e=>{e.preventDefault();void save();}}>
   <fieldset disabled={busy}><div className="workout-fields"><label className="nutrition-field">운동 종목<input required maxLength={150} value={exercise} onChange={e=>setExercise(e.target.value)} placeholder="예: 스쿼트, 푸시업"/></label><label className="nutrition-field">총 횟수 (회)<input required type="number" min="1" max="100000" step="1" value={reps} onChange={e=>setReps(e.target.value)} placeholder="예: 30"/></label></div>
   {selected&&<Button type="button" variant="outline" onClick={()=>setExercise(selected)}>선택한 운동 사용: {selected}</Button>}
   <label className="workout-check"><Checkbox checked={stretched} onCheckedChange={value=>setStretched(value===true)}/>스트레칭을 했어요</label>
   <Button type="submit" className="action-button" disabled={!date||!exercise.trim()||!reps}>{busy?'저장 중…':'운동 기록 저장'}</Button></fieldset>
  </form>
  <p className="nutrition-note">운동 기록은 계정에 저장되어 새로고침해도 유지됩니다. 횟수는 모든 세트의 반복 횟수를 합해 입력하세요.</p>
  {error&&<p role="alert" className="nutrition-notice">{error}</p>}<p role="status" className="nutrition-message">{message}</p>
  <h3 className="nutrition-subtitle">{date||'선택한 날짜'}의 운동</h3>
  {!date?<p>날짜를 선택해 주세요.</p>:status==='loading'?<p role="status">운동 기록을 불러오는 중이에요.</p>:status==='error'?<Button variant="outline" onClick={()=>setRetry(n=>n+1)}>기록 다시 불러오기</Button>:!rows.length?<p>아직 기록한 운동이 없어요.</p>:<div className="meal-group">{rows.map(row=><div className="meal-row workout-row" key={row.id}><div><strong>{row.exercise}</strong><p>{row.date} · {row.reps}회</p></div><label className="workout-check"><Checkbox disabled={busy} checked={row.stretched} aria-label={`${row.exercise} 스트레칭 완료`} onCheckedChange={async value=>{const stretched=value===true;if(await mutate('PATCH',{id:row.id,stretched})){setRows(all=>all.map(w=>w.id===row.id?{...w,stretched}:w));setMessage('스트레칭 여부를 변경했어요.');}}}/>{row.stretched?'스트레칭 완료':'스트레칭 안 함'}</label><Button disabled={busy} variant="outline" aria-label={`${row.exercise} 운동 기록 삭제`} onClick={async()=>{if(await mutate('DELETE',{id:row.id})){setRows(all=>all.filter(w=>w.id!==row.id));setMessage('운동 기록을 삭제했어요.');}}}>삭제</Button></div>)}</div>}
 </section>;
}
