#!/usr/bin/env bash
# Ripristina il solo stato precedentemente salvato dall'installer Studio QCAD.
set -Eeuo pipefail
IFS=$'\n\t'
umask 077

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly BACKUP_NAME='backup-studio-qcad'
readonly -a MODULES=(StudioDefaults StudioCadUI StudioDocfa)

data_dir=''
config_file=''
backup_dir=''

fail() {
    printf 'ERRORE: %s\n' "$*" >&2
    exit 1
}

usage() {
    cat <<'EOF'
Uso: ./ripristina_linux.sh [--data-dir PERCORSO] [--config-file FILE] [--backup-dir CARTELLA]

Ripristina la lista AddOns precedente e i soli moduli Studio salvati dal backup.
QCAD deve essere chiuso. Se --backup-dir manca viene scelto il backup piu recente.
Senza --data-dir vengono ripristinate tutte le edizioni QCAD rilevate.
EOF
}

require_absolute_path() {
    local value=$1 label=$2
    [[ -n "$value" && "$value" == /* && "$value" != / && "$value" != *$'\n'* && "$value" != *$'\r'* ]] || fail "$label deve essere un percorso assoluto valido diverso da /."
}

qcad_is_running() {
    # Il nome del pacchetto contiene "QCAD": si controlla il processo reale
    # per non bloccare il ripristino a causa del solo percorso dello script.
    pgrep -x 'qcad' >/dev/null 2>&1 \
        || pgrep -x 'qcad-bin' >/dev/null 2>&1 \
        || pgrep -x 'QCAD' >/dev/null 2>&1 \
        || pgrep -f '/qcad(-bin)?([[:space:]]|$)' >/dev/null 2>&1
}

detect_config_file() {
    local xdg_config="${XDG_CONFIG_HOME:-$HOME/.config}"
    local candidate
    local -a candidates=(
        "$xdg_config/QCAD/QCAD3.conf"
        "$xdg_config/QCAD/QCAD3.ini"
        "$HOME/.config/QCAD/QCAD3.conf"
        "$HOME/.config/QCAD/QCAD3.ini"
    )
    for candidate in "${candidates[@]}"; do
        if [[ -f "$candidate" ]]; then
            printf '%s\n' "$candidate"
            return 0
        fi
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

write_addons_list() {
    local desired_list=$1 temp_file
    temp_file="$(mktemp "$(dirname -- "$config_file")/.QCAD3.studio.XXXXXX")" || fail 'Impossibile creare il file temporaneo della configurazione.'
    awk -v list="$desired_list" '
        /^\[AddOns\]$/ { inside=1; seen=1; print; next }
        /^\[/ { if (inside && !written) print "List=" list; inside=0; print; next }
        inside && /^List=/ { if (!written) print "List=" list; written=1; next }
        { print }
        END { if (!seen) exit 42; if (inside && !written) print "List=" list }
    ' "$config_file" > "$temp_file" || { rm -f -- "$temp_file"; fail 'Impossibile ripristinare [AddOns] List.'; }
    mv -f -- "$temp_file" "$config_file" || { rm -f -- "$temp_file"; fail 'Impossibile sostituire atomicamente il file di configurazione QCAD.'; }
}

assert_managed_target() {
    local module=$1 target="$data_dir/scripts/Misc/$module"
    [[ "$target" == "$data_dir/scripts/Misc/"* ]] || fail 'Target del modulo non valido.'
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --data-dir) [[ $# -ge 2 ]] || fail 'Manca il valore dopo --data-dir.'; data_dir=$2; shift 2 ;;
        --config-file) [[ $# -ge 2 ]] || fail 'Manca il valore dopo --config-file.'; config_file=$2; shift 2 ;;
        --backup-dir) [[ $# -ge 2 ]] || fail 'Manca il valore dopo --backup-dir.'; backup_dir=$2; shift 2 ;;
        --help|-h) usage; exit 0 ;;
        *) fail "Opzione non riconosciuta: $1" ;;
    esac
done

qcad_is_running && fail 'QCAD risulta aperto: chiuderlo completamente prima del ripristino.'

if [[ -z "$config_file" ]]; then
    config_file="$(detect_config_file)" || fail 'Configurazione QCAD non trovata. Usare --config-file FILE.'
fi
require_absolute_path "$config_file" '--config-file'
[[ -f "$config_file" && -w "$config_file" ]] || fail "Configurazione non leggibile o non scrivibile: $config_file"

if [[ -z "$data_dir" ]]; then
    declare -a detected_data_dirs=()
    while IFS= read -r detected_data_dir; do
        [[ -n "$detected_data_dir" ]] && detected_data_dirs+=("$detected_data_dir")
    done < <(detect_data_dirs)
    [[ ${#detected_data_dirs[@]} -gt 0 ]] || fail 'Nessuna installazione QCAD rilevata: usare --data-dir PERCORSO.'
    # Un backup appartiene a una sola cartella dati: con piu' edizioni QCAD si
    # ripristina un'edizione per volta. Con --backup-dir esplicito la scelta
    # e' gia' dell utente e non va moltiplicata.
    if [[ ${#detected_data_dirs[@]} -gt 1 && -z "$backup_dir" ]]; then
        for detected_data_dir in "${detected_data_dirs[@]}"; do
            printf 'Edizione QCAD rilevata: %s\n' "$detected_data_dir"
            "$SCRIPT_DIR/${BASH_SOURCE[0]##*/}" \
                --data-dir "$detected_data_dir" --config-file "$config_file"
        done
        exit 0
    fi
    data_dir="${detected_data_dirs[0]}"
fi
require_absolute_path "$data_dir" '--data-dir'

if [[ -z "$backup_dir" ]]; then
    backup_root="$(dirname -- "$config_file")/$BACKUP_NAME"
    [[ -d "$backup_root" ]] || fail "Nessun backup trovato in $backup_root"
    backup_dir="$(find "$backup_root" -mindepth 1 -maxdepth 1 -type d -name '????????-??????' -print | LC_ALL=C sort | tail -n 1)"
fi
require_absolute_path "$backup_dir" '--backup-dir'
[[ -f "$backup_dir/addons-list.before" && -f "$backup_dir/INFO.txt" && -d "$backup_dir/data.before" ]] || fail "Backup Studio non valido: $backup_dir"

saved_data_dir="$(awk -F= '$1 == "data_dir" { print substr($0, 10); exit }' "$backup_dir/INFO.txt")"
saved_config_file="$(awk -F= '$1 == "config_file" { print substr($0, 13); exit }' "$backup_dir/INFO.txt")"
[[ "$saved_data_dir" == "$data_dir" && "$saved_config_file" == "$config_file" ]] || fail 'Il backup non corrisponde ai percorsi richiesti: usare gli stessi --data-dir e --config-file dell installazione.'

mkdir -p -- "$data_dir/scripts/Misc" || fail 'Impossibile accedere alla cartella dati QCAD.'
for module in "${MODULES[@]}"; do
    assert_managed_target "$module"
    rm -rf -- "$data_dir/scripts/Misc/$module"
    if [[ -d "$backup_dir/data.before/$module" ]]; then
        cp -a "$backup_dir/data.before/$module" "$data_dir/scripts/Misc/"
    fi
done
write_addons_list "$(<"$backup_dir/addons-list.before")"
printf 'Ripristino completato dal backup: %s\n' "$backup_dir"
