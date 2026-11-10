<h1 align="center">New World</h1>

<p align="center">
  <b>AI video and visual creation workspace</b><br/>
  Turn an idea into script, storyboard, visuals, video and post-production — or use the built-in chat, text-to-image and image-to-image tools.
</p>

<p align="center">
  <a href="./README.md">简体中文</a> · <b>English</b>
</p>

---

## Features

### Video generation

- Describe a story, product or destination and generate a complete video
- Choose 5 / 10 / 15 seconds per clip
- Automatic script, character and scene design, storyboard, reference images, video and post-production
- Review, edit and regenerate every stage

### Creation tools

- **LLM chat** with model selection and web search
- **Text to image**, including a product-poster mode
- **Image to image** style transformation

Tools run directly inside the workbench; results appear in an overlay without leaving the page.

### Desktop client

- Native Electron window
- Dark HUD / glass interface
- Boot cover and workbench
- The client manages the local backend and renderer

## Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, TypeScript
- **Backend**: FastAPI, Python 3.12, uv
- **Desktop**: Electron
- **Workflow**: scenario packages, multi-stage agents, SSE progress streaming

## Quick start

### Requirements

- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- Node.js 18+
- ffmpeg

### Configuration

```bash
cp backend/config.yaml.example backend/config.yaml
```

Add model-provider keys to `backend/config.yaml` or `.env`. `backend/config.yaml` is git-ignored.

### Web

```bash
./scripts/dev.sh
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### Desktop

```bash
cd frontend
npm install
npm run desktop
```

## Testing

```bash
cd backend && uv run --extra dev pytest
cd frontend && npx tsc --noEmit && npm run build
```

## License

[MIT](./LICENSE)

Copyright (c) 2026 Mat11-oo
