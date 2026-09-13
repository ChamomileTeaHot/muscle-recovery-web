"""Convert the user-supplied nutrition CSV without executing notebook cells."""
import csv
import hashlib
import json
import math
import pathlib
import sys
from collections import Counter

source = pathlib.Path(sys.argv[1])
root = pathlib.Path(__file__).resolve().parents[1]
raw = source.read_bytes()
for encoding in ('utf-8-sig', 'cp949', 'euc-kr'):
    try:
        contents = raw.decode(encoding)
        break
    except UnicodeDecodeError:
        continue
else:
    raise ValueError('Unsupported encoding')

def number(value):
    try:
        result = float(value.replace(',', '').strip())
        return result if math.isfinite(result) and result >= 0 else None
    except (ValueError, AttributeError):
        return None

rows = list(csv.DictReader(contents.splitlines()))
foods = []
excluded = []
clean_rows = []
for index, row in enumerate(rows):
    # Source contains no ingredient/finished-product flag. Use narrow, auditable
    # rules; never match ingredient words inside names of complete dishes.
    reason = None
    if row['식품대분류명'] == '장류, 양념류':
        reason = '소스·장류·양념 단품'
    elif row['식품명'] == '커피_콜드브루 원액':
        reason = '희석용 커피 원액'
    elif '_' in row['식품명'] and row['업체명'].strip() in ('', '해당없음'):
        reason = '업체 상품명이 없는 구성·세부조건별 항목'
    if reason:
        excluded.append(dict(code=row['식품코드'], name=row['식품명'], reason=reason))
        continue
    basis = row['영양성분함량기준량'].strip().lower()
    if basis not in ('100g', '100ml'):
        raise ValueError(f'Unknown basis on row {index + 2}: {basis}')
    original_name = row['식품명'].strip()
    parts = original_name.split('_')
    company = '' if row['업체명'] == '해당없음' else row['업체명'].strip()
    # Branded products retain their product names rather than becoming generic
    # categories such as 'coffee'. Non-branded dishes use the dish name.
    name = ' '.join(p for p in parts[1:] if p != '간편조리세트') if company and len(parts) > 1 else parts[0]
    variant = ' · '.join(parts[1:]) if not company else ''
    clean_rows.append({**row, '식품명': name, '원본식품명': original_name, '세부구성': variant})
    foods.append(dict(
        id=f"{row['식품코드']}:{index}", code=row['식품코드'],
        name=name, originalName=original_name, variant=variant, origin=row['식품기원명'],
        company='' if row['업체명'] == '해당없음' else row['업체명'],
        unit=basis[3:], basis=100,
        kcal=number(row['에너지(kcal)']), carbs=number(row['탄수화물(g)']),
        protein=number(row['단백질(g)']), fat=number(row['지방(g)']),
    ))
output = root / 'public/data/foods.json'
output.write_text(json.dumps(foods, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
with (root / 'foods-preprocessed.csv').open('w', encoding='utf-8-sig', newline='') as handle:
    writer = csv.DictWriter(handle, fieldnames=list(clean_rows[0]))
    writer.writeheader()
    writer.writerows(clean_rows)
report = dict(source=source.name, sha256=hashlib.sha256(raw).hexdigest(), encoding=encoding,
              sourceCount=len(rows), excludedCount=len(excluded), excluded=excluded,
              renamedCount=sum(f['name'] != f['originalName'] for f in foods),
              count=len(foods), units=dict(Counter(f['unit'] for f in foods)),
              missing={k:sum(f[k] is None for f in foods) for k in ('kcal','carbs','protein','fat')},
              note='Original basis units preserved, including unusual 100ml solid-food records. No density conversion.')
(root / 'lib/food-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=True))
