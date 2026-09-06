export type MuscleTarget = { muscleId:string; role:'primary'|'secondary'; setWeight:number };
export type Exercise = {
 id:string; name:string; nameKo:string; category:string; categoryKo:string; equipment:string|null; equipmentKo:string;
 levelKo:string; forceKo:string; mechanicKo:string; primaryMuscles:string[]; secondaryMuscles:string[];
 primaryMusclesKo:string[]; secondaryMusclesKo:string[]; muscleTargets:MuscleTarget[];
 instructions:string[]; instructionsKo:string[]|null; photos:string[]; images:string[]; qualityFlags:string[];
};
export type Stretch = {
 exerciseId:string; nameKo:string; kind:string; defaultEligible:boolean; requirements:string[]; requirementsKo:string[];
 instructionsKo:string[]; targetMuscles:{muscleId:string;role:'primary'|'secondary';matchWeight:number}[];
};
export type Match = {muscleId:string;nameKo:string;points:number;exerciseRoleKo:string;stretchRoleKo:string};
export type Candidate = {stretch:Stretch;matches:Match[];score:number};
export type Recommendations = {items:Candidate[];uncovered:{muscleId:string;nameKo:string;reasonKo:string}[];message:string};
export const representativeIds = ['Barbell_Squat','Barbell_Bench_Press_-_Medium_Grip','Barbell_Deadlift','Pushups','Dumbbell_Shoulder_Press','Pullups','Plank','Dumbbell_Bicep_Curl'];
export function normalizeName(text:string):string { return text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,''); }

// SequenceMatcher-style longest matching blocks; exercise names are short (<200 characters).
export function similarity(a:string,b:string):number {
 if(!a.length&&!b.length)return 1;
 function matching(alo:number,ahi:number,blo:number,bhi:number):number {
  let size=0,ai=alo,bi=blo; let prev=new Map<number,number>();
  for(let i=alo;i<ahi;i++){
   const row=new Map<number,number>();
   for(let j=blo;j<bhi;j++) if(a[i]===b[j]){
    const count=(prev.get(j-1)||0)+1;row.set(j,count);
    if(count>size){size=count;ai=i-count+1;bi=j-count+1;}
   }
   prev=row;
  }
  if(!size)return 0;
  return size+matching(alo,ai,blo,bi)+matching(ai+size,ahi,bi+size,bhi);
 }
 return 2*matching(0,a.length,0,b.length)/(a.length+b.length);
}
export function searchExercises(records:Exercise[],query:string):{mode:string;items:Exercise[]} {
 const q=normalizeName(query);
 if(!q)return {mode:'featured',items:representativeIds.map(id=>records.find(e=>e.id===id)).filter((e):e is Exercise=>!!e)};
 const indexed=records.map(e=>({e,names:[e.nameKo,e.name,e.id].map(normalizeName)}));
 const exact=indexed.filter(x=>x.names.includes(q)).map(x=>x.e);
 if(exact.length)return {mode:'exact',items:exact};
 const partial=indexed.filter(x=>x.names.some(n=>n.includes(q))).map(x=>x.e);
 if(partial.length)return {mode:'partial',items:partial.sort((a,b)=>a.nameKo.length-b.nameKo.length||compare(a.nameKo,b.nameKo))};
 const suggestions=indexed.map(x=>({...x,score:Math.max(...x.names.map(n=>similarity(q,n)))})).filter(x=>x.score>=.62).sort((a,b)=>b.score-a.score||compare(a.e.id,b.e.id)).slice(0,10).map(x=>x.e);
 return {mode:suggestions.length?'suggestion':'none',items:suggestions};
}
function compare(a:string,b:string){return a<b?-1:a>b?1:0;}
export function recommend(exercise:Exercise|null,stretches:Stretch[],available:string[]=[],limit=3):Recommendations {
 if(!exercise)return {items:[],uncovered:[],message:'먼저 운동을 선택해 주세요.'};
 if(exercise.category==='stretching')return {items:[],uncovered:[],message:'수행한 운동을 선택하면 관련 스트레칭을 찾을 수 있어요.'};
 if(!Number.isInteger(limit)||limit<1||limit>10)throw new Error('추천 개수는 1~10이어야 합니다.');
 const primary=new Set(exercise.primaryMuscles);
 const secondary=new Set(exercise.secondaryMuscles.filter(m=>!primary.has(m)));
 const priority=new Map([...primary].map(m=>[m,2]));
 secondary.forEach(m=>priority.set(m,1));
 const names=new Map(exercise.muscleTargets.map((t,i)=>[t.muscleId,[...exercise.primaryMusclesKo,...exercise.secondaryMusclesKo][i]]));
 const candidates:Candidate[]=[];
 for(const stretch of stretches){
  if(!stretch.defaultEligible||stretch.kind!=='static'||!stretch.instructionsKo.length||stretch.exerciseId===exercise.id||stretch.requirements.some(r=>!available.includes(r)))continue;
  const matches:Match[]=stretch.targetMuscles.filter(t=>priority.has(t.muscleId)).map(t=>({muscleId:t.muscleId,nameKo:names.get(t.muscleId)!,points:priority.get(t.muscleId)!*(t.role==='primary'?2:1),exerciseRoleKo:primary.has(t.muscleId)?'주동근':'보조근',stretchRoleKo:t.role==='primary'?'주동근':'보조근'}));
  if(matches.length)candidates.push({stretch,matches,score:matches.reduce((sum,m)=>sum+m.points,0)});
 }
 const eligible=new Set(candidates.flatMap(c=>c.matches.map(m=>m.muscleId)));
 const covered=new Set<string>();const chosen:Candidate[]=[];
 const fresh=(c:Candidate)=>c.matches.filter(m=>!covered.has(m.muscleId)).reduce((s,m)=>s+m.points,0);
 while(candidates.length&&chosen.length<limit){
  candidates.sort((a,b)=>fresh(b)-fresh(a)||b.score-a.score||a.stretch.requirements.length-b.stretch.requirements.length||compare(a.stretch.exerciseId,b.stretch.exerciseId));
  const best=candidates.shift()!;
  if(chosen.length&&!fresh(best))break;
  best.matches.forEach(m=>covered.add(m.muscleId));chosen.push(best);
 }
 return {items:chosen,uncovered:[...priority.keys()].sort(compare).filter(m=>!covered.has(m)).map(m=>({muscleId:m,nameKo:names.get(m)!,reasonKo:eligible.has(m)?'추천 개수를 늘리면 확인할 수 있어요.':'지금 조건에 맞는 기본 추천 동작이 없어요.'})),message:chosen.length?'원하는 스트레칭을 선택해 주세요.':'조건에 맞는 스트레칭이 없어요. 보유 도구를 확인하거나 다른 운동을 선택해 주세요.'};
}
