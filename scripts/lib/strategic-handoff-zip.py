#!/usr/bin/env python3
"""ZIP transport only; no package-supplied code is executed."""
import os, stat, sys, zipfile
from pathlib import Path, PurePosixPath
MAX_BYTES = 512 * 1024 * 1024
MAX_FILES = 20000

def checked(name):
    if not name or '\\' in name or ':' in name or any(ord(c) < 32 for c in name) or name.startswith('/') or any(p in ('', '.', '..') for p in name.split('/')):
        raise ValueError('invalid ZIP path: ' + name)
    return name

def main():
    command, source, destination = sys.argv[1:]
    source, destination = Path(source), Path(destination)
    if command == 'pack':
        with zipfile.ZipFile(destination, 'x', compression=zipfile.ZIP_DEFLATED) as z:
            for file in sorted(source.rglob('*')):
                if file.is_symlink(): raise ValueError('symlink is forbidden')
                if not file.is_file(): continue
                info = zipfile.ZipInfo(checked(file.relative_to(source).as_posix()), (1980, 1, 1, 0, 0, 0))
                info.external_attr = (stat.S_IFREG | 0o644) << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(info, file.read_bytes())
    elif command == 'unpack':
        with zipfile.ZipFile(source) as z:
            entries = z.infolist()
            if len(entries) > MAX_FILES or sum(i.file_size for i in entries) > MAX_BYTES: raise ValueError('ZIP size limit')
            seen = set()
            for item in entries:
                name = checked(item.filename)
                folded = name.casefold()
                if folded in seen: raise ValueError('duplicate/case-colliding ZIP entry')
                seen.add(folded)
                mode = item.external_attr >> 16
                if item.is_dir() or stat.S_ISLNK(mode) or (stat.S_IFMT(mode) not in (0, stat.S_IFREG)): raise ValueError('only regular files allowed')
                if item.flag_bits & 1: raise ValueError('encrypted ZIP not supported')
            for item in entries:
                file = destination.joinpath(*PurePosixPath(item.filename).parts)
                file.parent.mkdir(parents=True, exist_ok=True)
                with file.open('xb') as out, z.open(item) as incoming:
                    total = 0
                    while chunk := incoming.read(1024 * 1024):
                        total += len(chunk)
                        if total > item.file_size or total > MAX_BYTES: raise ValueError('ZIP expanded size limit')
                        out.write(chunk)
    else: raise ValueError('unknown ZIP command')
if __name__ == '__main__':
    try: main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
