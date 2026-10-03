#!/usr/bin/env python3
"""Prepare only an ISOLATED Desk clone for public synthetic captures.
No application views, production runtime, broker state or credentials are changed.
"""
import json, random, re, sys
from pathlib import Path
root=Path(sys.argv[1]).resolve()
if not (root/'simulation_fx.go').is_file(): raise SystemExit('Expected an isolated Desk source clone')
for p in [root/'testdata/simulation-book.json',*root.glob('simulation*.go')]:
    if p.name.endswith('_test.go'): continue
    s=p.read_text()
    for a,b in [('CCC','AMD'),('DDD','MSFT'),('SYNX','SPY')]: s=re.sub(r'\b'+a+r'\b',b,s)
    if p.name=='simulation_history.go': s=s.replace('"SPY": 558.23, "SPY": 558.23,','"SPY": 558.23,')
    if p.name=='simulation_fx.go': s=s.replace('BaseCurrency: "EUR"','BaseCurrency: "USD"')
    if p.name=='simulation_observe.go':
        for name in ('simulationFX','simulationPerformance'):
            s=s.replace(name+'(now)',name+'(time.Date(2026, 10, 2, 14, 20, 0, 0, time.UTC))')
    p.write_text(s)
p=root/'testdata/simulation-book.json';data=json.loads(p.read_text());rng=random.Random(20261003)
def vary(o):
    if isinstance(o,dict):
        for k,v in o.items():
            if k in ('points','history','series') and isinstance(v,list) and len(v)>12 and isinstance(v[0],dict):
                field=next((f for f in ('value','price','close') if isinstance(v[0].get(f),(int,float))),None)
                if field:
                    n=len(v);steps=[rng.gauss(0,1) for _ in v];total=sum(steps);run=0;scale=abs(v[0][field])*.0013
                    for i,row in enumerate(v):
                        run+=steps[i]
                        if isinstance(row.get(field),(int,float)) and 0<i<n-1: row[field]=round(row[field]+scale*(run-(i+1)/n*total),4)
            vary(v)
    elif isinstance(o,list):
        for v in o:vary(v)
vary(data);p.write_text(json.dumps(data,indent=2)+'\n')
print('Synthetic fixture prepared. Build this clone and run only with -simulate.')
