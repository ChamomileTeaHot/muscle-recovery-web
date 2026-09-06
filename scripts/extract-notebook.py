"""Read literal embedded datasets only; never execute notebook cells or saved outputs."""
import ast,base64,hashlib,json,pathlib,zlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
source=pathlib.Path(r'C:\Users\User\Downloads\근육_회복_프로그램_데모.ipynb')
nb=json.loads(source.read_text(encoding='utf-8'))
literal={}
functions={}
for cell in nb['cells']:
    if cell['cell_type']!='code': continue
    tree=ast.parse(''.join(cell['source']))
    for node in tree.body:
        if isinstance(node,ast.Assign) and isinstance(node.value,ast.Constant):
            for t in node.targets:
                if isinstance(t,ast.Name) and t.id in ['_DATA_BASE64','_STRETCH_BASE64']:
                    literal[t.id]=ast.literal_eval(node.value)
        if isinstance(node,ast.FunctionDef): functions[node.name]=ast.dump(node)
data=json.loads(zlib.decompress(base64.b64decode(literal['_DATA_BASE64'])))
stretches=json.loads(zlib.decompress(base64.b64decode(literal['_STRETCH_BASE64'])))
assert len(data)==876 and len(stretches)==123
for row in data: row['photos']=['/images/'+str(pathlib.PurePosixPath(p).with_suffix('.webp')) for p in row['images']]
out=ROOT/'public/data';out.mkdir(parents=True,exist_ok=True)
for filename,value in [('exercises.json',data),('stretches.json',stretches)]:
    (out/filename).write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
reference=ast.parse((ROOT.parent/'colab-exercise-demo/stretch_demo.py').read_text(encoding='utf-8'))
ref=next(ast.dump(n) for n in reference.body if isinstance(n,ast.FunctionDef) and n.name=='recommend_for_exercise')
metadata={'notebookSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'exerciseCount':len(data),'stretchCount':len(stretches),'notebookAlgorithmMatchesReference':functions['recommend_for_exercise']==ref}
(ROOT/'lib/notebook-source.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
print(metadata)
