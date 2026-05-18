# Frontend Noi That Moc Viet

Frontend React cho he thong web ban noi that.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

## Chay local

```bash
copy .env.example .env
bun install
bun run dev
```

Frontend se goi API den `http://127.0.0.1:8000/api/v1` theo file `.env.example`.

## Build production

```bash
bun run build
```

## Docker

Project co san `Dockerfile` va `nginx.conf` de build frontend va reverse proxy API qua Nginx.
