#!/usr/bin/env bash
# Copia envs de desarrollo (403x, mismo rango que prod PM2). No toca .env.production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENVS="$(cd "$(dirname "$0")" && pwd)"

cp "$ENVS/backend.env" "$ROOT/backend/.env"
cp "$ENVS/pwa-admin.env.local" "$ROOT/pwa-admin/.env.local"
cp "$ENVS/pwa-pos.env.local" "$ROOT/pwa-pos/.env.local"
cp "$ENVS/pwa-eshop.env.local" "$ROOT/pwa-eshop/.env.local"
cat > "$ROOT/pwa-eshop/.env.development.local" <<'EOF'
BACKEND_API_URL=http://localhost:4030
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:4030
NEXT_PUBLIC_ESHOP_SITE_URL=http://localhost:4034
EOF
cp "$ENVS/pwa-stock.env.local" "$ROOT/pwa-stock/.env.local"
cp "$ENVS/kai-mail.env" "$ROOT/services/kai-mail/.env"

echo "[sync-dev-envs] Desarrollo 403x aplicado:"
echo "  backend/.env              PORT=4030"
echo "  pwa-admin/.env.local      :4031"
echo "  pwa-pos/.env.local        :4032"
echo "  pwa-stock/.env.local      :4033"
echo "  pwa-eshop/.env.local      :4034"
echo "  services/kai-mail/.env    :4040"
