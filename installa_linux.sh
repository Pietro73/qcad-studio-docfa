#!/usr/bin/env bash
# Installa esclusivamente gli add-on del pacchetto e la sola lista AddOns QCAD.
set -Eeuo pipefail
IFS=$'\n\t'
umask 077

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly PAYLOAD_DIR="$SCRIPT_DIR/scripts/Misc"
readonly BACKUP_NAME="backup-studio-qcad"
readonly -a ADDON_RELATIVE_PATHS=(
    'scripts/Misc/StudioDefaults/StudioDefaults.js'
    'scripts/Misc/StudioCadUI/StudioCadUI.js'
    'scripts/Misc/StudioDocfa/StudioDocfa.js'
    'scripts/Misc/StudioDocfa/StudioDocfaControlla/StudioDocfaControlla.js'
    'scripts/Misc/StudioDocfa/StudioDocfaCornice/StudioDocfaCornice.js'
    'scripts/Misc/StudioDocfa/StudioDocfaGuida/StudioDocfaGuida.js'
    'scripts/Misc/StudioDocfa/StudioDocfaPolilinea/StudioDocfaPolilinea.js'
)
readonly -a MODULES=(StudioDefaults StudioCadUI StudioDocfa)
readonly -a REQUIRED_UI_FILES=(
    'StudioCadUI.js'
    'StudioCadUIInit.js'
    'StudioCadLine.js'
    'StudioCadCopy.js'
    'StudioCadMode.js'
    'StudioCadOrtho.js'
    'StudioCadFree.js'
    'icons/draw.svg'
    'icons/edit.svg'
    'icons/view.svg'
    'icons/snap.svg'
    'icons/copy-cad.svg'
    'icons/docfa-check.svg'
    'icons/docfa-frame.svg'
    'icons/docfa-guide.svg'
    'icons/docfa-polygon.svg'
    'icons/docfa-a.svg'
    'icons/docfa-a2.svg'
    'icons/docfa-b.svg'
    'icons/docfa-c.svg'
    'icons/docfa-d.svg'
    'icons/docfa-e.svg'
    'icons/docfa-f.svg'
    'icons/docfa-g.svg'
)

data_dir=''
config_file=''
backup_dir=''
config_changed=false
rollback_needed=false
declare -a changed_modules=()
declare -a ADDONS=()

fail() {
    printf 'ERRORE: %s\n' "$*" >&2
    exit 1
}

usage() {
    cat <<'EOF'
Uso: ./installa_linux.sh [--data-dir PERCORSO] [--config-file FILE]

Installa le palette Studio CAD, gli strumenti DOCFA e il profilo Studio in QCAD.
QCAD deve essere chiuso. Senza opzioni usa i percorsi XDG dell'utente corrente.
EOF
}

trim() {
    local value=$1
    value="${value#"${value%%[![:space:]]*}"}"
    printf '%s' "${value%"${value##*[![:space:]]}"}"
}

require_absolute_path() {
    local value=$1 label=$2
    [[ -n "$value" && "$value" == /* && "$value" != / && "$value" != *$'\n'* && "$value" != *$'\r'* ]] || fail "$label deve essere un percorso assoluto valido diverso da /."
}

qcad_is_running() {
    # Il nome del pacchetto contiene "QCAD": si controlla il processo reale
    # per non bloccare l'installer a causa del solo percorso dello script.
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

contains_addon() {
    local list=$1 wanted=$2 entry
    local -a entries=()
    IFS=',' read -r -a entries <<< "$list"
    for entry in "${entries[@]}"; do
        [[ "$(trim "$entry")" == "$wanted" ]] && return 0
    done
    return 1
}

get_addons_list() {
    awk '
        /^\[AddOns\]$/ { inside=1; next }
        /^\[/ { inside=0 }
        inside && /^List=/ { print substr($0, 6); found=1; exit }
        END { if (!found) exit 1 }
    ' "$config_file"
}

write_addons_list() {
    local desired_list=$1 temp_file
    temp_file="$(mktemp "$(dirname -- "$config_file")/.QCAD3.studio.XXXXXX")" || fail 'Impossibile creare il file temporaneo della configurazione.'

    awk -v list="$desired_list" '
        /^\[AddOns\]$/ {
            if (inside && !written) print "List=" list
            inside=1; seen=1; print; next
        }
        /^\[/ {
            if (inside && !written) print "List=" list
            inside=0; print; next
        }
        inside && /^List=/ {
            if (!written) print "List=" list
            written=1; next
        }
        { print }
        END {
            if (!seen) exit 42
            if (inside && !written) print "List=" list
        }
    ' "$config_file" > "$temp_file" || {
        rm -f -- "$temp_file"
        fail 'Impossibile aggiornare in modo conservativo [AddOns] List.'
    }

    mv -f -- "$temp_file" "$config_file" || {
        rm -f -- "$temp_file"
        fail 'Impossibile sostituire atomicamente il file di configurazione QCAD.'
    }
}

module_differs() {
    local module=$1 destination="$data_dir/scripts/Misc/$module"
    [[ ! -e "$destination" ]] && return 0
    [[ -d "$destination" ]] || fail "Il target $destination esiste ma non e' una cartella del modulo."
    diff -qr "$PAYLOAD_DIR/$module" "$destination" >/dev/null
    local result=$?
    [[ $result -eq 0 ]] && return 1
    [[ $result -eq 1 ]] && return 0
    fail "Impossibile confrontare il modulo $module con il target esistente."
}

assert_managed_target() {
    local module=$1 target="$data_dir/scripts/Misc/$module"
    [[ "$target" == "$data_dir/scripts/Misc/"* ]] || fail 'Target del modulo non valido.'
}

restore_after_error() {
    local module
    [[ "$rollback_needed" == true ]] || return 0
    printf 'Rollback: ripristino lo stato precedente.\n' >&2

    if [[ "$config_changed" == true && -f "$backup_dir/addons-list.before" ]]; then
        write_addons_list "$(<"$backup_dir/addons-list.before")" || true
    fi
    for module in "${changed_modules[@]}"; do
        assert_managed_target "$module"
        rm -rf -- "$data_dir/scripts/Misc/$module"
        if [[ -d "$backup_dir/data.before/$module" ]]; then
            cp -a "$backup_dir/data.before/$module" "$data_dir/scripts/Misc/"
        fi
    done
}

on_error() {
    local status=$?
    restore_after_error
    exit "$status"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --data-dir)
            [[ $# -ge 2 ]] || fail 'Manca il valore dopo --data-dir.'
            data_dir=$2; shift 2 ;;
        --config-file)
            [[ $# -ge 2 ]] || fail 'Manca il valore dopo --config-file.'
            config_file=$2; shift 2 ;;
        --help|-h)
            usage; exit 0 ;;
        *)
            fail "Opzione non riconosciuta: $1" ;;
    esac
done

[[ -d "$PAYLOAD_DIR/StudioDefaults" && -d "$PAYLOAD_DIR/StudioCadUI" && -d "$PAYLOAD_DIR/StudioDocfa" ]] || fail 'Payload incompleto: mancano uno o piu moduli Studio.'
for required_ui_file in "${REQUIRED_UI_FILES[@]}"; do
    [[ -s "$PAYLOAD_DIR/StudioCadUI/$required_ui_file" ]] \
        || fail "Payload incompleto: manca StudioCadUI/$required_ui_file"
done
qcad_is_running && fail 'QCAD risulta aperto: chiuderlo completamente prima dell installazione.'

if [[ -z "$data_dir" ]]; then
    data_dir="${XDG_DATA_HOME:-$HOME/.local/share}/QCAD/QCAD"
fi
require_absolute_path "$data_dir" '--data-dir'
for addon_relative_path in "${ADDON_RELATIVE_PATHS[@]}"; do
    ADDONS+=("$data_dir/$addon_relative_path")
done

if [[ -z "$config_file" ]]; then
    config_file="$(detect_config_file)" || fail 'Configurazione QCAD non trovata. Avviare QCAD una volta o usare --config-file FILE.'
fi
require_absolute_path "$config_file" '--config-file'
[[ -f "$config_file" && -r "$config_file" && -w "$config_file" ]] || fail "Configurazione non leggibile o non scrivibile: $config_file"

current_list="$(get_addons_list)" || fail 'La configurazione non contiene [AddOns] List: non viene modificata.'
desired_list=$current_list
for addon in "${ADDONS[@]}"; do
    if ! contains_addon "$desired_list" "$addon"; then
        desired_list+="${desired_list:+, }$addon"
    fi
done
[[ "$desired_list" != "$current_list" ]] && config_changed=true

for module in "${MODULES[@]}"; do
    if module_differs "$module"; then
        changed_modules+=("$module")
    fi
done

if [[ "$config_changed" == false && ${#changed_modules[@]} -eq 0 ]]; then
    printf 'QCAD Studio e gia installato: nessuna modifica necessaria.\n'
    exit 0
fi

mkdir -p -- "$data_dir/scripts/Misc" || fail "Impossibile creare la cartella dati: $data_dir/scripts/Misc"
backup_dir="$(dirname -- "$config_file")/$BACKUP_NAME/$(date +%d%m%Y-%H%M%S)"
mkdir -p -- "$backup_dir/data.before" || fail "Impossibile creare il backup: $backup_dir"
printf '%s\n' "$current_list" > "$backup_dir/addons-list.before"
printf 'data_dir=%s\nconfig_file=%s\n' "$data_dir" "$config_file" > "$backup_dir/INFO.txt"
rollback_needed=true
trap on_error ERR

for module in "${changed_modules[@]}"; do
    assert_managed_target "$module"
    if [[ -e "$data_dir/scripts/Misc/$module" ]]; then
        cp -a "$data_dir/scripts/Misc/$module" "$backup_dir/data.before/"
    fi
    rm -rf -- "$data_dir/scripts/Misc/$module"
    cp -a "$PAYLOAD_DIR/$module" "$data_dir/scripts/Misc/"
    diff -qr "$PAYLOAD_DIR/$module" "$data_dir/scripts/Misc/$module" >/dev/null || fail "Verifica copia fallita per il modulo $module."
done

for required_ui_file in "${REQUIRED_UI_FILES[@]}"; do
    [[ -r "$data_dir/scripts/Misc/StudioCadUI/$required_ui_file" ]] \
        || fail "Verifica installazione fallita: icona o script non leggibile StudioCadUI/$required_ui_file"
done

if [[ "$config_changed" == true ]]; then
    write_addons_list "$desired_list"
    config_changed=true
fi

rollback_needed=false
trap - ERR
printf 'Installazione completata. Backup: %s\n' "$backup_dir"
printf 'Controllo aggiuntivo: ./verifica_linux.sh --data-dir %q --config-file %q\n' "$data_dir" "$config_file"
