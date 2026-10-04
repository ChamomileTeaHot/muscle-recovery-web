import test from 'node:test';
import assert from 'node:assert/strict';
import {exerciseEnergy,scenario} from '../lib/body-trend.ts';
test('net exercise energy excludes resting expenditure and rejects missing duration',()=>{
 assert.equal(exerciseEnergy(60,60,3.5),150);
 assert.equal(exerciseEnergy(60,30,3),60);
 for(const n of [0,-1,NaN,301])assert.throws(()=>exerciseEnergy(60,n,3.5));
});
test('comparison uses same intake and baseline, exercise alone changes the second curve',()=>{
 const rows=scenario(70,2200,2200,150,14);
 assert.equal(rows[0].weight,70);
 assert.equal(rows[14].withoutExercise,70);
 assert.ok(Math.abs(rows[14].weight-(70-150*14/7700))<1e-9);
 assert.equal(scenario(70,2200,2200,0,7)[7].weight,70);
});
test('rejects low intake, nonfinite inputs and long-term extrapolation',()=>{
 for(const args of [[70,900,2000,0,14],[70,2000,2000,0,365],[NaN,2000,2000,0,14]])assert.throws(()=>scenario(...args));
});
test('existing adult model caps both comparison lines at a daily 1000 kcal difference',()=>{
 assert.ok(Math.abs(scenario(70,1500,3000,0,14).at(-1).weight-(70-1000*14/7700))<1e-9);
 assert.ok(Math.abs(scenario(70,5000,2000,0,14).at(-1).withoutExercise-(70+1000*14/7700))<1e-9);
});
