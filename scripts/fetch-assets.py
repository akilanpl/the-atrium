"""Reproducible optional asset-source fetch. The game already includes prepared assets."""
import pathlib,json,hashlib,urllib.request,concurrent.futures
manifest=json.loads(pathlib.Path('scripts/assets-manifest.json').read_text())
def fetch(item):
 path=pathlib.Path(item['path']);path.parent.mkdir(parents=True,exist_ok=True)
 if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest()==item['sha256']:return str(path)+' cached'
 with urllib.request.urlopen(item['url']) as response: data=response.read()
 if hashlib.sha256(data).hexdigest()!=item['sha256']:raise ValueError('Source changed or download incomplete: '+item['url'])
 path.write_bytes(data);return str(path)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for result in pool.map(fetch,manifest):print(result)
