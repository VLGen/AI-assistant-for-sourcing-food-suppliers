# Goulash

MVP-сервис подбора поставщиков food-продукции с AI-анализом через vsegpt и модель Qwen 3 14B, а также PostgreSQL в качестве основной БД.

## Стек

- Next.js 16 App Router
- TypeScript
- Prisma + PostgreSQL
- vsegpt API
- Qwen 3 14B
- Zod v4 validation
- Tailwind + shadcn/ui

## Что важно

- База данных — PostgreSQL
- Prisma работает через `postgresql` provider.
- AI API использует vsegpt, совместимый с OpenAI `chat/completions`.

## Требования

Перед запуском убедитесь, что у вас установлены:

- Node.js 20+
- npm
- Docker Desktop / Docker Engine
- доступ к vsegpt API

## Запуск локально

1. Установите зависимости:

```bash
npm install
```

2. Поднимите локальную PostgreSQL:

```bash
docker compose up -d db
```

3. Создайте локальный `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

4. Синхронизируйте схему с базой:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

5. Заполните БД тестовыми данными:

```bash
npx prisma db seed
```

6. Настройте переменные окружения для vsegpt и Qwen 3 14B:

```env
OPENROUTER_API_KEY="your_vsegpt_api_key_here"
OPENROUTER_MODEL="qwen/qwen3-14b"
OPENROUTER_BASE_URL="https://api.vsegpt.ru/v1"
```

7. Запустите приложение:

```bash
npm run dev
```

8. Откройте приложение в браузере:

```text
http://localhost:3000
```

## Переменные окружения

Пример находится в [.env.example](.env.example).

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/goulash?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
OPENROUTER_API_KEY="your_vsegpt_api_key_here"
OPENROUTER_MODEL="qwen/qwen3-14b"
OPENROUTER_BASE_URL="https://api.vsegpt.ru/v1"
```

### Описание

- `DATABASE_URL` — строка подключения к PostgreSQL
- `OPENROUTER_API_KEY` — ключ доступа к vsegpt
- `OPENROUTER_MODEL` — используемая модель `qwen/qwen3-14b`
- `OPENROUTER_BASE_URL` — endpoint vsegpt
- `NEXT_PUBLIC_APP_URL` — публичный URL фронтенда

## Локальная PostgreSQL

В проекте используется контейнер PostgreSQL:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: goulash
    ports:
      - "5432:5432"
```

Если контейнер уже запущен, достаточно выполнить:

```bash
docker compose up -d db
```

## Prisma команды

```bash
npx prisma migrate dev --name init
npx prisma migrate reset
npx prisma db seed
npx prisma generate
npx prisma studio
```

## Деплой

### Frontend

Фронтенд можно деплоить на Vercel, Render, Railway и другие платформы, которые поддерживают Next.js.

### PostgreSQL

Для продакшн-сценария лучше использовать managed PostgreSQL:

- Supabase
- Neon
- Railway
- Render
- VPS с PostgreSQL

### vsegpt

AI-аналитика работает через vsegpt и модель Qwen 3 14B

#### Vercel / внешний frontend

```env
OPENROUTER_API_KEY="your_vsegpt_api_key_here"
OPENROUTER_MODEL="qwen/qwen3-14b"
OPENROUTER_BASE_URL="https://api.vsegpt.ru/v1"
```

Плюсы:
- подходит для демонстраций и продакшн-окружений
- легко масштабируется через API

Минусы:
- нужен рабочий API-ключ vsegpt
- зависит от внешнего провайдера по сети

## Полезные команды

```bash
npm install
npm run build
npm run dev
```

## Примечание по продакшену

Для production-версии рекомендуется:

- держать PostgreSQL в managed сервисе
- использовать внешний vsegpt API
- не полагаться на локальный Docker на клиентской машине
- настраивать переменные окружения через платформенные секреты

## Проверка работоспособности

После запуска приложения проверьте:

1. Главную страницу по адресу `http://localhost:3000`
2. Поиск поставщиков
3. Сравнение 2–4 поставщиков
4. AI-анализ через Qwen 3 14B
5. Сохранение shortlist
6. БД через Prisma Studio / миграции

Если все шаги работают, проект готов к локальной разработке и demo-демонстрации.
