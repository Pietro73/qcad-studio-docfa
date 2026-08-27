#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

readonly REPO_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
test_root="$(mktemp -d "${TMPDIR:-/tmp}/qcad-studio-test.XXXXXX")"
trap 'rm -rf -- "$test_root"' EXIT

mkdir -p "$test_root/config/QCAD" "$test_root/data" "$test_root/fakebin"
printf '#!/usr/bin/env bash\nexit 1\n' > "$test_root/fakebin/pgrep"
chmod +x "$test_root/fakebin/pgrep"
printf '[AddOns]\nList=\n' > "$test_root/config/QCAD/QCAD3.conf"

PATH="$test_root/fakebin:$PATH" "$REPO_DIR/installa.sh" \
    --data-dir "$test_root/data" \
    --config-file "$test_root/config/QCAD/QCAD3.conf"
"$REPO_DIR/verifica.sh" \
    --data-dir "$test_root/data" \
    --config-file "$test_root/config/QCAD/QCAD3.conf"
PATH="$test_root/fakebin:$PATH" "$REPO_DIR/installa.sh" \
    --data-dir "$test_root/data" \
    --config-file "$test_root/config/QCAD/QCAD3.conf" \
    | grep -F 'nessuna modifica necessaria'

printf 'PASS installer con lista AddOns vuota e seconda esecuzione idempotente.\n'
