'use client';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { totals, type Entry } from '@/lib/nutrition';
import { type Workout } from '@/lib/workouts';
import { loadWorkouts } from '@/lib/workout-storage';
import { youthGrowthScenario, type GrowthSex } from '@/lib/youth-growth';

const fmt = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
const config = { weight: { label: '성장 참고선', color: '#315cdb' }, measured: { label: '입력한 체중', color: '#16806c' }, kcal: { label: '기록된 섭취량', color: '#315cdb' } };

export default function YouthGrowthPanel({ entries, date }: { entries: Entry[]; date: string }) {
  const [years, setYears] = useState(''), [months, setMonths] = useState(0);
  const [height, setHeight] = useState(''), [weight, setWeight] = useState('');
  const [sex, setSex] = useState<GrowthSex | ''>(''), [horizon, setHorizon] = useState(6);
  const [workouts, setWorkouts] = useState<Workout[]>([]), [status, setStatus] = useState('loading'), [retry, setRetry] = useState(0);
  useEffect(() => {
    const refresh = () => setRetry(n => n + 1);
    window.addEventListener('workouts-updated', refresh);
    return () => window.removeEventListener('workouts-updated', refresh);
  }, []);
  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    setWorkouts([]); setStatus('loading');
    loadWorkouts(date, controller.signal)
      .then(result => { setWorkouts(result.rows); setStatus('ready'); })
      .catch(e => { if (e.name !== 'AbortError') setStatus('error'); });
    return () => controller.abort();
  }, [date, retry]);

  let result: ReturnType<typeof youthGrowthScenario> | null = null;
  let reason = '기준일의 나이·키·체중과 성장 자료 성별을 입력하면 그래프가 나타나요.';
  if (years && height && weight && sex) {
    try { result = youthGrowthScenario({ years: Number(years), months, height: Number(height), weight: Number(weight), sex, horizon }); reason = ''; }
    catch (e) { reason = e instanceof Error ? e.message : '입력값을 확인해 주세요.'; }
  }
  const daily = entries.filter(e => e.date === date), total = totals(daily);
  const meals = ['아침', '점심', '저녁', '간식'].map(name => ({ name, kcal: totals(daily.filter(e => e.meal === name)).kcal.value }));
  const last = result?.points.at(-1);
  return <section className="body-report youth-report" aria-labelledby="youth-report-title">
    <div className="intro"><p className="eyebrow">{date} 기준 · 어린이·청소년</p><h3 id="youth-report-title">성장에 따른 체중 변화 참고선</h3><p>현재의 키·BMI 성장 위치가 앞으로도 유지된다고 가정한 그래프예요.</p></div>
    <p className="nutrition-notice">WHO 성장 기준표에 앱의 가정을 적용한 참고선입니다. 개인의 실제 미래 체중이나 목표 체중을 뜻하지 않아요. 사춘기 시기와 성장 속도에 따라 실제 변화는 달라집니다.</p>
    <div className="report-inputs">
      <label>기준일의 나이 (만 나이)<input type="number" min="5" max="17" step="1" value={years} placeholder="예: 14" onChange={e => setYears(e.target.value)}/></label>
      <label>생일 이후 지난 개월 수<NativeSelect value={months} onChange={e => setMonths(Number(e.target.value))}>{Array.from({ length: 12 }, (_, n) => <option key={n} value={n}>{n}개월</option>)}</NativeSelect></label>
      <label>기준일의 키 (cm)<input type="number" min="50" max="250" step="0.1" value={height} placeholder="예: 160" onChange={e => setHeight(e.target.value)}/></label>
      <label>기준일의 체중 (kg)<input type="number" min="5" max="350" step="0.1" value={weight} placeholder="예: 50" onChange={e => setWeight(e.target.value)}/></label>
      <label>성장 자료 성별<NativeSelect value={sex} onChange={e => setSex(e.target.value as GrowthSex | '')}><option value="">선택해 주세요</option><option value="male">남아·남자 청소년</option><option value="female">여아·여자 청소년</option></NativeSelect></label>
      <label>성장 참고 기간<NativeSelect value={horizon} onChange={e => setHorizon(Number(e.target.value))}><option value={3}>3개월</option><option value={6}>6개월</option><option value={12}>12개월</option></NativeSelect></label>
    </div>
    <p className="nutrition-note">만 5세 1개월~17세 11개월용입니다. 예: 만 14세 생일이 3개월 지났으면 14세·3개월을 선택하세요. 위 식사 날짜가 기준일이며, 날짜를 바꿨다면 그날의 측정값인지 확인하세요. 이 입력은 새로고침하면 사라져요.</p>
    {reason ? <p className="nutrition-notice" role="status">{reason}</p> : result && last && <>
      <div className="report-stats"><div><span>기준일에 입력한 체중</span><strong>{fmt(Number(weight))} kg</strong></div><div><span>{horizon}개월 후 성장 참고값</span><strong>{fmt(last.weight)} kg</strong></div></div>
      <div className="report-chart-card"><h4>체중 변화 · 같은 성장 위치를 유지할 때</h4><p>초록 점은 입력한 체중, 파란 점선은 가정에 따른 성장 참고선이에요.</p>
        <ChartContainer config={config} className="report-chart" aria-label="현재 측정 체중과 같은 성장 위치를 유지한다고 가정한 미래 체중 참고선">
          <LineChart data={result.points} accessibilityLayer><CartesianGrid vertical={false}/><XAxis dataKey="month" unit="개월" allowDecimals={false}/><YAxis domain={['auto', 'auto']} unit="kg" width={72} tickFormatter={v => Number(v).toFixed(1)}/><Tooltip formatter={v => `${Number(v).toFixed(1)} kg`} labelFormatter={v => Number(v) === 0 ? '기준일' : `${v}개월 후`}/><Line dataKey="weight" name="성장 참고선 (가정)" stroke="#315cdb" strokeWidth={3} strokeDasharray="6 4" dot={false} isAnimationActive={false}/><Line dataKey="measured" name="입력한 체중" stroke="#16806c" strokeWidth={0} dot={{ r: 6, fill: '#16806c' }} isAnimationActive={false}/></LineChart>
        </ChartContainer>
        <details><summary>개월별 참고값 보기</summary><table><caption>키·BMI 성장 위치가 유지된다는 가정의 수치</caption><thead><tr><th>기간</th><th>체중 참고값</th><th>키 참고값</th></tr></thead><tbody>{result.points.map(p => <tr key={p.month}><td>{p.month === 0 ? '기준일' : `${p.month}개월 후`}</td><td>{fmt(p.weight)} kg</td><td>{fmt(p.height)} cm</td></tr>)}</tbody></table></details>
      </div>
    </>}
    <div className="report-chart-card"><h4>같은 날의 음식·운동 기록</h4><p>식사와 운동은 생활 기록으로 함께 확인해요. 기록한 열량을 체중 변화로 환산하지 않으며, 음식·운동 입력 여부는 위 참고선 표시에 영향을 주지 않아요.</p>
      {daily.length ? <><ChartContainer config={config} className="report-chart" aria-label="끼니별 기록된 섭취 열량"><BarChart data={meals} accessibilityLayer><CartesianGrid vertical={false}/><XAxis dataKey="name"/><YAxis unit=" kcal" width={75}/><Tooltip/><Bar dataKey="kcal" name="기록된 섭취 열량 (kcal)" fill="#315cdb" radius={[6,6,0,0]} isAnimationActive={false}/></BarChart></ChartContainer><p>음식 {daily.length}개 · 기록된 섭취량 {fmt(total.kcal.value)} kcal · 단백질 {fmt(total.protein.value)} g</p>{(total.kcal.missing > 0 || total.protein.missing > 0) && <p className="nutrition-note">영양정보가 없는 항목은 제외한 합계입니다.</p>}<p className="nutrition-note">미기록 끼니의 섭취 여부는 알 수 없어요. 간식은 먹었을 때만 입력하세요.</p></> : <p>선택한 날짜에 기록된 음식이 없어요. 음식을 추가하면 끼니별 그래프가 나타나요.</p>}
      <h4>운동 기록</h4>{status === 'loading' ? <p role="status">운동 기록을 불러오는 중이에요.</p> : status === 'error' ? <><p role="status">운동 기록을 불러오지 못했어요. 성장 참고선은 계속 사용할 수 있어요.</p><Button variant="outline" onClick={() => setRetry(n => n + 1)}>운동 기록 다시 불러오기</Button></> : workouts.length ? <ul className="youth-workouts">{workouts.map(w => <li key={w.id}><strong>{w.exercise}</strong> · {w.reps}회 · {w.stretched ? '스트레칭 완료' : '스트레칭 미완료'}</li>)}</ul> : <p>선택한 날짜에 저장된 운동이 없어요.</p>}
    </div>
    <details className="plain-details"><summary>성장 참고선 계산 방법과 출처</summary><p>WHO 2007의 성별·월령별 신장과 BMI LMS 자료를 사용합니다. 기준일의 키와 BMI를 각각 z점수로 바꾸고, 두 z점수가 앞으로 같다고 가정해 매달 키와 BMI를 계산합니다. 체중 참고값 = 그달 BMI 참고값 × 키 참고값(m)²입니다. 월령은 입력한 만 나이×12 + 추가 개월 수이며, 일 단위 차이는 반영하지 않습니다.</p><p>WHO는 61~228개월의 성장 비교 자료를 제공합니다. 이 앱의 미래 참고선은 WHO가 검증한 개인 예측 모델이 아닙니다. 성장 위치 유지 가정에는 식사량·운동량·사춘기 시기·질환·개인의 성장 속도가 반영되지 않습니다. 현재 키 또는 BMI z점수가 ±3을 벗어나면 값을 잘라 맞추지 않고 참고선 계산을 중단합니다.</p><p>국제 성장 참고 자료이며 한국인 전용 평가가 아닙니다. 성장 상태가 걱정된다면 보호자와 함께 의료진에게 실제 측정 기록을 확인받으세요.</p><p><a href="https://www.who.int/tools/growth-reference-data-for-5to19-years/indicators/height-for-age" target="_blank" rel="noreferrer">WHO 신장 성장 자료</a> · <a href="https://www.who.int/tools/growth-reference-data-for-5to19-years/indicators/bmi-for-age" target="_blank" rel="noreferrer">WHO BMI 성장 자료</a> · <a href="https://www.who.int/docs/default-source/child-growth/growth-reference-5-19-years/computation.pdf" target="_blank" rel="noreferrer">WHO LMS 계산 방법</a></p></details>
  </section>;
}
