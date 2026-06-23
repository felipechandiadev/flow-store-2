# Variables de entorno — desarrollo local (403x)

Mismos puertos que producción PM2 (`/root/kai/jyrt/envs/`). No choca con Don Walter (303x).

## Uso rápido

```bash
./envs/sync-dev-envs.sh
```

O manualmente desde la raíz del repo:

```bash
cp envs/backend.env backend/.env
cp envs/pwa-admin.env.local pwa-admin/.env.local
cp envs/pwa-pos.env.local pwa-pos/.env.local
cp envs/pwa-eshop.env.local pwa-eshop/.env.local
cp envs/pwa-stock.env.local pwa-stock/.env.local
cp envs/kai-mail.env services/kai-mail/.env
```

## Puertos por app

| App        | Puerto | Archivo destino              |
|------------|--------|------------------------------|
| Backend    | 4030   | `backend/.env`               |
| pwa-admin  | 4031   | `pwa-admin/.env.local`       |
| pwa-pos    | 4032   | `pwa-pos/.env.local`         |
| pwa-stock  | 4033   | `pwa-stock/.env.local`       |
| pwa-eshop  | 4034   | `pwa-eshop/.env.local`       |
| kai-mail   | 4040   | `services/kai-mail/.env`     |

## Notas

- Esta carpeta contiene **secretos de desarrollo** y está en `.gitignore`.
- `NEXT_PUBLIC_COMPANY_ID` en POS/Stock debe coincidir con la empresa del seed (Joyarte u otra).
- `NEXT_PUBLIC_ESHOP_STORE_SLUG` debe coincidir con `settings.eShopPublicSlug` de la empresa.
- Si pruebas desde otro equipo en la LAN, reemplaza `localhost` por la IP del host en URLs y `CORS_ORIGIN` del backend.
