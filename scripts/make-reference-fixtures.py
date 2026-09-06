import json,pathlib,sys
root=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root.parent/'colab-exercise-demo'))
from demo_core import ExerciseDB
from stretch_demo import recommend_for_exercise
data=json.loads((root/'public/data/exercises.json').read_text(encoding='utf-8'))
stretches=json.loads((root/'public/data/stretches.json').read_text(encoding='utf-8'))
db=ExerciseDB(data)
cases=[]
for key in [None,'Barbell_Bench_Press_-_Medium_Grip','Barbell_Squat','Barbell_Deadlift','Pushups','Dumbbell_Shoulder_Press','Plank','Running_Treadmill','Barbell_Shrug','Isometric_Neck_Exercise_-_Front_And_Back','Triceps_Stretch']:
 for equipment,limit in [((),3),(('wall','strap','chair'),3),((),1),(('wall','strap','chair'),10)]:
  result=recommend_for_exercise(db,stretches,key,equipment,limit)
  cases.append({'exerciseId':key,'equipment':equipment,'limit':limit,'items':[{'id':c['stretch']['exerciseId'],'score':c['score'],'matches':c['matches']} for c in result['items']],'uncovered':sorted(m['muscleId'] for m in result['uncovered'])})
target=root/'tests/reference.json';target.parent.mkdir(exist_ok=True)
target.write_text(json.dumps(cases,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('Notebook reference cases:',len(cases))
