#!/usr/bin/env bash
# Ripristina il solo stato precedentemente salvato dall'installer Studio QCAD.
# Supporta Linux e macOS: cambia solo la cartella dati predefinita di QCAD.
set -Eeuo pipefail
IFS=$'\n\t'
umask 077

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
Uso: ./ripristina.sh [--data-dir PERCORSO] [--config-file FILE] [--backup-dir CARTELLA]

Ripristina la lista AddOns precedente e i soli moduli Studio salvati dal backup
su Linux o macOS. QCAD deve essere chiuso. Se --backup-dir manca viene scelto
il backup piu recente. Per Windows usare installa_windows.ps1 -Ripristina.
EOF
}

default_data_dir() {
    if [[ "$(uname -s)" == "Darwin" ]]; then
        printf '%s\n' "$HOME/Library/Application Support/QCAD/QCAD Professional"
    else
        printf '%s\n' "${XDG_DATA_HOME:-$HOME/.local/share}/QCAD/QCAD"
    fi
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
        || pgrep -x 'QCAD-Pro' >/dev/null 2>&1 \
        || pgrep -f 'QCAD[^/]*\.app/Contents/MacOS/' >/dev/null 2>&1 \
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
if [[ -z "$data_dir" ]]; then
    data_dir="$(default_data_dir)"
fi
require_absolute_path "$data_dir" '--data-dir'

if [[ -z "$config_file" ]]; then
    config_file="$(detect_config_file)" || fail 'Configurazione QCAD non trovata. Usare --config-file FILE.'
fi
require_absolute_path "$config_file" '--config-file'
[[ -f "$config_file" && -w "$config_file" ]] || fail "Configurazione non leggibile o non scrivibile: $config_file"

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
