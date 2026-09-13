import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {portion,totals,energyRatio,searchFoods} from '../lib/nutrition.ts';
const food={id:'a',code:'a',name:'테스트 음식',origin:'가정식',company:'',unit:'g',basis:100,kcal:150,carbs:20,protein:10,fat:5};
const entry=(f,amount)=>({id:'1',date:'2026-09-06',meal:'점심',food:f,amount});
test('scales actual amount and preserves missing nutrients',()=>{
 assert.deepEqual(portion(food,250),{kcal:375,carbs:50,protein:25,fat:12.5});
 assert.equal(portion({...food,carbs:null},250).carbs,null);
 for(const n of [0,-1,NaN,Infinity])assert.throws(()=>portion(food,n));
});
test('sums recorded meals and counts missing nutrients without fabricating a ratio',()=>{
 const items=[entry(food,100),entry({...food,carbs:null},200)];
 assert.deepEqual(totals(items).kcal,{value:450,missing:0});
 assert.deepEqual(totals(items).carbs,{value:20,missing:1});
 assert.equal(energyRatio(items),null);
 assert.equal(energyRatio([]),null);
 const p=energyRatio([entry(food,100)]);
 assert.ok(Math.abs(p[0]-80/165*100)<1e-9);
 assert.ok(Math.abs(p.reduce((a,b)=>a+b,0)-100)<1e-9);
});
test('duplicate names stay selectable and literal queries cannot act as regular expressions',()=>{
 const rows=[food,{...food,id:'b',origin:'외식'}];
 assert.equal(searchFoods(rows,'테스트음식','').length,2);
 assert.equal(searchFoods(rows,'테스트','가정식').length,1);
 assert.equal(searchFoods(rows,'[','').length,0);
});
test('real CSV output preserves eligible records, units and missing values',()=>{
 const foods=JSON.parse(fs.readFileSync(new URL('../public/data/foods.json',import.meta.url),'utf8'));
 assert.equal(foods.length,13026);
 assert.equal(new Set(foods.map(f=>f.id)).size,foods.length);
 assert.equal(foods.filter(f=>f.unit==='ml').length,5914);
 assert.equal(foods.filter(f=>f.unit==='g').length,7112);
 assert.equal(foods.filter(f=>f.carbs===null).length,8278);
 assert.equal(foods.filter(f=>f.fat===null).length,8787);
 assert.equal(foods[0].name,'토스트(식빵)');
 assert.ok(!foods.some(f=>['쌈장','짜장소스','커피_콜드브루 원액'].includes(f.name)));
 assert.ok(!foods.some(f=>!f.company&&f.originalName.includes('_')));
 assert.ok(foods.some(f=>f.name==='로제떡볶이'));
 assert.ok(foods.some(f=>f.originalName==='떡볶이'));
 assert.ok(foods.some(f=>f.name.includes('비빔밥')&&f.origin.includes('재료량')));
 assert.equal(portion(foods[0],200).kcal,168);
 const variants=foods.filter(f=>f.originalName==='떡볶이_소고기');
 assert.equal(variants.length,0);
 assert.ok(variants.every(f=>f.name==='떡볶이'&&f.variant==='소고기'));
 assert.ok(foods.every(f=>!f.name.includes('_')));
});
