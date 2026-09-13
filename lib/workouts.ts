export type Workout = {id:string;date:string;exercise:string;reps:number;stretched:boolean};
export function validDate(value:unknown): value is string {
 return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
}
export function validWorkout(value:unknown): value is Workout {
 if(!value||typeof value!=='object')return false;
 const w=value as Workout;
 return typeof w.id==='string'&&/^[a-f0-9-]{36}$/i.test(w.id)&&validDate(w.date)&&typeof w.exercise==='string'&&w.exercise.trim().length>0&&w.exercise.length<=150&&Number.isInteger(w.reps)&&w.reps>0&&w.reps<=100000&&typeof w.stretched==='boolean';
}
