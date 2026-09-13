'use client';
import './workout.css';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { localDate } from '@/lib/nutrition';
import { type Workout } from '@/lib/workouts';

export type WorkoutDraft={id:string;exerciseId:string;exercise:string;reps:string;stretched:boolean};
export default function WorkoutPanel({drafts,setDrafts,onFind,view,onEntry,onSaved,revision}:{drafts:WorkoutDraft[];setDrafts:Dispatch<SetStateAction<WorkoutDraft[]>>;onFind:()=>void;view:'entry'|'history';onEntry:()=>void;onSaved:(draft:WorkoutDraft)=>void;revision:number}) {
 const [date,setDate]=useState('');
 const [rows,setRows]=useState<Workout[]>([]),[status,setStatus]=useState('loading'),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>setDate(localDate()),[]);
 useEffect(()=>{
  if(!date)return;
  const controller=new AbortController();setStatus('loading');setError('');
  fetch(`/api/workouts?date=${date}`,{signal:controller.signal}).then(async r=>{const data:any=await r.json();if(!r.ok)throw Error(data.error);return data as Workout[];}).then(data=>{setRows(data);setStatus('ready');}).catch(e=>{if(e.name!=='AbortError'){setStatus('error');setError(e.message);}});
  return()=>controller.abort();
 },[date,retry,revision]);
 async function mutate(method:string,body:unknown) {
  setBusy(true);setError('');setMessage('');
  try {const r=await fetch('/api/workouts',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data:any=await r.json();if(!r.ok)throw Error(data.error);return true;}
  catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요. 다시 시도해 주세요.');return false;}
  finally{setBusy(false);}
 }
 async function save(draft:WorkoutDraft){
  if(busy||!date||!Number.isInteger(Number(draft.reps))||Number(draft.reps)<=0||Number(draft.reps)>100000)return;
  const row={id:draft.id,date,exercise:draft.exercise,reps:Number(draft.reps),stretched:draft.stretched};
  if(await mutate('POST',row)){setDrafts(all=>all.filter(d=>d.id!==draft.id));setMessage(`${draft.exercise} 기록을 저장했어요.`);setRetry(n=>n+1);onSaved(draft);}
 }
 function update(id:string,patch:Partial<WorkoutDraft>){setDrafts(all=>all.map(d=>d.id===id?{...d,...patch}:d));}
 return <section id="workout-log" className="nutrition-section workout-section" aria-labelledby="workout-title">
  <div className="intro"><p className="eyebrow">나의 운동 일지</p><h2 id="workout-title" tabIndex={-1}>{view==='entry'?'얼마나 운동하셨나요?':'운동 기록'}</h2><p>{view==='entry'?'날짜와 횟수를 입력하고 저장하면 스트레칭 선택으로 넘어가요.':'날짜별 운동과 스트레칭 여부를 확인하세요.'}</p></div>
  <label className="nutrition-date">운동 날짜<input type="date" required value={date} disabled={busy} onChange={e=>{setDate(e.target.value);setMessage('');}}/></label>
  {view==='history'&&<div className="history-actions"><Button variant="outline" onClick={onFind}>운동 추가하기</Button>{drafts.length>0&&<Button onClick={onEntry}>입력 중인 운동 {drafts.length}개 이어서 기록</Button>}</div>}
  <div hidden={view!=='entry'}><div className="section-heading"><h3 className="nutrition-subtitle">선택한 운동 ({drafts.length})</h3><Button variant="outline" onClick={()=>{onFind();window.scrollTo({top:0,behavior:'instant'});}}>운동 추가하기</Button></div>
  {!drafts.length?<p className="nutrition-note">운동을 누른 뒤 ‘선택’ 버튼으로 이 목록에 추가해 주세요.</p>:<ul className="draft-list">{drafts.map(draft=><li key={draft.id}><form className="food-detail workout-form" aria-label={`${draft.exercise} 기록`} onSubmit={e=>{e.preventDefault();void save(draft);}}><fieldset disabled={busy}><h4>{draft.exercise}</h4><div className="draft-controls"><label className="nutrition-field">총 횟수 (회)<input required type="number" min="1" max="100000" step="1" value={draft.reps} onChange={e=>update(draft.id,{reps:e.target.value})} placeholder="예: 30"/></label><label className="workout-check"><Checkbox checked={draft.stretched} onCheckedChange={value=>update(draft.id,{stretched:value===true})}/>스트레칭을 했어요</label><Button type="submit" className="action-button" disabled={!date||!draft.reps}>{busy?'저장 중…':'기록 저장'}</Button><Button type="button" variant="outline" aria-label={`${draft.exercise} 선택 취소`} onClick={()=>setDrafts(all=>all.filter(d=>d.id!==draft.id))}>선택 취소</Button></div></fieldset></form></li>)}</ul>}
  <p className="nutrition-note">저장하면 계정에 보관됩니다. 저장 전 선택 목록은 새로고침하면 사라져요. 횟수는 모든 세트의 반복 횟수를 합해 입력하세요.</p></div>
  {error&&<p role="alert" className="nutrition-notice">{error}</p>}<p role="status" className="nutrition-message">{message}</p>
  <div hidden={view!=='history'}><h3 className="nutrition-subtitle">{date||'선택한 날짜'}의 운동</h3>
  {!date?<p>날짜를 선택해 주세요.</p>:status==='loading'?<p role="status">운동 기록을 불러오는 중이에요.</p>:status==='error'?<Button variant="outline" onClick={()=>setRetry(n=>n+1)}>기록 다시 불러오기</Button>:!rows.length?<p>아직 기록한 운동이 없어요.</p>:<div className="meal-group">{rows.map(row=><div className="meal-row workout-row" key={row.id}><div><strong>{row.exercise}</strong><p>{row.date} · {row.reps}회</p></div><label className="workout-check"><Checkbox disabled={busy} checked={row.stretched} aria-label={`${row.exercise} 스트레칭 완료`} onCheckedChange={async value=>{const stretched=value===true;if(await mutate('PATCH',{id:row.id,stretched})){setRows(all=>all.map(w=>w.id===row.id?{...w,stretched}:w));setMessage('스트레칭 여부를 변경했어요.');}}}/>{row.stretched?'스트레칭 완료':'스트레칭 안 함'}</label><Button disabled={busy} variant="outline" aria-label={`${row.exercise} 운동 기록 삭제`} onClick={async()=>{if(await mutate('DELETE',{id:row.id})){setRows(all=>all.filter(w=>w.id!==row.id));setMessage('운동 기록을 삭제했어요.');}}}>삭제</Button></div>)}</div>}
 </div></section>;
}
