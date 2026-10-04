'use client';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { NativeSelect } from '@/components/ui/native-select';
import { totals, type Entry } from '@/lib/nutrition';
import { type Workout } from '@/lib/workouts';
import { activityTypes, dailyActivityLevels, exerciseEnergy, scenario, tdee, obesityProjection, type BiologicalSex } from '@/lib/body-trend';
import './body-trend.css';
import YouthGrowthPanel from './youth-growth-panel';

const fmt=(n:number)=>n.toLocaleString('ko-KR',{maximumFractionDigits:1});
const config={kcal:{label:'열량',color:'#315cdb'},weight:{label:'음식 + 운동',color:'#315cdb'},withoutExercise:{label:'운동을 제외한 비교',color:'#778399'}};
export default function BodyTrendPanel({entries,date}:{entries:Entry[];date:string}){
 const [mode,setMode]=useState('youth');
 return <><label className="growth-mode">변화 그래프 기준<NativeSelect value={mode} onChange={e=>setMode(e.target.value)}><option value="youth">어린이·청소년 · 성장 참고선</option><option value="adult">성인 · 열량 시뮬레이션</option></NativeSelect></label>{mode==='youth'?<YouthGrowthPanel entries={entries} date={date}/>:<AdultBodyTrendPanel entries={entries} date={date}/>}</>;
}
function AdultBodyTrendPanel({entries,date}:{entries:Entry[];date:string}){
 const [workouts,setWorkouts]=useState<Workout[]>([]),[status,setStatus]=useState('loading'),[retry,setRetry]=useState(0);
 const [details,setDetails]=useState<Record<string,{minutes:string;kind:string}>>({});
 const [weight,setWeight]=useState(''),[height,setHeight]=useState(''),[age,setAge]=useState(''),[sex,setSex]=useState<BiologicalSex>('male'),[activity,setActivity]=useState(''),[days,setDays]=useState(14);
 const [eligible,setEligible]=useState(false),[completeKey,setCompleteKey]=useState('');
 useEffect(()=>{const refresh=()=>setRetry(n=>n+1);window.addEventListener('workouts-updated',refresh);return()=>window.removeEventListener('workouts-updated',refresh);},[]);
 useEffect(()=>{if(!date)return;const c=new AbortController();setStatus('loading');setWorkouts([]);setCompleteKey('');fetch(`/api/workouts?date=${date}`,{signal:c.signal}).then(async r=>{if(!r.ok)throw Error();return r.json();}).then(rows=>{if(!Array.isArray(rows))throw Error();setWorkouts(rows);setStatus('ready');}).catch(e=>{if(e.name!=='AbortError')setStatus('error');});return()=>c.abort();},[date,retry]);
 const daily=entries.filter(e=>e.date===date),t=totals(daily);
 const key=JSON.stringify([date,daily.map(e=>[e.id,e.amount]),workouts.map(w=>[w.id,w.reps])]);
 const complete=completeKey===key;
 const weightOk=Number.isFinite(Number(weight))&&Number(weight)>=20&&Number(weight)<=350;
 const heightOk=Number.isFinite(Number(height))&&Number(height)>=100&&Number(height)<=250;
 let baseline=0,profileError='';
 try{baseline=tdee(Number(weight),Number(height),Number(age),sex,activity);}catch(e){profileError=e instanceof Error?e.message:'신체 정보를 확인해 주세요.';}
 const rows=workouts.map(w=>{const d=details[w.id],type=activityTypes.find(t=>t.id===d?.kind);let kcal:number|null=null;try{if(type)kcal=exerciseEnergy(Number(weight),Number(d?.minutes),type.met);}catch{}return {...w,minutes:d?.minutes||'',kind:d?.kind||'',kcal};});
 const exerciseReady=status==='ready'&&weightOk&&rows.every(w=>w.kcal!==null);
 const burned=rows.reduce((n,r)=>n+(r.kcal||0),0);
 const meals=['아침','점심','저녁','간식'].map(name=>({name,kcal:totals(daily.filter(e=>e.meal===name)).kcal.value}));
 let reason='',points:ReturnType<typeof scenario>=[];
 if(!daily.length)reason='선택한 날짜에 먹은 음식을 먼저 기록해 주세요.';
 else if(!eligible||!Number.isInteger(Number(age))||Number(age)<18||Number(age)>100)reason='체중 시뮬레이션은 18세 이상 성인이며 임신·수유 중이 아닌 경우에만 제공합니다. 식사·운동 기록은 계속 볼 수 있어요.';
 else if(!heightOk||profileError)reason=profileError||'키를 입력해 주세요.';
 else if(!exerciseReady)reason='같은 날짜의 운동 기록을 불러오고 체중·운동 시간·유형을 입력해 주세요.';
 else if(!complete)reason='하루 식사와 운동 기록이 모두 입력되었는지 확인해 주세요. 일부 기록을 하루 전체로 계산하지 않습니다.';
 else if(t.kcal.missing)reason='열량 정보가 누락된 음식이 있어 체중 시뮬레이션을 계산할 수 없어요.';
 else if(t.kcal.value<1000)reason='기록된 하루 섭취량이 1,000kcal 미만이라 체중 시뮬레이션을 표시하지 않습니다. 빠진 식사를 확인해 주세요.';
 else try{points=scenario(Number(weight),t.kcal.value,baseline,burned,days);}catch(e){reason=e instanceof Error?e.message:'입력값을 확인해 주세요.';}
 const last=points.at(-1),balance=t.kcal.value-baseline-burned;
 const energyBars=[{name:'음식 섭취',kcal:t.kcal.value},{name:'기본 소비',kcal:baseline},{name:'운동 추가 소비',kcal:burned}];
 const projectedBalance=Math.max(-1000,Math.min(1000,balance));
 const balanceCapped=projectedBalance!==balance;
 const obesity=last&&heightOk?obesityProjection(Number(weight),Number(height),projectedBalance):null;
 return <section className="body-report" aria-labelledby="body-report-title">
  <div className="intro"><p className="eyebrow">{date} · 음식과 운동 함께 보기</p><h3 id="body-report-title">몸의 변화 시뮬레이션</h3><p>기록한 하루가 반복된다는 가정으로 열량 균형과 체중 변화를 비교해요.</p></div>
  <div className="report-chart-card"><h4>끼니별 섭취 열량</h4>{daily.length?<><ChartContainer config={config} className="report-chart" aria-label="끼니별 기록된 섭취 열량"><BarChart data={meals} accessibilityLayer><CartesianGrid vertical={false}/><XAxis dataKey="name"/><YAxis unit=" kcal" width={75}/><Tooltip/><Bar dataKey="kcal" name="섭취 열량 (kcal)" fill="#315cdb" radius={[6,6,0,0]} isAnimationActive={false}/></BarChart></ChartContainer><p className="nutrition-note">{meals.map(m=>`${m.name} ${fmt(m.kcal)}kcal`).join(' · ')}. 미기록 끼니는 섭취 여부를 알 수 없습니다.</p></>:<p>음식을 기록하면 끼니별 막대그래프가 표시됩니다.</p>}</div>
  <h4>같은 날짜의 운동</h4><p className="nutrition-note">횟수만으로 열량을 계산하지 않아요. 저장된 각 운동에 실제 운동 시간과 가까운 유형을 입력하세요. 같은 시간을 여러 운동에 중복 입력하지 마세요.</p>
  {status==='loading'?<p role="status">운동 기록을 불러오는 중이에요.</p>:status==='error'?<div role="alert"><p>운동 기록을 불러오지 못했어요. 로그인 상태를 확인해 주세요.</p><Button variant="outline" onClick={()=>setRetry(n=>n+1)}>다시 불러오기</Button></div>:!rows.length?<p>이 날짜에 저장된 운동이 없습니다. 운동을 했다면 운동 기록에 먼저 저장하세요.</p>:rows.map(w=><div className="report-workout" key={w.id}><div><strong>{w.exercise}</strong><p>{w.reps}회 · {w.stretched?'스트레칭 완료':'스트레칭 미완료'}</p></div><label>운동 시간 (분)<input type="number" min="1" max="300" value={w.minutes} onChange={e=>setDetails(d=>({...d,[w.id]:{kind:w.kind,minutes:e.target.value}}))}/></label><label>운동 유형<NativeSelect value={w.kind} onChange={e=>setDetails(d=>({...d,[w.id]:{minutes:w.minutes,kind:e.target.value}}))}><option value="">선택해 주세요</option>{activityTypes.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</NativeSelect></label><span>{w.kcal===null?'추가 정보 필요':`약 ${fmt(w.kcal)} kcal 추가 소비`}</span></div>)}
  <div className="report-inputs"><label>현재 체중 (kg)<input type="number" min="20" max="350" step="0.1" value={weight} placeholder="예: 70" onChange={e=>setWeight(e.target.value)}/></label><label>키 (cm)<input type="number" min="100" max="250" step="0.1" value={height} placeholder="예: 170" onChange={e=>setHeight(e.target.value)}/></label><label>나이 (만 나이)<input type="number" min="18" max="100" value={age} placeholder="예: 25" onChange={e=>setAge(e.target.value)}/></label><label>계산식 성별<NativeSelect value={sex} onChange={e=>setSex(e.target.value as BiologicalSex)}><option value="male">남성식</option><option value="female">여성식</option></NativeSelect></label><label>평소 활동 수준<NativeSelect value={activity} onChange={e=>setActivity(e.target.value)}><option value="">선택해 주세요</option>{dailyActivityLevels.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</NativeSelect></label><label>비교 기간<NativeSelect value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>1주</option><option value={14}>2주</option><option value={28}>4주</option></NativeSelect></label></div>
  <p className="nutrition-note">비만 예방 프로그램에서 사용한 Harris–Benedict 계산식으로 기초대사량을 구하고 활동계수를 곱해 기본 하루 소비 열량을 계산합니다. 위에 입력한 운동은 별도로 더합니다.{baseline>0&&` 현재 입력 기준 기본 소비량은 약 ${fmt(baseline)} kcal입니다.`}</p>
  <label className="report-check"><Checkbox checked={eligible} onCheckedChange={v=>setEligible(v===true)}/>18세 이상이며 임신·수유 중이 아닙니다.</label>
  <label className="report-check"><Checkbox checked={complete} disabled={!daily.length||status!=='ready'} onCheckedChange={v=>setCompleteKey(v===true?key:'')}/>{date}의 식사·간식·음료와 운동을 모두 기록했습니다. 운동 기록이 없으면 운동하지 않은 날입니다.</label>
  <p className="nutrition-note">체중·키·나이·성별식·활동 수준과 운동 시간은 이번 시뮬레이션용 입력이며 새로고침하면 사라집니다.</p>
  {reason?<><p className="nutrition-notice" role="status">{reason}</p><p className="nutrition-note">변화 그래프를 보려면 같은 날짜의 음식 기록, 운동 시간·유형, 체중·키·나이·활동 수준, 그리고 아래 두 확인 항목이 모두 필요합니다.</p></>:last&&<>
   <div className="report-stats"><div><span>현재 BMI</span><strong>{obesity?.currentBmi.toFixed(1)}</strong></div><div><span>BMI 25 기준 체중</span><strong>{obesity?.thresholdWeight.toFixed(1)} kg</strong></div><div><span>추정 총소비량</span><strong>{fmt(baseline+burned)} kcal</strong></div><div><span>{days}일 후 가정값</span><strong>{fmt(last.weight)} kg</strong></div></div>
   <div className={`obesity-result ${obesity?.status==='threshold'?'warning':''}`}><h4>비만 기준 단순 예측</h4>{obesity?.status==='threshold'?<p>현재 BMI가 25 이상으로 계산됩니다. 이 값은 선별 기준이며 진단이 아닙니다.</p>:obesity?.status==='projected'&&obesity.days!==null?<p>기록한 하루의 열량 초과가 매일 같다고 가정하면 약 <strong>{Math.ceil(obesity.days).toLocaleString('ko-KR')}일</strong> 뒤 BMI 25에 도달하는 산술 결과입니다.</p>:<p>현재 기록의 열량 균형이 유지되면 BMI 25 방향으로 증가하는 결과가 나오지 않습니다.</p>}<p>하루 열량 차이 {balance>0?'+':''}{fmt(balance)} kcal{balanceCapped&&` · 그래프 계산에는 ${projectedBalance>0?'+':''}${fmt(projectedBalance)} kcal까지만 적용`}. 실제 변화와 비만 위험은 개인별로 다릅니다.</p></div>
   <div className="report-chart-card"><h4>섭취와 소비 비교</h4><ChartContainer config={config} className="report-chart"><BarChart data={energyBars} accessibilityLayer><CartesianGrid vertical={false}/><XAxis dataKey="name"/><YAxis unit=" kcal" width={75}/><Tooltip/><Bar name="열량 (kcal)" dataKey="kcal" fill="#16806c" isAnimationActive={false}/></BarChart></ChartContainer></div>
   <div className="report-chart-card"><h4>체중 예상 변화 · 단순 가정</h4><p>파란 선: 음식 + 운동 / 회색 점선: 같은 식사에서 운동만 제외한 비교</p><ChartContainer config={config} className="report-chart"><LineChart data={points} accessibilityLayer><CartesianGrid vertical={false}/><XAxis dataKey="day" unit="일"/><YAxis domain={['auto','auto']} tickFormatter={v=>Number(v).toFixed(1)} unit="kg" width={72}/><Tooltip formatter={v=>`${Number(v).toFixed(2)} kg`} labelFormatter={v=>`${v}일 후`}/><ReferenceLine y={Number(weight)} stroke="#a1aaba"/><Line name="음식 + 운동" dataKey="weight" stroke="#315cdb" strokeWidth={3} dot={false} isAnimationActive={false}/><Line name="운동 제외 비교" dataKey="withoutExercise" stroke="#778399" strokeDasharray="6 4" dot={false} isAnimationActive={false}/></LineChart></ChartContainer>
   <p className="nutrition-notice">실제 체중 예측이나 감량 목표가 아닙니다. 하루 열량 차이를 7,700kcal/kg으로 환산한 최대 4주 산술 시뮬레이션으로, 수분·대사 적응·체지방·근육 변화는 반영하지 않습니다.{balanceCapped&&' 하루 열량 차이가 큰 날은 그래프 계산을 ±1,000kcal로 제한합니다.'}</p>
   <details><summary>주차별 수치 보기</summary><table><caption>동일한 하루가 반복될 때의 체중 가정값</caption><thead><tr><th>기간</th><th>음식 + 운동</th><th>운동 제외 비교</th></tr></thead><tbody>{points.filter(p=>p.day%7===0).map(p=><tr key={p.day}><td>{p.day}일</td><td>{p.weight.toFixed(2)} kg</td><td>{p.withoutExercise.toFixed(2)} kg</td></tr>)}</tbody></table></details></div>
  </>}
  <details className="plain-details"><summary>계산 방법과 출처</summary><p>비만 예방 프로그램의 식을 그대로 적용했습니다. 남성식 BMR = 66.47 + 13.75×체중 + 5×키 − 6.76×나이, 여성식 BMR = 655.1 + 9.56×체중 + 1.85×키 − 4.68×나이. 활동계수는 낮음 1.2, 보통 1.55, 높음 1.725입니다. BMI = 체중÷키(m)², BMI 25까지 필요한 체중 변화는 7,700kcal/kg으로 환산합니다.</p><p>운동 추가 소비량 = (MET − 1) × 체중(kg) × 시간(h). 운동 시간에 해당하는 안정 시 소비를 빼서 일상 소비와의 중복을 줄입니다.</p><p><a href="https://pacompendium.com/conditioning-exercise/" target="_blank" rel="noreferrer">2024 신체활동 Compendium — 운동 유형별 MET</a> · <a href="https://www.niddk.nih.gov/bwp" target="_blank" rel="noreferrer">NIDDK 성인 체중 계획 도구</a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4024447/" target="_blank" rel="noreferrer">고정 열량 환산 모델의 한계</a></p><p>비만 도달일과 체중선은 같은 하루가 계속 반복된다는 산술 결과이며 의료 진단이나 실제 생리 예측이 아닙니다.</p></details>
 </section>;
}
