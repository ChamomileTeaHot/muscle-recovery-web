"""Extract WHO 2007 published monthly LMS parameters. Run with openpyxl installed."""
import hashlib
import io
import json
from pathlib import Path
from urllib.request import Request, urlopen
from openpyxl import load_workbook

BASE = 'https://cdn.who.int/media/docs/default-source/child-growth/growth-reference-5-19-years/'
data = {'source': 'WHO 2007 growth reference', 'sources': [], 'male': {}, 'female': {}}
for sex, label in [('male', 'boys'), ('female', 'girls')]:
    for indicator, folder, prefix in [('height', 'height-for-age', 'hfa'), ('bmi', 'bmi-for-age', 'bmi')]:
        url = f'{BASE}{folder}-%285-19-years%29/{prefix}-{label}-z-who-2007-exp.xlsx'
        with urlopen(Request(url, headers={'User-Agent': 'RecoveryGrowthReference/1.0'}), timeout=60) as response:
            raw = response.read()
        sheet = load_workbook(io.BytesIO(raw), read_only=True, data_only=True).active
        rows = list(sheet.values)
        header = [str(value).strip().lower() for value in rows[0]]
        columns = [header.index(name) for name in ['month', 'l', 'm', 's']]
        values = [[row[col] for col in columns] for row in rows[1:] if isinstance(row[columns[0]], (int, float))]
        assert [row[0] for row in values] == list(range(61, 229)), (sex, indicator)
        data[sex][indicator] = values
        data['sources'].append({'sex': sex, 'indicator': indicator, 'url': url, 'sha256': hashlib.sha256(raw).hexdigest()})
target = Path(__file__).resolve().parents[1] / 'lib' / 'growth-reference.json'
target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Imported four WHO LMS tables, 168 months each:', target)
