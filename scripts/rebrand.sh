#!/usr/bin/env bash
# rebrand.sh — Rebrand Node Banana → ContentWiz after upstream merges
# Run manually or automatically via .git/hooks/post-merge
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ContentWiz SVG logo (magic wand with sparkles)
LOGO_SVG_HEADER='<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 21L13 11M13 11L9.5 7.5M13 11L16.5 7.5" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 3L16.5 5.5L19 4L17.5 6.5L20 8L17.5 7.5L17 10L15.5 7.5L13 8L14.5 5.5L15 3Z" fill="#a78bfa"/>
            <circle cx="7" cy="4" r="1" fill="#c4b5fd"/>
            <circle cx="21" cy="12" r="1" fill="#c4b5fd"/>
          </svg>'

LOGO_SVG_QUICKSTART='<svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 21L13 11M13 11L9.5 7.5M13 11L16.5 7.5" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 3L16.5 5.5L19 4L17.5 6.5L20 8L17.5 7.5L17 10L15.5 7.5L13 8L14.5 5.5L15 3Z" fill="#a78bfa"/>
                <circle cx="7" cy="4" r="1" fill="#c4b5fd"/>
                <circle cx="21" cy="12" r="1" fill="#c4b5fd"/>
              </svg>'

changed=0

# --- layout.tsx: page title ---
FILE="$ROOT/src/app/layout.tsx"
if grep -q "Node Banana" "$FILE" 2>/dev/null; then
  sed -i '' 's/Node Banana - AI Image Workflow/ContentWiz - AI Image Workflow/' "$FILE"
  sed -i '' 's/Node-based image annotation and generation workflow using Nano Banana Pro/Node-based image annotation and generation workflow using AI/' "$FILE"
  changed=1
fi

# --- Header.tsx: logo + title ---
FILE="$ROOT/src/components/Header.tsx"
if grep -q 'banana_icon.png' "$FILE" 2>/dev/null; then
  # Replace banana img tag with SVG
  sed -i '' 's|<img src="/banana_icon.png" alt="Banana" className="w-6 h-6" />|'"$(echo "$LOGO_SVG_HEADER" | tr '\n' ' ')"'|' "$FILE"
  changed=1
fi
if grep -q "Node Banana" "$FILE" 2>/dev/null; then
  sed -i '' 's/Node Banana/ContentWiz/g' "$FILE"
  changed=1
fi

# --- QuickstartInitialView.tsx: logo + title ---
FILE="$ROOT/src/components/quickstart/QuickstartInitialView.tsx"
if grep -q 'banana_icon.png' "$FILE" 2>/dev/null; then
  sed -i '' 's|<img src="/banana_icon.png" alt="" className="w-7 h-7" />|'"$(echo "$LOGO_SVG_QUICKSTART" | tr '\n' ' ')"'|' "$FILE"
  changed=1
fi
if grep -q "Node Banana" "$FILE" 2>/dev/null; then
  sed -i '' 's/Node Banana/ContentWiz/g' "$FILE"
  changed=1
fi

# --- Tests ---
for FILE in \
  "$ROOT/src/components/__tests__/Header.test.tsx" \
  "$ROOT/src/components/__tests__/WelcomeModal.test.tsx" \
  "$ROOT/src/components/__tests__/QuickstartInitialView.test.tsx"; do
  if [ -f "$FILE" ] && grep -q "Node Banana" "$FILE" 2>/dev/null; then
    sed -i '' 's/Node Banana/ContentWiz/g' "$FILE"
    changed=1
  fi
done

# --- Header test: remove banana icon assertion if it exists ---
FILE="$ROOT/src/components/__tests__/Header.test.tsx"
if [ -f "$FILE" ] && grep -q 'banana_icon' "$FILE" 2>/dev/null; then
  # Remove the banana icon test block (it references an img that no longer exists)
  sed -i '' '/should render the banana icon/,/});/d' "$FILE"
  changed=1
fi

if [ "$changed" -eq 1 ]; then
  echo "[rebrand] ContentWiz branding applied."
else
  echo "[rebrand] Already branded as ContentWiz, nothing to do."
fi
