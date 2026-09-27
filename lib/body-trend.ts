// Short-horizon arithmetic scenario, not a physiological weight forecast.
export const activityTypes = [
 {id:'resistance',label:'근력 운동 · 여러 동작, 보통 강도',met:3.5},
 {id:'vigorous',label:'근력 운동 · 높은 강도',met:6},
 {id:'bodyweight',label:'맨몸 운동 · 일반',met:3},
 {id:'bodyweight-hard',label:'맨몸 운동 · 높은 강도',met:6.5},
 {id:'stretch',label:'가벼운 스트레칭',met:2.3},
] as const;
export const dailyActivityLevels = [
 {id:'low',label:'낮음 · 주로 앉아서 생활',factor:1.2},
 {id:'moderate',label:'보통 · 규칙적으로 움직임',factor:1.55},
 {id:'high',label:'높음 · 활동량이 많음',factor:1.725},
] as const;
export type BiologicalSex='male'|'female';
export function bmr(weight:number,height:number,age:number,sex:BiologicalSex){
 if(!Number.isFinite(weight)||weight<20||weight>350||!Number.isFinite(height)||height<100||height>250||!Number.isInteger(age)||age<18||age>100)throw Error('체중·키·나이를 확인하세요.');
 return sex==='male'?66.47+13.75*weight+5*height-6.76*age:655.1+9.56*weight+1.85*height-4.68*age;
}
export function tdee(weight:number,height:number,age:number,sex:BiologicalSex,activityId:string){
 const activity=dailyActivityLevels.find(item=>item.id===activityId);
 if(!activity)throw Error('평소 활동 수준을 선택해 주세요.');
 return bmr(weight,height,age,sex)*activity.factor;
}
export function bmi(weight:number,height:number){
 if(!Number.isFinite(weight)||weight<20||weight>350||!Number.isFinite(height)||height<100||height>250)throw Error('체중·키를 확인하세요.');
 return weight/((height/100)**2);
}
export function obesityProjection(weight:number,height:number,dailyBalance:number){
 const currentBmi=bmi(weight,height),thresholdWeight=25*((height/100)**2);
 if(currentBmi>=25)return {currentBmi,thresholdWeight,days:0,status:'threshold' as const};
 if(!Number.isFinite(dailyBalance)||dailyBalance<=0)return {currentBmi,thresholdWeight,days:null,status:'not-rising' as const};
 return {currentBmi,thresholdWeight,days:(thresholdWeight-weight)*7700/dailyBalance,status:'projected' as const};
}
export function exerciseEnergy(weight:number,minutes:number,met:number){
 if(!Number.isFinite(weight)||weight<20||weight>350||!Number.isFinite(minutes)||minutes<=0||minutes>300||!Number.isFinite(met)||met<1||met>20)throw Error('체중·운동 시간을 확인하세요.');
 return (met-1)*weight*minutes/60;
}
export function scenario(weight:number,intake:number,baseline:number,exercise:number,days:number){
 if(![weight,intake,baseline,exercise,days].every(Number.isFinite)||weight<20||weight>350||intake<1000||baseline<800||baseline>6000||exercise<0||!Number.isInteger(days)||days<1||days>28)throw Error('시뮬레이션 입력 범위가 맞지 않습니다.');
 const balance=intake-baseline-exercise;
 if(Math.abs(balance)>1000)throw Error('하루 열량 차이가 1,000kcal를 넘어 이 단순 모델로 체중을 표시하지 않습니다. 기록과 소비 열량을 확인하세요.');
 return Array.from({length:days+1},(_,day)=>({day,weight:weight+balance*day/7700,withoutExercise:weight+(intake-baseline)*day/7700}));
}
