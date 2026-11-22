"""What the shipped app does, on the 3,170 benchmark photos: the phone answers when its own rule says 'sure'
(app-path-eval.mjs: top label clearly ahead of the second, not a 'none of these' label); otherwise the photo goes
to Gemini 3.5 Flash-Lite. Scored like the rest of the benchmark (material and Athens bin)."""
import json, sys
V='.'
C=json.load(open(V+'/classes.json')); BIN=C['bin']
items={i['id']:i for i in json.load(open(V+'/manifest.json'))['items']}
MAT={'plastic-bottle':'plastic','can':'metal','paper':'paper','cardboard-box':'cardboard','pizza-box':'cardboard','food-scraps':'food',
     'battery':'battery','power-bank':'battery','car-battery':'battery','glass-bottle':'glass','clothes':'textile','shoes':'textile','home-textiles':'textile'}
phone={r['id']:r for r in map(json.loads,open((sys.argv[1] if len(sys.argv)>1 else 'results/siglip2-app-q4.jsonl')))}
cloud={}
for l in open(V+'/results/google__gemini-3.5-flash-lite.jsonl'):
    r=json.loads(l)
    if r['id'] in items and not (r.get('error') and r['id'] in cloud): cloud[r['id']]=r
ids=[i for i in items if i in phone and i in cloud]
n=len(ids); esc=0; mat=0; binok=0; cost=0.0; phone_sure=0; phone_sure_bin=0
for i in ids:
    t=items[i]['label']; p=phone[i]
    if p['sure']:
        phone_sure+=1; pred=MAT.get(p['first'])
        phone_sure_bin+= pred is not None and BIN[pred]==BIN[t]
    else:
        esc+=1; pred=cloud[i].get('pred'); cost+=cloud[i].get('cost',0) or 0
    mat+= pred==t
    binok+= pred is not None and BIN[pred]==BIN[t]
print(f'photos {n}')
print(f'answered on the phone {phone_sure/n:.1%}; right bin when the phone answers {phone_sure_bin/max(phone_sure,1):.1%}')
print(f'sent to the cloud {esc/n:.1%}')
print(f'app: right material {mat/n:.1%}, right bin {binok/n:.1%}, cost per 1,000 scans ${1000*cost/n:.3f}')
