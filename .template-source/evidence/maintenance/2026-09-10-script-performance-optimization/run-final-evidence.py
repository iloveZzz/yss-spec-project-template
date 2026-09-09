from pathlib import Path
import json
from measure import run
OUT=Path(__file__).resolve().parent
for job in json.loads((OUT/'recovery-final-plan.json').read_text()):
 rows=run(**job)
 if job['label'].startswith('validation') and any(row['exit_code']!=0 or row['timeout'] for row in rows):raise SystemExit(1)
