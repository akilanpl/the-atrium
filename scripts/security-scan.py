"""Bounded source/build credential and tracker scan; not a full secret scanner."""
from pathlib import Path
import re, sys
roots=[Path('apps'),Path('packages'),Path('scripts'),Path('docs')]
patterns=[r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',r'\bAKIA[A-Z0-9]{16}\b',r'\bgh[pousr]_[A-Za-z0-9]{30,}\b',r'\bsk_live_[A-Za-z0-9]{20,}\b']
issues=[]
for root in roots:
 for path in root.rglob('*'):
  if path.is_file() and path.suffix=='.map' and 'dist' in path.parts and 'node_modules' not in path.parts: issues.append(str(path)+': sourcemap')
  if not path.is_file() or any(x in path.parts for x in ['node_modules','licenses']) or path.suffix not in ['.ts','.tsx','.js','.mjs','.json','.html','.md','.yml']: continue
  content=path.read_text(errors='replace')
  if any(re.search(p,content) for p in patterns): issues.append(str(path)+': possible credential')
  if 'dist' in path.parts and (path.suffix=='.map' or re.search(r'googletagmanager\.com|google-analytics\.com|api\.segment\.io|api\.mixpanel\.com',content)): issues.append(str(path)+': sourcemap/tracker')
# Do not print matched secret values.
if issues: print('\n'.join(issues));sys.exit(1)
print('Bounded source/build scan passed (no supported credential patterns or tracking hosts).')
