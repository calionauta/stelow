#!/usr/bin/env bash
# Fail when Portuguese reaches a skill or a document.
#
# The accent scan this replaces was not enough: `Mesmo ator`, `Etapa`, `Nenhum`
# and `compras corporativas` are Portuguese with no diacritic, so a translation
# pass that looked only for accents left them behind, and the rendered contracts
# carried them into every host that reads the data.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

pattern='\b(mesmo|não|são|você|também|então|etapa|etapas|usuário|usuários|nenhum|nenhuma|evidência|pesquisa|inferência|sobre|deve ser|pode ser|guarda|cliente|conceito)\b'

hits=$(grep -rniE "$pattern" skills/ docs/design/ docs/*.md tests/ types/ *.md 2>/dev/null \
  | grep -v '^CHANGELOG.md' \
  | grep -v '^docs/archive/' \
  | grep -v 'https\?://' \
  | grep -viE 'cobra effect' || true)

if [ -n "$hits" ]; then
  printf '%s\n' "$hits"
  echo "check-language: Portuguese text found (see lines above)" >&2
  exit 1
fi

echo "check-language: ok (skills and documents are English)"
