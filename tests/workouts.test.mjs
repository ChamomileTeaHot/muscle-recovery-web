import test from 'node:test';
import assert from 'node:assert/strict';
import {validDate,validWorkout} from '../lib/workouts.ts';
test('workout input rejects impossible dates, fractional counts and missing fields',()=>{
 const row={id:crypto.randomUUID(),date:'2026-09-13',exercise:'스쿼트',reps:30,stretched:false};
 assert.ok(validWorkout(row));
 assert.ok(validDate('2024-02-29'));
 for(const patch of [{date:'2026-02-29'},{date:''},{reps:0},{reps:1.5},{reps:100001},{exercise:' '},{stretched:'false'}])assert.equal(validWorkout({...row,...patch}),false);
});
