# Используем официальный Node.js образ
FROM node:18-alpine AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Production образ
FROM node:18-alpine AS production

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S worktimeuser -u 1001

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json для production зависимостей
COPY package*.json ./

# Устанавливаем только production зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем собранное приложение
COPY --from=builder /app/dist ./dist

# Создаем директории для логов и uploads
RUN mkdir -p logs uploads && chown -R worktimeuser:nodejs /app

# Переключаемся на непривилегированного пользователя
USER worktimeuser

# Открываем порт
EXPOSE 3001

# Команда для запуска
CMD ["node", "dist/index.js"] 