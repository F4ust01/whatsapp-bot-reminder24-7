# Imagen base de Debian con Node 18 — incluye las libs que necesita Chromium
FROM node:18-bullseye-slim

# Instalar todas las dependencias del sistema que necesita Chromium/Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    fonts-liberation \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Decirle a Puppeteer que NO descargue su propio Chrome,
# sino que use el chromium que acabamos de instalar con apt
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Directorio de trabajo dentro del container
WORKDIR /app

# Copiar package.json primero (para aprovechar cache de Docker)
COPY package*.json ./

# Instalar dependencias de Node
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer puerto (Railway lo requiere aunque el bot no sea un servidor HTTP)
EXPOSE 3000

# Comando de inicio
CMD ["node", "index.js"]
