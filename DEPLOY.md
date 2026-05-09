# Deploy automático a VPS Hostinger

Este proyecto usa **GitHub Actions** para desplegar automáticamente a `lacasonasanmartin.cl` cada vez que se pushea a `main`.

## Setup inicial (solo se hace una vez)

### 1. En tu VPS Hostinger

Conectate por SSH y prepará el directorio web:

```bash
ssh tu-usuario@IP-DE-TU-VPS

# Backup de WordPress (por si acaso)
sudo mv /var/www/html /var/www/wordpress-backup-$(date +%Y%m%d)
sudo mkdir -p /var/www/html
sudo chown -R $USER:$USER /var/www/html
```

> Reemplazá `/var/www/html` por la ruta real donde Hostinger sirve tu dominio. Para descubrirla: `sudo nginx -T 2>/dev/null | grep -E "root|server_name" | head` (o `apache2ctl -S`).

### 2. Generá un par de claves SSH dedicadas al deploy

Estas claves **vivirán solo en el VPS y en GitHub** — no las uses para nada más.

En el VPS:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "github-actions@lacasonasanmartin"
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/github_deploy   # copiá ESTA salida — es la clave privada que va a GitHub
```

Guardá la salida del último `cat` (clave privada completa, incluyendo `-----BEGIN OPENSSH PRIVATE KEY-----` ... `-----END OPENSSH PRIVATE KEY-----`).

### 3. Configurá el webserver para servir el sitio estático

Como el sitio React es 100% estático (sin PHP), reemplazá la config de WordPress por una más simple.

**nginx** — editá `/etc/nginx/sites-enabled/lacasonasanmartin.cl` (o `/etc/nginx/conf.d/...`):

```nginx
server {
  listen 80;
  server_name lacasonasanmartin.cl www.lacasonasanmartin.cl;
  root /var/www/html;
  index index.html;

  # SPA fallback (no estrictamente necesario aquí porque uso anchor links, pero no estorba)
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache largo para assets versionados de Vite
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**Apache** — en `.htaccess` dentro de `/var/www/html/`:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### 4. HTTPS con Let's Encrypt (si no lo tenés)

```bash
sudo certbot --nginx -d lacasonasanmartin.cl -d www.lacasonasanmartin.cl
# o --apache
```

### 5. Subí el repo a GitHub

Desde tu Mac:

```bash
cd "/Users/fravillalo/Documents/CloudCode VScode/Lacasonasanmartin"

# Si no tenés gh CLI: https://cli.github.com/  (brew install gh)
gh auth login
gh repo create lacasonasanmartin --private --source=. --remote=origin --push
```

O manual:

```bash
# Creá el repo en https://github.com/new (privado)
git remote add origin git@github.com:TU-USER/lacasonasanmartin.git
git branch -M main
git push -u origin main
```

### 6. Configurá los secrets en GitHub

En el repo recién creado: **Settings → Secrets and variables → Actions → New repository secret**.

Agregá estos 5 secrets:

| Nombre | Valor |
|---|---|
| `VPS_HOST` | IP pública o dominio del VPS (ej: `45.123.45.67` o `lacasonasanmartin.cl`) |
| `VPS_USER` | Usuario SSH (ej: `root` o `ubuntu` — el que usás para conectarte) |
| `VPS_PORT` | Puerto SSH (`22` por defecto, Hostinger a veces usa otros) |
| `VPS_PATH` | Ruta absoluta donde sirve el web (ej: `/var/www/html/`) |
| `VPS_SSH_PRIVATE_KEY` | Pegá completo el contenido del paso 2 (clave privada `~/.ssh/github_deploy`) |

> ⚠️ El `VPS_PATH` **debe terminar con `/`** y la barra es importante para rsync.

### 7. Ya está

Cualquier `git push` a `main` dispara el workflow. El primer push después de los secrets ya despliega:

```bash
git commit --allow-empty -m "trigger first deploy"
git push
```

Mirá la pestaña **Actions** del repo para ver el progreso. Si todo va bien, en ~2 minutos `https://lacasonasanmartin.cl` está sirviendo la nueva web.

## Workflow día-a-día

1. Hago cambios en el código (en mi Mac).
2. `git add . && git commit -m "mensaje" && git push`
3. GitHub Actions corre: `npm install` → `npm run build` → `rsync dist/ → VPS`
4. ~2 minutos después está en producción.

## Troubleshooting

- **El workflow falla con "Permission denied (publickey)"** → la clave privada de los secrets no coincide con la pública en `~/.ssh/authorized_keys` del VPS. Re-generá y volvé a copiar.
- **El sitio carga pero las imágenes no** → el rsync no copió `photos/`. Asegurate de que `VPS_PATH` apunte al directorio correcto y que `--delete` no esté borrando archivos importantes fuera de `dist/`.
- **WordPress sigue apareciendo** → el webserver todavía sirve el `index.php` viejo. Borrá o renombrá `index.php` y recargá nginx/Apache.

## Rollback rápido

Si un deploy rompe algo, en el VPS:

```bash
sudo cp -r /var/www/wordpress-backup-YYYYMMDD/* /var/www/html/
sudo systemctl reload nginx
```

(O simplemente `git revert` el último commit en main → push → vuelve a desplegar la versión anterior.)
