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
import sys

# The frozen original. Bump this, and the line numbers below, whenever a new
# standalone editor supersedes it.
ORIGINAL = pathlib.Path('Voca_CIC_Release_Roadmap_EDITOR-3.html')

SLICES = [
    ('src/shared/base.css', 'stylesheet',    138, 421),
    ('src/shared/board.js', 'board runtime', 573, 728),
]
HELPERS = (424, 570)            # render.js starts with these, then adds buildBodyHTML
SEED    = (1008, 1796)          # the DEFAULT_DATA object literal

# Lines the slices are cut at, and what must be sitting on them.
ANCHORS = [
    (137, 'const BASE_CSS = `'),
    (422, '`;'),
    (572, 'const BOARD_JS = `'),
    (729, '`;'),
    (1008, 'const DEFAULT_DATA = {'),
    (1796, '};'),
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
    check('%-14s %s' % ('markup helpers', render),
          render.is_file() and render.read_text(encoding='utf-8').startswith(cut(*HELPERS)))

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

    print()
    if failures:
        print('%d check(s) FAILED - what ships no longer matches the original.' % len(failures))
        return 1
    print('All checks passed - the served design is byte-identical to the original.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
