'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import BodyTrendPanel from './body-trend-panel';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { energyRatio, localDate, nutrients, portion, searchFoods, totals, type Entry, type Food, type Meal } from '@/lib/nutrition';

const labels={kcal:'열량',carbs:'탄수화물',protein:'단백질',fat:'지방'};
const meals:Meal[]=['아침','점심','저녁','간식'];
const format=(n:number|null)=>n===null?'정보 없음':n.toLocaleString('ko-KR',{maximumFractionDigits:1});
export default function NutritionPanel({onExercise}:{onExercise:()=>void}){
 const [foodStep,setFoodStep]=useState<'search'|'amount'>('search');
 const [tab,setTab]=useState('record');
 const stepHeading=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});stepHeading.current?.focus({preventScroll:true});},[foodStep,tab]);
 const [foods,setFoods]=useState<Food[]>([]),[status,setStatus]=useState('loading'),[retry,setRetry]=useState(0);
 const [query,setQuery]=useState(''),[origin,setOrigin]=useState(''),[shown,setShown]=useState(12);
 const [selected,setSelected]=useState<Food|null>(null),[amount,setAmount]=useState('100'),[meal,setMeal]=useState<Meal>('점심');
 const [date,setDate]=useState(''),[entries,setEntries]=useState<Entry[]>([]),[message,setMessage]=useState(''),[entriesLoaded,setEntriesLoaded]=useState(false);
 useEffect(()=>setDate(localDate()),[]);
 useEffect(()=>{try{const stored=window.localStorage.getItem('recovery-food-entries-v1');if(stored){const parsed=JSON.parse(stored);if(Array.isArray(parsed))setEntries(parsed as Entry[]);}}catch{window.localStorage.removeItem('recovery-food-entries-v1');}finally{setEntriesLoaded(true);}},[]);
 useEffect(()=>{if(entriesLoaded)window.localStorage.setItem('recovery-food-entries-v1',JSON.stringify(entries));},[entries,entriesLoaded]);
 useEffect(()=>{const c=new AbortController();setStatus('loading');fetch('/data/foods.json',{signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{if(!Array.isArray(data)||!data.length)throw Error();setFoods(data.map((f:Food)=>({...f,origin:f.company?'업체 메뉴':f.origin.split('(')[0]})));setStatus('ready');}).catch(e=>{if(e.name!=='AbortError')setStatus('error');});return()=>c.abort();},[retry]);
 const origins=useMemo(()=>[...new Set(foods.map(f=>f.origin))].sort(),[foods]);
 const results=useMemo(()=>searchFoods(foods,query,origin),[foods,query,origin]);
 const daily=entries.filter(e=>e.date===date),sum=totals(daily),ratio=energyRatio(daily);
 const valid=Number.isFinite(Number(amount))&&Number(amount)>0&&Number(amount)<=100000;
 const preview=selected&&valid?portion(selected,Number(amount)):null;
 function add(){if(!selected||!valid||!date)return;setEntries(e=>[...e,{id:crypto.randomUUID(),date,meal,food:selected,amount:Number(amount)}]);setMessage(`${date} ${meal}에 ${selected.name} ${amount}${selected.unit}를 추가했어요.`);setTab('summary');setFoodStep('search');}
 return <section id="nutrition" className="nutrition-section" aria-labelledby="nutrition-title">
  <div className="intro"><p className="eyebrow">운동과 식사를 함께 확인해요</p><h2 id="nutrition-title" tabIndex={-1}>오늘 먹은 음식 기록</h2><p>음식을 고르고 실제 먹은 양을 입력하세요.</p></div>

  <p className="nutrition-note">식사 기록은 이 기기에 저장됩니다. 날짜를 바꾸면 해당 날짜의 기록과 그래프를 볼 수 있어요. 운동한 내용은 하단의 운동 기록에서 확인할 수 있어요.</p>
  <label className="nutrition-date">식사 날짜<input type="date" value={date} onChange={e=>{setDate(e.target.value);setMessage('');}} required/></label>
  <Tabs value={tab} onValueChange={setTab}>
   <TabsList className="nutrition-tabs" aria-label="식사 기록과 요약"><TabsTrigger value="record">식사 기록</TabsTrigger><TabsTrigger value="summary">영양 요약</TabsTrigger><TabsTrigger value="body">음식·운동 변화</TabsTrigger></TabsList>
   <TabsContent value="record"><p className="food-step-indicator" ref={stepHeading} tabIndex={-1}>{foodStep==='search'?'1 / 2 · 음식 선택':'2 / 2 · 먹은 양 입력'}</p>
    {status==='loading'?<p role="status">음식 정보를 불러오는 중이에요.</p>:status==='error'?<div role="alert"><p>음식 정보를 불러오지 못했어요.</p><Button onClick={()=>setRetry(n=>n+1)}>다시 불러오기</Button></div>:<div className="nutrition-layout food-wizard">
     <div hidden={foodStep!=='search'}><label className="nutrition-field">음식 이름<input type="search" value={query} placeholder="예: 비빔밥, 김치찌개" onChange={e=>{setQuery(e.target.value);setShown(12);}}/></label>
      <label className="nutrition-field">음식 구분<NativeSelect value={origin} onChange={e=>{setOrigin(e.target.value);setShown(12);}}><option value="">전체</option>{origins.map(o=><option key={o}>{o}</option>)}</NativeSelect></label>
      <p className="nutrition-note" aria-live="polite">{!query.trim()?`${foods.length.toLocaleString()}개 음식에서 검색하세요.`:`검색 결과 ${results.length.toLocaleString()}개 · 이름과 음식 구분을 확인하고 선택하세요.`}</p>
      {query.trim()&&!results.length&&<p>일치하는 음식이 없어요. 이름을 짧게 입력하거나 음식 구분을 바꿔보세요.</p>}
      <div className="food-results">{results.slice(0,shown).map(f=><button className={`food-result ${selected?.id===f.id?'chosen':''}`} key={f.id} aria-pressed={selected?.id===f.id} onClick={()=>{setSelected(f);setAmount('100');setMessage('');setFoodStep('amount');}}><strong>{f.name}</strong><span>{f.origin}{f.company&&` · ${f.company}`}</span><span>{f.basis}{f.unit}당 {format(f.kcal)} kcal · 단백질 {format(f.protein)} g</span></button>)}</div>
      {shown<results.length&&<Button variant="outline" className="load-more" onClick={()=>setShown(n=>n+12)}>음식 더 보기 ({Math.min(shown,results.length)} / {results.length})</Button>}
     </div>
     <aside hidden={foodStep!=='amount'} className="food-detail" aria-label="선택한 음식"><Button className="food-step-back" variant="outline" onClick={()=>setFoodStep('search')}>이전 · 음식 다시 선택</Button>{selected?<><p className="eyebrow">선택한 음식</p><h3>{selected.name}</h3><p>{selected.origin}{selected.company&&` · ${selected.company}`}</p><p className="nutrition-note">원본 기준: {selected.basis}{selected.unit}당 영양성분</p>
      {selected.unit==='ml'&&<p className="nutrition-notice">원본에 100ml 기준으로 표기되어 있어요. 음식에 맞는 단위인지 확인하세요. g과 ml를 서로 변환하지 않습니다.</p>}
      <form onSubmit={e=>{e.preventDefault();add();}}><label className="nutrition-field">먹은 양 ({selected.unit})<input type="number" min="0.1" max="100000" step="any" value={amount} required onChange={e=>setAmount(e.target.value)}/></label>
       <label className="nutrition-field">식사 구분<NativeSelect value={meal} onChange={e=>setMeal(e.target.value as Meal)}>{meals.map(m=><option key={m}>{m}</option>)}</NativeSelect></label>
       {preview&&<dl className="nutrition-facts">{nutrients.map(k=><div key={k}><dt>{labels[k]}</dt><dd>{format(preview[k])}{preview[k]!==null&&(k==='kcal'?' kcal':' g')}</dd></div>)}</dl>}
       {!valid&&<p role="alert">먹은 양을 0보다 크고 100,000 이하인 숫자로 입력해 주세요.</p>}
       <Button type="submit" className="action-button full" disabled={!valid||!date}>입력 완료 · 영양 요약 보기</Button>
      </form></>:<><h3>어떤 음식을 드셨나요?</h3><p>검색 결과에서 음식을 선택하면 먹은 양에 맞춰 영양성분을 계산해요.</p></>}</aside>
    </div>}
    <p role="status" className="nutrition-message">{message}</p>
    <div hidden={foodStep!=='search'}><h3 className="nutrition-subtitle">{date||'선택한 날짜'}의 식사</h3>
    {!daily.length?<p>아직 기록한 음식이 없어요.</p>:meals.map(m=>{const rows=daily.filter(e=>e.meal===m);return rows.length?<section key={m} className="meal-group" aria-label={m}><h4>{m}</h4>{rows.map(e=><div className="meal-row" key={e.id}><div><strong>{e.food.name}</strong><p>{e.amount}{e.food.unit} · {format(portion(e.food,e.amount).kcal)} kcal</p></div><Button variant="outline" aria-label={`${m} ${e.food.name} 기록 삭제`} onClick={()=>{setEntries(all=>all.filter(x=>x.id!==e.id));setMessage(`${e.food.name} 기록을 삭제했어요.`);}}>삭제</Button></div>)}</section>:null;})}
   </div></TabsContent>
   <TabsContent value="summary"><p role="status" className="nutrition-message">{message}</p><div className="history-actions"><Button onClick={()=>{setFoodStep('search');setTab('record');}}>음식 추가하기</Button><Button variant="outline" onClick={onExercise}>운동하러 가기</Button></div><h3 className="nutrition-subtitle">{date||'선택한 날짜'}의 영양 합계</h3><p>아침·점심·저녁·간식에 직접 기록한 음식 {daily.length}개의 합계예요.</p>
    <div className="nutrition-summary">{nutrients.map(k=><div key={k}><span>{labels[k]}</span><strong>{format(sum[k].value)}<small>{k==='kcal'?' kcal':' g'}</small></strong><p>{sum[k].missing?`${sum[k].missing}개 음식 정보 누락 · 확인된 값만 합산`:'기록한 음식 기준'}</p></div>)}</div>
    <h3 className="nutrition-subtitle">탄수화물·단백질·지방의 열량 비율</h3>
    {ratio?<><div className="macro-bar" aria-hidden="true">{ratio.map((p,i)=><span key={i} style={{width:`${p}%`}}/>)}</div><ul className="macro-legend">{ratio.map((p,i)=><li key={i}>{['탄수화물','단백질','지방'][i]} {p.toFixed(1)}%</li>)}</ul><p className="nutrition-note">탄수화물·단백질 1g당 4kcal, 지방 1g당 9kcal로 계산한 구성비입니다. 원본의 총열량과 차이가 날 수 있어요.</p></>:<p className="nutrition-notice">{daily.length?'탄수화물·지방 등의 정보가 없거나 합계가 0이라 비율을 계산할 수 없어요.':'음식을 기록하면 영양 요약을 볼 수 있어요.'}</p>}
    <p className="nutrition-note">영양 합계는 기록된 음식 기준입니다. 영양성분이 없는 항목은 0으로 판단하지 않고 누락 여부를 표시해요.</p>
   </TabsContent>
   <TabsContent value="body" keepMounted><BodyTrendPanel entries={entries} date={date}/></TabsContent>
  </Tabs>
  <details className="plain-details"><summary>식품 데이터와 계산 기준</summary><p>자료: 사용자가 제공한 전국통합식품영양성분정보 음식 표준데이터. 소스·양념·원액과 업체 상품명이 없는 구성별 세부 항목을 제외해, 일반 음식과 업체 메뉴를 제공합니다. 영양값은 각 원본 항목을 유지하며 평균 내지 않습니다. 100g 또는 100ml당 값을 실제 섭취량에 비례해 계산하며, 식품중량을 1인분으로 가정하지 않습니다. 이름이 같은 음식도 원본 항목별로 구분합니다.</p></details>
 </section>;
}
