import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {recommend, searchExercises, normalizeName} from '../lib/recovery.ts';
const data=JSON.parse(fs.readFileSync('public/data/exercises.json','utf8'));
const stretches=JSON.parse(fs.readFileSync('public/data/stretches.json','utf8'));
const reference=JSON.parse(fs.readFileSync('tests/reference.json','utf8'));
test('Port matches 44 verified notebook scenarios exactly',()=>{
 for(const c of reference){
  const result=recommend(data.find(e=>e.id===c.exerciseId)||null,stretches,c.equipment,c.limit);
  assert.deepEqual(result.items.map(item=>({id:item.stretch.exerciseId,score:item.score,matches:item.matches})),c.items,JSON.stringify(c));
  assert.deepEqual(result.uncovered.map(m=>m.muscleId).sort(),c.uncovered);
 }
});
test('All notebook records retained and all local photos exist',()=>{
 assert.equal(data.length,876);assert.equal(stretches.length,123);
 assert.equal(stretches.filter(s=>s.defaultEligible).length,30);
 let count=0;
 for(const e of data)for(const image of e.photos){assert.ok(fs.existsSync(path.join('public',image)),image);count++;}
 assert.equal(count,1746);
});
test('Korean spaces, English case, and IDs find exact exercises',()=>{
 for(const query of ['바벨데드리프트','바벨 데드리프트','BARBELL DEADLIFT','Barbell_Deadlift'])assert.equal(searchExercises(data,query).items[0].id,'Barbell_Deadlift');
 assert.equal(normalizeName(' ＰＵＳＨＵＰＳ '),'pushups');
});
test('Partial matches and typo suggestions do not silently change selections',()=>{
 assert.equal(searchExercises(data,'벤치프레스').mode,'partial');
 assert.ok(searchExercises(data,'벤치프레스').items.length>1);
 assert.equal(searchExercises(data,'barbel deadlift').mode,'suggestion');
 assert.equal(searchExercises(data,'zzzzzzzzzzzzzzzzzzzzzz').mode,'none');
 assert.equal(searchExercises(data,'').items.length,8);
});
test('Every workout recommendation has a real shared muscle and no unsupported tool',()=>{
 for(const e of data){
  const result=recommend(e,stretches,[],3);const covered=new Set();
  for(const c of result.items){
   assert.equal(c.stretch.kind,'static');assert.ok(c.stretch.defaultEligible);assert.equal(c.stretch.requirements.length,0);
   const muscleIds=c.matches.map(m=>m.muscleId);
   assert.ok(muscleIds.some(m=>!covered.has(m)));
   for(const m of muscleIds){assert.ok([...e.primaryMuscles,...e.secondaryMuscles].includes(m));covered.add(m);}
  }
  assert.ok(result.items.length<=3);
 }
});
test('No fabricated load; unknown muscles and missing descriptions remain explicit',()=>{
 const r=recommend(data.find(e=>e.id==='Isometric_Neck_Exercise_-_Front_And_Back'),stretches,[],10);
 assert.ok(r.uncovered.some(m=>m.muscleId==='neck'));
 assert.equal(data.filter(e=>!e.instructionsKo).length,753);
 assert.equal(data.filter(e=>!e.photos.length).length,3);
 assert.ok(data.some(e=>e.equipment===null&&e.equipmentKo!=='맨몸'));
});
