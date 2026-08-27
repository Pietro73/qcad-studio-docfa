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
    'scripts/Misc/StudioCadUI/icons/draw.png'
    'scripts/Misc/StudioCadUI/icons/edit.png'
    'scripts/Misc/StudioCadUI/icons/view.png'
    'scripts/Misc/StudioCadUI/icons/snap.png'
    'scripts/Misc/StudioCadUI/icons/copy-cad.png'
    'scripts/Misc/StudioCadUI/icons/docfa-check.png'
    'scripts/Misc/StudioCadUI/icons/docfa-frame.png'
    'scripts/Misc/StudioCadUI/icons/docfa-guide.png'
    'scripts/Misc/StudioCadUI/icons/docfa-polygon.png'
    'scripts/Misc/StudioCadUI/icons/docfa-a.png'
    'scripts/Misc/StudioCadUI/icons/docfa-a2.png'
    'scripts/Misc/StudioCadUI/icons/docfa-b.png'
    'scripts/Misc/StudioCadUI/icons/docfa-c.png'
    'scripts/Misc/StudioCadUI/icons/docfa-d.png'
    'scripts/Misc/StudioCadUI/icons/docfa-e.png'
    'scripts/Misc/StudioCadUI/icons/docfa-f.png'
    'scripts/Misc/StudioCadUI/icons/docfa-g.png'
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

# QCAD ricava la cartella dati dal nome applicazione: la community usa "QCAD",
# QCAD Professional usa "QCAD Professional". Le due edizioni condividono
# QCAD3.conf ma non gli add-on, quindi installare nella cartella sbagliata
# lascia la palette invisibile senza alcun errore. Il nome applicazione non e'
# deducibile dai file su disco: lo si chiede a QCAD stesso, in modalita' senza
# interfaccia e su una configurazione temporanea per non toccare quella reale.
qcad_launchers() {
    local launcher directory
    for launcher in $(command -v qcad 2>/dev/null || true); do
        printf '%s\n' "$launcher"
    done
    while IFS= read -r launcher; do
        [[ -n "$launcher" ]] || continue
        directory="$(dirname -- "$launcher")"
        if [[ -x "$directory/qcad" ]]; then
            # I lanciatori 'qcad' impostano LD_LIBRARY_PATH: senza di loro
            # 'qcad-bin' delle build scaricate non parte.
            printf '%s\n' "$directory/qcad"
        else
            printf '%s\n' "$launcher"
        fi
    done < <(find "$HOME/opt" "$HOME/.local/opt" /opt /usr/local/lib /usr/lib \
        -maxdepth 4 -type f -name 'qcad-bin' -print 2>/dev/null || true)
}

probe_data_dir() {
    local launcher=$1 probe_script temporary_config output
    probe_script="$(mktemp "${TMPDIR:-/tmp}/studio-qcad-probe.XXXXXX.js")" || return 1
    temporary_config="$(mktemp "${TMPDIR:-/tmp}/studio-qcad-conf.XXXXXX")" || {
        rm -f -- "$probe_script"
        return 1
    }
    printf 'qDebug("STUDIO_DATA_DIR=" + RSettings.getDataLocation());\n' > "$probe_script"
    output="$(timeout 180 "$launcher" -no-gui -allow-multiple-instances \
        -config "$temporary_config" -exec "$probe_script" -quit 2>&1 \
        | sed -n 's/.*STUDIO_DATA_DIR=//p' | head -n 1)" || output=''
    rm -f -- "$probe_script" "$temporary_config"
    [[ "$output" == /* ]] || return 1
    printf '%s\n' "$output"
}

detect_data_dirs() {
    local base="${XDG_DATA_HOME:-$HOME/.local/share}/QCAD"
    local -a dirs=()
    local launcher detected
    local -A seen=()

    while IFS= read -r launcher; do
        [[ -n "$launcher" && -x "$launcher" ]] || continue
        launcher="$(readlink -f -- "$launcher" 2>/dev/null || printf '%s' "$launcher")"
        [[ -n "${seen[$launcher]:-}" ]] && continue
        seen[$launcher]=1
        if detected="$(probe_data_dir "$launcher")"; then
            dirs+=("$detected")
        fi
    done < <(qcad_launchers)

    [[ ${#dirs[@]} -gt 0 ]] || dirs+=("$base/QCAD")
    printf '%s\n' "${dirs[@]}" | LC_ALL=C sort -u
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --data-dir) [[ $# -ge 2 ]] || fail_usage; data_dir=$2; shift 2 ;;
        --config-file) [[ $# -ge 2 ]] || fail_usage; config_file=$2; shift 2 ;;
        --help|-h) fail_usage ;;
        *) fail_usage ;;
    esac
done

if [[ -z "$config_file" ]]; then
    config_file="$(detect_config_file)" || config_file=''
fi

check_data_dir() {
    local data_dir=$1
    local relative_file addon_relative_path addon addons_list

    printf 'Directory dati: %s\n' "$data_dir"
    if [[ "$data_dir" != /* || "$data_dir" == / ]]; then
        printf 'FAIL percorso dati non valido: %s\n' "$data_dir"
        errors=$((errors + 1))
        return
    fi

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
                    # QCAD riscansiona a ogni avvio quando Scripting/Rescan e'
                    # attivo: la lista si riallinea da sola al primo avvio.
                    printf 'ATTENZIONE add-on non ancora registrato: %s\n' "$addon_relative_path"
                fi
            done
        fi
    else
        printf 'FAIL configurazione QCAD non trovata o non leggibile.\n'
        errors=$((errors + 1))
    fi
}

declare -a data_dirs=()
if [[ -n "$data_dir" ]]; then
    data_dirs+=("$data_dir")
else
    while IFS= read -r detected_data_dir; do
        [[ -n "$detected_data_dir" ]] && data_dirs+=("$detected_data_dir")
    done < <(detect_data_dirs)
fi
if [[ ${#data_dirs[@]} -eq 0 ]]; then
    printf 'FAIL nessuna installazione QCAD rilevata: usare --data-dir PERCORSO.\n'
    exit 1
fi

for current_data_dir in "${data_dirs[@]}"; do
    check_data_dir "$current_data_dir"
done

if [[ $errors -ne 0 ]]; then
    printf 'ESITO: FAIL (%d problemi)\n' "$errors"
    exit 1
fi

printf 'ESITO: PASS - script e icone portabili presenti in %d edizione/i QCAD.\n' "${#data_dirs[@]}"
printf 'Ora riavvia QCAD. Al primo avvio aggiornato usa anche -rescan.\n'
