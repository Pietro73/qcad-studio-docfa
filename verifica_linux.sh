#!/usr/bin/env bash
# Verifica non distruttiva dell'installazione QCAD Studio su Linux.
set -Eeuo pipefail
IFS=$'\n\t'

data_dir=''
config_file=''
errors=0

readonly -a REQUIRED_FILES=(
    'scripts/Misc/StudioDefaults/StudioDefaults.js'
    'scripts/Misc/StudioCadUI/StudioCadUI.js'
    'scripts/Misc/StudioCadUI/StudioCadUIInit.js'
    'scripts/Misc/StudioCadUI/StudioCadLine.js'
    'scripts/Misc/StudioCadUI/StudioCadCopy.js'
    'scripts/Misc/StudioCadUI/StudioCadMode.js'
    'scripts/Misc/StudioCadUI/StudioCadOrtho.js'
    'scripts/Misc/StudioCadUI/StudioCadFree.js'
    'scripts/Misc/StudioCadUI/icons/draw.svg'
    'scripts/Misc/StudioCadUI/icons/edit.svg'
    'scripts/Misc/StudioCadUI/icons/view.svg'
    'scripts/Misc/StudioCadUI/icons/snap.svg'
    'scripts/Misc/StudioCadUI/icons/copy-cad.svg'
    'scripts/Misc/StudioCadUI/icons/docfa-check.svg'
    'scripts/Misc/StudioCadUI/icons/docfa-frame.svg'
    'scripts/Misc/StudioCadUI/icons/docfa-guide.svg'
    'scripts/Misc/StudioCadUI/icons/docfa-polygon.svg'
    'scripts/Misc/StudioCadUI/icons/docfa-a.svg'
    'scripts/Misc/StudioCadUI/icons/docfa-a2.svg'
    'scripts/Misc/StudioCadUI/icons/docfa-b.svg'
    'scripts/Misc/StudioCadUI/icons/docfa-c.svg'
    'scripts/Misc/StudioCadUI/icons/docfa-d.svg'
    'scripts/Misc/StudioCadUI/icons/docfa-e.svg'
    'scripts/Misc/StudioCadUI/icons/docfa-f.svg'
    'scripts/Misc/StudioCadUI/icons/docfa-g.svg'
    'scripts/Misc/StudioDocfa/StudioDocfa.js'
    'scripts/Misc/StudioDocfa/StudioDocfaControlla/StudioDocfaControlla.js'
    'scripts/Misc/StudioDocfa/StudioDocfaCornice/StudioDocfaCornice.js'
    'scripts/Misc/StudioDocfa/StudioDocfaGuida/StudioDocfaGuida.js'
    'scripts/Misc/StudioDocfa/StudioDocfaPolilinea/StudioDocfaPolilinea.js'
)
readonly -a ADDON_RELATIVE_PATHS=(
    'scripts/Misc/StudioDefaults/StudioDefaults.js'
    'scripts/Misc/StudioCadUI/StudioCadUI.js'
    'scripts/Misc/StudioDocfa/StudioDocfa.js'
    'scripts/Misc/StudioDocfa/StudioDocfaControlla/StudioDocfaControlla.js'
    'scripts/Misc/StudioDocfa/StudioDocfaCornice/StudioDocfaCornice.js'
    'scripts/Misc/StudioDocfa/StudioDocfaGuida/StudioDocfaGuida.js'
    'scripts/Misc/StudioDocfa/StudioDocfaPolilinea/StudioDocfaPolilinea.js'
)

fail_usage() {
    printf 'Uso: ./verifica_linux.sh [--data-dir PERCORSO] [--config-file FILE]\n' >&2
    exit 2
}

detect_config_file() {
    local xdg_config="${XDG_CONFIG_HOME:-$HOME/.config}"
    local candidate
    for candidate in \
        "$xdg_config/QCAD/QCAD3.conf" \
        "$xdg_config/QCAD/QCAD3.ini" \
        "$HOME/.config/QCAD/QCAD3.conf" \
        "$HOME/.config/QCAD/QCAD3.ini"; do
        [[ -f "$candidate" ]] && { printf '%s\n' "$candidate"; return 0; }
    done
    return 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --data-dir) [[ $# -ge 2 ]] || fail_usage; data_dir=$2; shift 2 ;;
        --config-file) [[ $# -ge 2 ]] || fail_usage; config_file=$2; shift 2 ;;
        --help|-h) fail_usage ;;
        *) fail_usage ;;
    esac
done

[[ -n "$data_dir" ]] || data_dir="${XDG_DATA_HOME:-$HOME/.local/share}/QCAD/QCAD"
[[ "$data_dir" == /* && "$data_dir" != / ]] || { printf 'FAIL percorso dati non valido: %s\n' "$data_dir"; exit 1; }
if [[ -z "$config_file" ]]; then
    config_file="$(detect_config_file)" || config_file=''
fi

printf 'Directory dati: %s\n' "$data_dir"
for relative_file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -r "$data_dir/$relative_file" ]]; then
        printf 'FAIL file mancante o non leggibile: %s\n' "$relative_file"
        errors=$((errors + 1))
    fi
done

if [[ -n "$config_file" && -r "$config_file" ]]; then
    printf 'Configurazione: %s\n' "$config_file"
    if ! addons_list="$(awk '
        /^\[AddOns\]$/ { inside=1; next }
        /^\[/ { inside=0 }
        inside && /^List=/ { print substr($0, 6); found=1; exit }
        END { if (!found) exit 1 }
    ' "$config_file")"; then
        printf 'FAIL sezione [AddOns] List non trovata.\n'
        errors=$((errors + 1))
    else
        for addon_relative_path in "${ADDON_RELATIVE_PATHS[@]}"; do
            addon="$data_dir/$addon_relative_path"
            if [[ ",$addons_list," != *"$addon"* ]]; then
                printf 'FAIL add-on non registrato: %s\n' "$addon_relative_path"
                errors=$((errors + 1))
            fi
        done
    fi
else
    printf 'FAIL configurazione QCAD non trovata o non leggibile.\n'
    errors=$((errors + 1))
fi

if [[ $errors -ne 0 ]]; then
    printf 'ESITO: FAIL (%d problemi)\n' "$errors"
    exit 1
fi

printf 'ESITO: PASS - script e icone portabili presenti.\n'
printf 'Ora riavvia QCAD. Al primo avvio aggiornato usa anche -rescan.\n'
