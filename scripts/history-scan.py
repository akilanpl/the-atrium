"""Run pinned Gitleaks over all reachable Git history; never print secret values."""
from pathlib import Path
import hashlib
import io
import platform
import subprocess
import tarfile
import urllib.request

VERSION = '8.30.1'
ARCHIVES = {
    ('Linux', 'x86_64'): ('linux_x64', '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb'),
    ('Darwin', 'arm64'): ('darwin_arm64', 'b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5'),
}
key = (platform.system(), platform.machine())
if key not in ARCHIVES:
    raise SystemExit('BLOCKED: install Gitleaks 8.30.1 for this platform and run gitleaks git . --redact')
subprocess.run(['git', 'rev-parse', '--show-toplevel'], check=True, stdout=subprocess.DEVNULL)
if subprocess.check_output(['git', 'rev-parse', '--is-shallow-repository'], text=True).strip() == 'true':
    raise SystemExit('BLOCKED: fetch complete authorized history before scanning (git fetch --unshallow).')
name, digest = ARCHIVES[key]
work = Path('work/security-tools')
work.mkdir(parents=True, exist_ok=True)
archive = work / f'gitleaks_{VERSION}_{name}.tar.gz'
if not archive.exists():
    url = f'https://github.com/gitleaks/gitleaks/releases/download/v{VERSION}/{archive.name}'
    with urllib.request.urlopen(url, timeout=60) as response:
        archive.write_bytes(response.read())
data = archive.read_bytes()
if hashlib.sha256(data).hexdigest() != digest:
    raise SystemExit('Gitleaks release checksum mismatch; refusing execution.')
# Extract only the expected executable, never archive paths/symlinks.
with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as bundle:
    executable = bundle.extractfile('gitleaks')
    if executable is None:
        raise SystemExit('Missing Gitleaks executable.')
    binary = work / 'gitleaks'
    binary.write_bytes(executable.read())
    binary.chmod(0o755)
raise SystemExit(subprocess.run([str(binary), 'git', '.', '--redact', '--report-format', 'json', '--report-path', 'work/history-secrets.json']).returncode)
