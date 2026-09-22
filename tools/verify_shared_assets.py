"""Prove that hosting the roadmap did not change its design.

The portal was built by slicing the original single-file editor apart, not by
rewriting it. This script re-cuts those slices from the frozen original and
compares them byte for byte with what the site actually serves. If it passes,
the stylesheet, the board runtime and the markup helpers running in production
are character-identical to the ones in the file the roadmap was designed in.

Run from the repository root:  python tools/verify_shared_assets.py
"""

import pathlib
import sys

ORIGINAL = pathlib.Path('Voca_CIC_Release_Roadmap_edit_mode.html')
VIEW     = pathlib.Path('Voca_CIC_Release_Roadmap_view_mode.html')

# (label, file that ships, first line, last line)  -- 1-indexed, inclusive
SLICES = [
    ('src/shared/base.css', 'stylesheet',    137, 415),
    ('src/shared/board.js', 'board runtime', 559, 710),
]

# render.js carries the helpers verbatim, then adds buildBodyHTML and exports.
HELPERS = (418, 556)


def lines(path):
    return path.read_text(encoding='utf-8').split('\n')


def check(label, got, want, failures):
    if got == want:
        print('  ok    %s' % label)
    else:
        print('  FAIL  %s' % label)
        failures.append(label)


def main():
    if not ORIGINAL.is_file():
        sys.exit('Frozen original not found: %s' % ORIGINAL)

    src = lines(ORIGINAL)
    cut = lambda a, b: '\n'.join(src[a - 1:b])
    failures = []

    print('Shared assets against the frozen original:')
    for path, label, first, last in SLICES:
        p = pathlib.Path(path)
        if not p.is_file():
            print('  FAIL  %s (missing)' % label)
            failures.append(label)
            continue
        check('%-14s %s' % (label, path),
              p.read_text(encoding='utf-8').rstrip('\n'), cut(first, last).rstrip('\n'), failures)

    render = pathlib.Path('src/shared/render.js')
    if render.is_file():
        want = cut(*HELPERS)
        got  = render.read_text(encoding='utf-8')
        check('%-14s %s' % ('markup helpers', render), got.startswith(want), True, failures)
    else:
        print('  FAIL  markup helpers (missing)')
        failures.append('markup helpers')

    # The published view-only file was generated from the same stylesheet, so it
    # is an independent second opinion on the CSS slice.
    if VIEW.is_file():
        print('Cross-check against the previously published file:')
        v = lines(VIEW)
        check('stylesheet matches the published board',
              '\n'.join(v[10:289]).rstrip('\n'), cut(137, 415).rstrip('\n'), failures)

    print()
    if failures:
        print('%d check(s) FAILED - the served design no longer matches the original.' % len(failures))
        return 1
    print('All checks passed - the served design is byte-identical to the original.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
