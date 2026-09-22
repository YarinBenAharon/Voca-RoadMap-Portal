"""Copy the shared design assets into the API so the publish endpoint can
inline them into the standalone exported file.

src/shared/ is the single source for the stylesheet, the board runtime and the
markup helpers. The API is deployed as a separate unit and cannot read src/, so
the three files are copied into api/shared/assets/ at build time. That copy is
generated, never edited, and is git-ignored so a stale one cannot be committed.

Run from the repository root:  python tools/sync_api_assets.py
"""

import pathlib
import shutil
import sys

ASSETS = ('base.css', 'board.js', 'render.js')
SRC    = pathlib.Path('src/shared')
DEST   = pathlib.Path('api/shared/assets')


def main():
    if not SRC.is_dir():
        sys.exit('Run this from the repository root: %s not found.' % SRC)

    DEST.mkdir(parents=True, exist_ok=True)
    for name in ASSETS:
        source = SRC / name
        if not source.is_file():
            sys.exit('Missing shared asset: %s' % source)
        shutil.copyfile(source, DEST / name)
        print('%s -> %s' % (source, DEST / name))

    print('%d assets synced.' % len(ASSETS))


if __name__ == '__main__':
    main()
