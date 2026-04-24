FROM python:3.11-slim

# Dependencias del sistema que necesita Playwright/Chromium
RUN apt-get update && apt-get install -y \
    curl \
    cron \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Instalar Chromium con todas sus dependencias del sistema (~1.2 GB, es normal)
RUN playwright install chromium --with-deps

COPY . .

# Por defecto corre fase2 en modo daemon. Se puede sobrescribir en docker-compose.
CMD ["python", "fase2_paralelo.py", "--daemon", "--workers", "2"]
