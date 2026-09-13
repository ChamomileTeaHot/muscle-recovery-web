export type Food = { id:string; code:string; name:string; originalName?:string; variant?:string; origin:string; company:string; unit:'g'|'ml'; basis:number; kcal:number|null; carbs:number|null; protein:number|null; fat:number|null };
export const nutrients = ['kcal','carbs','protein','fat'] as const;
export type Nutrient = typeof nutrients[number];
export type Meal = '아침'|'점심'|'저녁'|'간식';
export type Entry = { id:string; date:string; meal:Meal; food:Food; amount:number };
export function portion(food:Food, amount:number) {
 if(!Number.isFinite(amount)||amount<=0||!Number.isFinite(food.basis)||food.basis<=0) throw new Error('섭취량을 확인해 주세요.');
 return Object.fromEntries(nutrients.map(key=>[key,food[key]===null?null:food[key]*amount/food.basis])) as Record<Nutrient,number|null>;
}
export function totals(entries:Entry[]) {
 const result = Object.fromEntries(nutrients.map(key=>[key,{value:0,missing:0}])) as Record<Nutrient,{value:number;missing:number}>;
 for(const entry of entries){const values=portion(entry.food,entry.amount);for(const key of nutrients){const v=values[key];if(v===null)result[key].missing++;else result[key].value+=v;}}
 return result;
}
export function energyRatio(entries:Entry[]) {
 const t=totals(entries);
 if(['carbs','protein','fat'].some(k=>t[k as Nutrient].missing))return null;
 const values=[t.carbs.value*4,t.protein.value*4,t.fat.value*9];
 const sum=values.reduce((a,b)=>a+b,0);
 return sum>0?values.map(v=>v/sum*100):null;
}
export function searchFoods(foods:Food[],query:string,origin:string) {
 const q=query.trim().toLocaleLowerCase().replace(/\s+/g,'');
 if(!q)return [];
 return foods.filter(f=>(!origin||f.origin===origin)&&f.name.toLocaleLowerCase().replace(/\s+/g,'').includes(q));
}
export function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
