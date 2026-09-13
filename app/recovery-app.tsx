'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Activity, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronRight, CircleHelp, Dumbbell, Expand, ImageOff, Info, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import NutritionPanel from './nutrition-panel';
import WorkoutPanel, { type WorkoutDraft } from './workout-panel';
import { recommend, searchExercises, type Candidate, type Exercise, type Stretch } from '@/lib/recovery';

type Stage = 'find'|'method'|'recommend'|'detail';
type Zoom = {src:string;caption:string}|null;

function Photo({src,alt,className='',onZoom}:{src?:string;alt:string;className?:string;onZoom?:(image:NonNullable<Zoom>)=>void}) {
 const [failedSrc,setFailedSrc]=useState<string|null>(null);
 if(!src||failedSrc===src)return <div className={`photo-fallback ${className}`}><ImageOff size={28} aria-hidden="true"/><span>사진이 준비되지 않았어요</span></div>;
 const img=<Image src={src} alt={alt} width={640} height={426} unoptimized loading="lazy" onError={()=>setFailedSrc(src)}/>;
 return onZoom?<button className={`photo-zoom ${className}`} onClick={()=>onZoom({src,caption:alt})} aria-label={`${alt} 크게 보기`}>{img}<span className="zoom-label"><Expand size={14} aria-hidden="true"/>크게 보기</span></button>:<div className={className}>{img}</div>;
}
function MuscleTags({names,tone='primary'}:{names:string[];tone?:'primary'|'secondary'}) {
 return <div className="muscle-tags">{names.map(name=><span className={`muscle-tag ${tone}`} key={name}>{name}</span>)}</div>;
}
function ExerciseFacts({exercise}:{exercise:Exercise}) {
 return <><div className="muscle-group"><p>주로 사용한 근육 <span>주동근</span></p><MuscleTags names={exercise.primaryMusclesKo}/></div><div className="muscle-group"><p>함께 사용한 근육 <span>보조근</span></p>{exercise.secondaryMusclesKo.length?<MuscleTags names={exercise.secondaryMusclesKo} tone="secondary"/>:<p className="muted small">원본에 별도로 기재된 근육이 없어요.</p>}</div></>;
}

export default function RecoveryApp() {
 const [exercises,setExercises]=useState<Exercise[]>([]);
 const [stretches,setStretches]=useState<Stretch[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState(false);
 const [retry,setRetry]=useState(0);
 const [query,setQuery]=useState('');
 const [shown,setShown]=useState(12);
 const [selected,setSelected]=useState<Exercise|null>(null);
 const [stage,setStage]=useState<Stage>('find');
 const [available,setAvailable]=useState<string[]>([]);
 const [limit,setLimit]=useState(3);
 const [active,setActive]=useState<Candidate|null>(null);
 const [zoom,setZoom]=useState<Zoom>(null);
 const [help,setHelp]=useState(false);
 const [drafts,setDrafts]=useState<WorkoutDraft[]>([]);
 const heading=useRef<HTMLHeadingElement>(null);

 const searchInput=useRef<HTMLInputElement>(null);

 useEffect(()=>{
  const controller=new AbortController();
  Promise.all(['/data/exercises.json','/data/stretches.json'].map(url=>fetch(url,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('데이터 오류');return r.json();})))
   .then(([e,s])=>{if(!Array.isArray(e)||!Array.isArray(s)||!e.length)throw new Error('데이터 오류');setExercises(e);setStretches(s);setLoading(false);})
   .catch(e=>{if(e.name!=='AbortError'){setError(true);setLoading(false);}});
  return ()=>controller.abort();
 },[retry]);
 useEffect(()=>{if(stage!=='find'){heading.current?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}},[stage]);
 const results=useMemo(()=>searchExercises(exercises,query),[exercises,query]);
 const recommendations=useMemo(()=>recommend(selected,stretches,available,limit),[selected,stretches,available,limit]);
 const requirementOptions=useMemo(()=>{
  const map=new Map<string,string>();
  stretches.filter(s=>s.defaultEligible).forEach(s=>s.requirements.forEach((r,i)=>map.set(r,s.requirementsKo[i])));
  return [...map].sort((a,b)=>a[1].localeCompare(b[1],'ko'));
 },[stretches]);
 const activeExercise=active?exercises.find(e=>e.id===active.stretch.exerciseId):null;
 function updateQuery(value:string){setQuery(value);setShown(12);}
 function chooseExercise(exercise:Exercise){setSelected(exercise);setActive(null);setStage('method');}
 function addSelected(){if(!selected)return;setDrafts(all=>all.some(d=>d.exerciseId===selected.id)?all:[...all,{id:crypto.randomUUID(),exerciseId:selected.id,exercise:selected.nameKo,reps:'',stretched:false}]);}
 function toFind(){setStage('find');setActive(null);setTimeout(()=>searchInput.current?.focus(),0);}
 function chooseStretch(candidate:Candidate){setActive(candidate);setStage('detail');}
 const stages:[Stage,string][]=[['find','운동 찾기'],['method','운동 방법'],['recommend','스트레칭 선택'],['detail','따라 하기']];

 return <>
  <a className="skip-link" href="#main">본문으로 바로가기</a>
  <header className="app-header"><button className="brand" onClick={toFind} aria-label="리커버리 운동 찾기로 이동"><span className="brand-icon"><Activity aria-hidden="true"/></span>리커버리<span className="brand-en">RECOVERY</span></button><button className="help-button" onClick={()=>setHelp(true)}><CircleHelp size={19} aria-hidden="true"/><span>이용 안내</span></button></header>
  <main id="main" className="app-shell">
   <div className="record-links"><a className="nutrition-jump" href="#workout-log">운동 기록{drafts.length>0&&` · 선택 ${drafts.length}개`} ↓</a><a className="nutrition-jump" href="#nutrition">식사 기록 · 영양 요약 ↓</a></div>
   <nav aria-label="진행 단계"><ol className="stepper">{stages.map(([key,label],i)=><li key={key} className={stage===key?'active':''} aria-current={stage===key?'step':undefined}><span className="step-number">{String(i+1).padStart(2,'0')}</span><span>{label}</span>{i<stages.length-1&&<ChevronRight className="step-chevron" size={15} aria-hidden="true"/>}</li>)}</ol></nav>
   {loading?<section aria-busy="true" aria-label="운동 데이터 불러오는 중"><div className="intro"><h1>운동 정보를 준비하고 있어요</h1></div><div className="exercise-grid">{[0,1,2,3].map(i=><Skeleton key={i} className="h-64 rounded-2xl"/>)}</div></section>:error?<section role="alert" className="empty-state"><Info size={30}/><h1>운동 정보를 불러오지 못했어요</h1><p>인터넷 연결을 확인하고 다시 시도해 주세요.</p><Button className="action-button" onClick={()=>{setLoading(true);setError(false);setRetry(r=>r+1);}}>다시 불러오기</Button></section>:<>
   {stage==='find'&&<>
    <div className="intro"><p className="eyebrow">나의 운동 후 스트레칭</p><h1 ref={heading} tabIndex={-1}>오늘 어떤 운동을 하셨나요?</h1><p>운동을 눌러 방법을 확인하고, 기록할 운동을 선택하세요.</p></div>
    <search><form onSubmit={e=>{e.preventDefault();setShown(12);}}><label className="search-box"><Search size={24} aria-hidden="true"/><span className="sr-only">운동 이름 검색</span><input ref={searchInput} type="search" autoComplete="off" value={query} onChange={e=>updateQuery(e.target.value)} placeholder="운동 이름 검색 · 예: 스쿼트, 벤치프레스" aria-describedby="search-hint"/></label></form></search>
    <div className="search-tools"><p id="search-hint">한국어·영어 모두 검색할 수 있어요.</p><div className="quick-search"><span>빠르게 찾기</span>{['스쿼트','벤치프레스','푸시업','데드리프트'].map(q=><button key={q} onClick={()=>updateQuery(q)}>{q}<ArrowUpRight size={13} aria-hidden="true"/></button>)}</div></div>
    <div className="find-layout"><section aria-label="운동 검색 결과"><div className="section-heading"><h2>{results.mode==='featured'?'대표 운동':results.mode==='suggestion'?'혹시 이 운동을 찾으셨나요?':'검색 결과'}</h2><output aria-live="polite">{results.items.length}개</output></div>{results.mode==='suggestion'&&<p className="inline-note">일치하는 이름이 없어 비슷한 이름을 찾았어요. 운동을 확인한 뒤 선택해 주세요.</p>}
     {results.items.length?<div className="exercise-grid">{results.items.slice(0,shown).map(e=><button className={`exercise-card ${selected?.id===e.id?'is-selected':''}`} key={e.id} onClick={()=>chooseExercise(e)} aria-pressed={selected?.id===e.id}><Photo src={e.photos[0]} alt={`${e.nameKo} 동작 사진`} className="exercise-photo"/><div className="exercise-card-content"><span className="equipment-label">{e.equipmentKo}</span><h3>{e.nameKo}</h3><p>{e.primaryMusclesKo.join(' · ')}</p><span className="card-arrow">{selected?.id===e.id?<Check size={19}/>:<ArrowUpRight size={19}/>}</span></div></button>)}</div>:<div className="empty-state"><Search size={30} aria-hidden="true"/><h3>검색 결과가 없어요</h3><p>이름을 짧게 입력하거나 영어 이름으로 찾아보세요.</p><Button variant="outline" className="action-button" onClick={()=>updateQuery('')}>대표 운동 보기</Button></div>}
     {shown<results.items.length&&<Button variant="outline" className="load-more" onClick={()=>setShown(n=>n+12)}>운동 더 보기 <span>{Math.min(shown,results.items.length)} / {results.items.length}</span></Button>}
    </section>
    <aside className="selection-panel"><div className="welcome-guide"><span className="guide-icon"><Dumbbell size={30} aria-hidden="true"/></span><h2>운동 방법부터<br/>차근차근 확인해요.</h2><ol><li><span>1</span>운동을 눌러 방법을 확인해요</li><li><span>2</span>‘선택’으로 기록 목록에 담아요</li><li><span>3</span>다음 화면에서 스트레칭을 골라요</li></ol><a className="nutrition-jump" href="#workout-log">선택한 운동 {drafts.length}개 보기 ↓</a></div></aside></div>
   </>}
   {stage==='method'&&selected&&<>
    <button className="back-button" onClick={toFind}><ArrowLeft size={18} aria-hidden="true"/>운동 목록으로</button>
    <div className="intro"><p className="eyebrow">운동 방법</p><h1 ref={heading} tabIndex={-1}>{selected.nameKo}</h1><p lang="en">{selected.name}</p></div>
    <div className="follow-layout"><section aria-label="운동 동작 사진"><div className="photo-pair">{selected.photos.length?selected.photos.map((src,i)=><figure key={src}><Photo src={src} alt={selected.nameKo+' 동작 사진 '+(i+1)} onZoom={setZoom} className="follow-photo"/><figcaption>동작 사진 {i+1}</figcaption></figure>):<Photo alt="운동 동작 사진" className="follow-photo"/>}</div><div className="food-detail exercise-method-facts"><div className="fact-chips"><span>{selected.levelKo}</span><span>{selected.equipmentKo}</span></div><ExerciseFacts exercise={selected}/></div></section>
    <section className="instruction-panel" aria-label="운동 방법"><div className="section-heading"><h2>이렇게 운동하세요</h2></div><p className="small muted">{selected.instructionsKo?.length?'원문 기반 한국어 요약':'제공된 데이터의 영어 원문입니다.'}</p>
    {(selected.instructionsKo?.length?selected.instructionsKo:selected.instructions).length?<ol className="instruction-steps exercise-method-steps" lang={selected.instructionsKo?.length?'ko':'en'}>{(selected.instructionsKo?.length?selected.instructionsKo:selected.instructions).map((text,i)=><li key={i}><span className="instruction-number" aria-hidden="true">{i+1}</span><p>{text}</p></li>)}</ol>:<p className="inline-note">제공된 데이터에 운동 방법이 없어요.</p>}
    <div className="method-actions"><Button className="action-button full" disabled={drafts.some(d=>d.exerciseId===selected.id)} onClick={addSelected}>{drafts.some(d=>d.exerciseId===selected.id)?'선택됨':'선택'}<Check aria-hidden="true"/></Button><p role="status" className="nutrition-note">{drafts.some(d=>d.exerciseId===selected.id)?'운동 기록 목록에 담았어요. 목록에서 횟수를 입력하고 저장하세요.':'선택하면 운동 기록 목록에 추가됩니다.'}</p><a className="nutrition-jump" href="#workout-log">선택한 운동 {drafts.length}개 보기 ↓</a>
    {selected.category==='stretching'?<p className="inline-note">이 운동은 스트레칭이에요. 다른 운동을 고르면 관련 스트레칭을 볼 수 있어요.</p>:<Button variant="outline" className="action-button full" onClick={()=>setStage('recommend')}>다음 · 스트레칭 선택<ArrowRight aria-hidden="true"/></Button>}</div></section></div>
   </>}
   {stage==='recommend'&&selected&&<>
    <button className="back-button" onClick={()=>setStage('method')}><ArrowLeft size={18} aria-hidden="true"/>운동 방법으로</button><div className="intro"><p className="eyebrow">선택한 운동에 맞춰서</p><h1 ref={heading} tabIndex={-1}>사용한 근육을 천천히 늘려볼까요?</h1><p>사진을 보고 원하는 스트레칭을 선택하세요.</p></div>
    <div className="recommend-layout"><aside className="workout-summary"><div className="section-heading"><span className="eyebrow">오늘 선택한 운동</span><Dumbbell size={18} aria-hidden="true"/></div><Photo src={selected.photos[0]} alt={`${selected.nameKo} 동작 사진`} className="summary-photo" onZoom={setZoom}/><h2>{selected.nameKo}</h2><p className="english-name" lang="en">{selected.name}</p><ExerciseFacts exercise={selected}/><p className="small muted">근육 표시는 원본의 분류이며 실제 부하 측정값은 아니에요.</p></aside>
    <section className="recommend-main" aria-label="추천 스트레칭"><div className="equipment-panel"><div className="equipment-title"><h2><SlidersHorizontal size={18} aria-hidden="true"/>사용할 수 있는 도구</h2><span>선택하지 않으면 맨몸 동작만 추천해요</span></div><div className="equipment-options">{requirementOptions.map(([code,label])=><label className={`equipment-option ${available.includes(code)?'checked':''}`} key={code}><Checkbox checked={available.includes(code)} onCheckedChange={checked=>{setAvailable(a=>checked?[...a,code]:a.filter(x=>x!==code));setActive(null);}} aria-label={label}/><span>{label}</span></label>)}</div></div>
    <div className="section-heading recommendation-heading"><h2>나에게 맞는 스트레칭 <output aria-live="polite">{recommendations.items.length}</output></h2><label className="count-label">최대<NativeSelect aria-label="최대 추천 개수" value={limit} onChange={e=>{setLimit(Number(e.target.value));setActive(null);}}>{Array.from({length:10},(_,i)=><option value={i+1} key={i+1}>{i+1}개</option>)}</NativeSelect></label></div>
    {recommendations.items.length?<div className="stretch-list">{recommendations.items.map((candidate,i)=>{const row=exercises.find(e=>e.id===candidate.stretch.exerciseId);return <button className="stretch-card" key={candidate.stretch.exerciseId} onClick={()=>chooseStretch(candidate)}><div className="stretch-thumbnail"><Photo src={row?.photos[0]} alt={`${candidate.stretch.nameKo} 동작 사진`} className="stretch-photo"/><span className="recommend-number">{String(i+1).padStart(2,'0')}</span></div><div className="stretch-card-body"><p className="equipment-label">{candidate.stretch.requirementsKo.join(' · ')||'별도 도구 없이'}</p><h3>{candidate.stretch.nameKo}</h3><div className="muscle-tags">{candidate.matches.map(m=><span key={m.muscleId} className="muscle-tag primary">{m.nameKo}</span>)}</div><p className="match-explanation">선택한 운동에서 사용한 근육과 연결돼요.</p><span className="text-link">방법 보기<ArrowRight size={17} aria-hidden="true"/></span></div></button>;})}</div>:<div className="empty-state"><Info size={28}/><h3>조건에 맞는 후보가 없어요</h3><p>{recommendations.message}</p><Button variant="outline" className="action-button" onClick={toFind}>다른 운동 선택</Button></div>}
    {recommendations.uncovered.length>0&&<details className="plain-details uncovered"><summary>이번 추천에 포함되지 않은 근육 ({recommendations.uncovered.length})</summary><ul>{recommendations.uncovered.map(m=><li key={m.muscleId}><strong>{m.nameKo}</strong> · {m.reasonKo}</li>)}</ul></details>}
    <p className="recommend-note"><Info size={16} aria-hidden="true"/>같은 근육만 반복하지 않도록 골랐어요. 조건에 따라 추천 개수가 적을 수 있어요.</p></section></div>
   </>}
   {stage==='detail'&&active&&selected&&<>
    <button className="back-button" onClick={()=>setStage('recommend')}><ArrowLeft size={18} aria-hidden="true"/>스트레칭 목록으로</button><div className="intro"><p className="eyebrow">운동 후 정적 스트레칭</p><h1 ref={heading} tabIndex={-1}>{active.stretch.nameKo}</h1><p>{selected.nameKo}에서 사용한 근육을 위한 동작이에요.</p></div>
    <div className="follow-layout"><section aria-label="스트레칭 동작 사진"><div className="photo-pair">{activeExercise?.photos.length?activeExercise.photos.map((src,i)=><figure key={src}><Photo src={src} alt={`${active.stretch.nameKo} 동작 사진 ${i+1}`} onZoom={setZoom} className="follow-photo"/><figcaption>동작 사진 {i+1}</figcaption></figure>):<Photo alt="스트레칭 동작 사진" className="follow-photo"/>}</div><div className="reason-panel"><span className="reason-icon"><Activity size={21} aria-hidden="true"/></span><div><h2>이 스트레칭을 추천한 이유</h2><p>선택한 운동에서 사용한 <strong>{active.matches.map(m=>m.nameKo).join(', ')}</strong> 부위와 연결되는 동작이에요.</p><details className="plain-details"><summary>근육 연결 기준 자세히 보기</summary><ul>{active.matches.map(m=><li key={m.muscleId}>{m.nameKo} · 운동의 {m.exerciseRoleKo} → 스트레칭의 {m.stretchRoleKo}</li>)}</ul><p className="small muted">근육 일치 점수 {active.score}점 · 추천 순서를 정하는 기준으로, 효과나 실제 부하를 뜻하지 않아요.</p></details></div></div></section>
    <section className="instruction-panel" aria-label="스트레칭 방법"><div className="section-heading"><h2>이렇게 따라 해보세요</h2><span className="pill">천천히, 편안하게</span></div><p className="tools-line"><Dumbbell size={17} aria-hidden="true"/>{active.stretch.requirementsKo.join(' · ')||'별도 도구가 필요 없어요'}</p><ol className="instruction-steps">{active.stretch.instructionsKo.map((s,i)=><li key={i}><span className="instruction-number" aria-hidden="true">{i+1}</span><p>{s}</p></li>)}</ol><p className="source-caption">원문 기반 한국어 요약 · 유지 시간은 원문에 적힌 경우에만 안내해요.</p><div className="care-note"><Info size={20} aria-hidden="true"/><p>통증이 없는 범위에서 움직이고, 반동을 주지 마세요. 불편하면 멈추고 자세를 확인하세요.</p></div><Button className="action-button full" onClick={()=>setStage('recommend')}>다른 스트레칭도 보기<ArrowRight aria-hidden="true"/></Button><button className="text-button" onClick={toFind}>다른 운동 선택하기</button></section></div>
   </>}
   </>}
   <WorkoutPanel drafts={drafts} setDrafts={setDrafts} onFind={toFind}/>
   <NutritionPanel exercise={selected?.nameKo} stretch={active?.stretch.nameKo}/>
   <footer className="site-footer"><span className="footer-brand"><Activity size={16} aria-hidden="true"/>리커버리</span><p>운동 정보를 바탕으로 스트레칭 후보를 안내해요. 치료·회복 효과를 보장하지 않아요.</p><button onClick={()=>setHelp(true)}>데이터와 추천 기준</button></footer>
  </main>
  <Dialog open={!!zoom} onOpenChange={open=>{if(!open)setZoom(null);}}><DialogContent showCloseButton={false} className="image-dialog"><div className="dialog-top"><DialogTitle>동작 사진 크게 보기</DialogTitle><DialogClose aria-label="사진 닫기" className="dialog-close"><X size={22}/></DialogClose></div><DialogDescription>{zoom?.caption}</DialogDescription>{zoom&&<Image src={zoom.src} alt={zoom.caption} width={850} height={567} unoptimized className="enlarged-image"/>}</DialogContent></Dialog>
  <Dialog open={help} onOpenChange={setHelp}><DialogContent showCloseButton={false} className="help-dialog"><div className="dialog-top"><DialogTitle>리커버리 이용 안내</DialogTitle><DialogClose className="dialog-close" aria-label="이용 안내 닫기"><X size={22}/></DialogClose></div><DialogDescription>운동을 고르고, 사진과 설명으로 스트레칭을 확인하세요.</DialogDescription><div className="help-copy"><h3>어떻게 사용하나요?</h3><ol><li>한국어 또는 영어로 운동을 검색하고 카드를 선택해요.</li><li>운동 방법을 확인하고 ‘선택’ 버튼으로 기록 목록에 담아요.</li><li>‘다음 · 스트레칭 선택’을 눌러 원하는 스트레칭을 골라요. 운동 기록 목록에서 횟수를 입력해 저장할 수 있어요.</li></ol><h3>무엇을 기준으로 추천하나요?</h3><p>운동과 스트레칭의 주동근·보조근이 겹치는 정도로 후보를 골라요. 주동근끼리는 4점, 주동근과 보조근은 2점, 보조근끼리는 1점을 부여하고, 아직 다루지 않은 근육을 우선해요.</p><h3>데이터를 읽을 때 알아두세요</h3><p>운동 876개와 스트레칭 요약 123개를 담고 있어요. 기본 추천은 별도로 선정한 정적 동작 30개에서 골라요. 일반 운동 상세 설명 753개는 영어 원문이며, 일부 운동은 설명이나 사진이 없을 수 있어요.</p><p>근육 분류와 추천 점수는 실제 부하·피로도·회복률이 아니에요. 원본 데이터에 기초한 후보 안내이며 전문가의 개인별 처방을 대신하지 않아요.</p><p className="small muted">자료: 첨부된 근육 회복 프로그램 노트북 · Free Exercise DB. 검색과 추천은 이 브라우저 안에서 처리됩니다.</p></div><DialogClose render={<Button className="action-button full"/>}>확인했어요</DialogClose></DialogContent></Dialog>
 </>;
}
