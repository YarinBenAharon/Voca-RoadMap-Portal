"""Prove that hosting the roadmap did not change its design.

The portal is built by slicing the standalone editor apart, not by rewriting
it. This script re-cuts those slices from the frozen original and compares
them byte for byte with what the site actually serves. If it passes, the
stylesheet, the board runtime and the markup helpers running in production are
character-identical to the ones in the file the roadmap was designed in, and
the bundled roadmap content matches too.

Run from the repository root:  python tools/verify_shared_assets.py
"""

import json
import pathlib
import re
import subprocess
import sys

# The frozen original. Bump this, and the line numbers below, whenever a new
# standalone editor supersedes it.
ORIGINAL = pathlib.Path('Voca_CIC_Release_Roadmap_EDITOR-4.html')

SLICES = [
    ('src/shared/base.css', 'stylesheet',    138, 421),
    ('src/shared/board.js', 'board runtime', 573, 730),
]
HELPERS = (424, 570)            # render.js starts with these, then adds buildBodyHTML
SEED    = (1012, 1800)          # the DEFAULT_DATA object literal

# Lines the slices are cut at, and what must be sitting on them.
ANCHORS = [
    (137, 'const BASE_CSS = `'),
    (422, '`;'),
    (572, 'const BOARD_JS = `'),
    (731, '`;'),
    (1012, 'const DEFAULT_DATA = {'),
    (1800, '};'),
]


def main():
    if not ORIGINAL.is_file():
        sys.exit('Frozen original not found: %s' % ORIGINAL)

    src = ORIGINAL.read_text(encoding='utf-8').split('\n')
    cut = lambda a, b: '\n'.join(src[a - 1:b])
    failures = []

    def check(label, ok):
        print('  %s  %s' % ('ok  ' if ok else 'FAIL', label))
        if not ok:
            failures.append(label)

    print('Anchors still on the expected lines:')
    for ln, expect in ANCHORS:
        check('line %-5d %s' % (ln, expect), src[ln - 1].strip() == expect)

    print('Shared assets against %s:' % ORIGINAL.name)
    for path, label, first, last in SLICES:
        p = pathlib.Path(path)
        if not p.is_file():
            check('%-14s %s (missing)' % (label, path), False)
            continue
        check('%-14s %s' % (label, path),
              p.read_text(encoding='utf-8').rstrip('\n') == cut(first, last).rstrip('\n'))

    render = pathlib.Path('src/shared/render.js')
    rendered = render.read_text(encoding='utf-8') if render.is_file() else ''
    check('%-14s %s' % ('markup helpers', render), rendered.startswith(cut(*HELPERS)))

    print('Bundled roadmap content:')
    seed_file = pathlib.Path('api/shared/seed.json')
    try:
        raw = cut(*SEED).strip()
        want = json.loads(raw[len('const DEFAULT_DATA = '):-1])
        got  = json.loads(seed_file.read_text(encoding='utf-8'))
        check('seed.json matches DEFAULT_DATA', want == got)
        print('        %d release trains, %d capabilities'
              % (len(got['trains']), sum(len(t['items']) for t in got['trains'])))
    except Exception as err:                      # noqa: BLE001 - reported, not raised
        check('seed.json readable (%s)' % err, False)

    # The internal item fields (br, requestor, pm) are shown read-only to
    # viewers, so the payload carries them. That is safe only while the
    # roadmap API answers AudioCodes accounts and editors alone.
    print('Internal fields kept inside AudioCodes:')
    try:
        stripper = pathlib.Path('api/shared/publicView.js').read_text(encoding='utf-8')
        api = pathlib.Path('api/roadmap/index.js').read_text(encoding='utf-8')
        # every data- attribute render.js emits only when editable is true
        gated = set(re.findall(r'data-[a-z]+="\$\{esc\(it\.([A-Za-z0-9_]+)',
                               re.search(r'\$\{editable \?\s*`([^`]*)`', rendered).group(1)))
        check('render.js gates %s' % (sorted(gated) or 'nothing'), bool(gated))
        check('api/roadmap refuses non-AudioCodes accounts',
              'auth.isAudioCodes(req)' in api and "'audiocodes-only'" in api)
        check('publicView drops internal regions',
              "publish !== false" in stripper)
    except Exception as err:                      # noqa: BLE001 - reported, not raised
        check('payload check (%s)' % err, False)

    # The public page has no sign-in, so its feed must carry nothing internal.
    # Run customerView on the seed, with every item made customer facing,
    # dated this month and given marker values in the internal fields.
    print('Public feed carries no internal fields:')
    try:
        probe = r"""
const { customerView } = require('./api/shared/customerView');
const d = JSON.parse(JSON.stringify(require('./api/shared/seed.json')));
const now = new Date(), m = now.getUTCFullYear() + '-' + String(now.getUTCMonth() + 1).padStart(2, '0');
const hidden = [];
d.trains.forEach(t => t.items.forEach((it, i) => {
  if (i === 0){ it.cf = false; it.name = 'HIDDEN-' + t.id; hidden.push(it.name); } else it.cf = true;
  Object.assign(it, { month: m, br: 'LEAK-BR', requestor: 'LEAK-REQ', pm: 'LEAK-PM', patch: '' });
}));
d.cloud.regions.forEach(r => { r.name = 'LEAK-REGION'; });
const out = customerView(d, now);
process.stdout.write(JSON.stringify({ text: JSON.stringify(out), hidden,
  n: out.sections.reduce((a, s) => a + s.items.length, 0) }));
"""
        res = json.loads(subprocess.run(['node', '-e', probe], capture_output=True, text=True,
                                        check=True, cwd=pathlib.Path(__file__).resolve().parent.parent).stdout)
        text = res['text']
        check('customerView returns items (%d)' % res['n'], res['n'] > 0)
        check('no br, requestor, pm or region values',
              not re.search(r'LEAK-|"(br|requestor|pm|patch|cf)"\s*:', text))
        check('no cf:false items', not any(h in text for h in res['hidden']))
    except Exception as err:                      # noqa: BLE001 - reported, not raised
        check('public feed check (%s)' % err, False)

    # A syntax error in a page script shows as a blank page and nothing else,
    # so every inline <script> and every JS file must at least parse.
    print('Scripts parse:')
    root = pathlib.Path(__file__).resolve().parent.parent
    pages = [p for p in (root / 'src').rglob('*.html')]
    files = [p for d in ('src', 'api') for p in (root / d).rglob('*.js') if 'assets' not in p.parts
             and 'node_modules' not in p.parts]
    for p in pages + files:
        if p.suffix == '.html':
            code = '\n'.join(re.findall(r'<script>(.*?)</script>', p.read_text(encoding='utf-8'), re.S))
            if not code.strip():
                continue
            r = subprocess.run(['node', '--check', '--input-type=commonjs', '-'], input=code, encoding='utf-8',
                               capture_output=True, text=True)
        else:
            r = subprocess.run(['node', '--check', str(p)], capture_output=True, text=True, encoding='utf-8')
        check('%s%s' % (p.relative_to(root).as_posix(), '' if r.returncode == 0 else
                         ': ' + (r.stderr.strip().splitlines() or ['?'])[-1]), r.returncode == 0)

    print()
    if failures:
        print('%d check(s) FAILED - what ships no longer matches the original.' % len(failures))
        return 1
    print('All checks passed - the served design is byte-identical to the original.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
