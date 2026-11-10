<h1 align="center">New World</h1>

<p align="center">
  <b>AI 视频与视觉创作工作台</b><br/>
  从一句想法出发，完成剧本、分镜、画面、视频与后期；也可以直接使用对话、文生图和图生图工具。
</p>

<p align="center">
  <b>简体中文</b> · <a href="./README_EN.md">English</a>
</p>

---

## 功能

### 视频生成

- 输入故事、产品或目的地描述，生成一条完整视频
- 单段视频时长可选 5 / 10 / 15 秒
- 自动完成剧本、角色与场景、分镜、参考图、视频和后期
- 每个阶段都可查看、确认、修改和重新生成

### 创作工具

- **LLM 对话**：支持模型切换、联网搜索
- **文生图**：普通图片生成与商品海报模式
- **图生图**：上传参考图进行风格转换

工具直接在工作台当前页面操作，不跳转独立页面，结果以浮层展示。

### 桌面客户端

- 原生 Electron 窗口，不依赖浏览器标签页
- 深色 HUD / 玻璃拟态界面
- 启动封面与工作台
- 由客户端自动托管本地后端和渲染进程

## 技术栈

- **前端**：Next.js 16、React 19、Tailwind CSS 4、TypeScript
- **后端**：FastAPI、Python 3.12、uv
- **桌面端**：Electron
- **流程**：场景包 + 多阶段 Agent + SSE 进度流

## 快速开始

### 环境要求

- Python 3.12+ 与 [uv](https://docs.astral.sh/uv/)
- Node.js 18+
- ffmpeg

### 配置

```bash
cp backend/config.yaml.example backend/config.yaml
```

在 `backend/config.yaml` 或 `.env` 中填写模型服务密钥。`backend/config.yaml` 已被 git 忽略，不会提交。

### 启动 Web

```bash
./scripts/dev.sh
```

- 前端：http://localhost:3000
- 后端：http://localhost:8000

也可以分别启动：

```bash
cd backend && uv run python api_server.py
cd frontend && npm install && npm run dev
```

### 启动桌面客户端

```bash
cd frontend
npm install
npm run desktop
```

`npm run desktop` 会先构建前端，再打开原生客户端窗口。

## 目录结构

```text
backend/
  api/                 FastAPI 路由
  core/                工作流引擎、阶段注册与 Agent
  models/              模型客户端与注册表
  scenarios/           场景包
  templates/           画面模板
frontend/
  app/                 Next.js App Router
  components/          工作台、阶段界面、工具与设置
  electron/            Electron 主进程与客户端样式
  lib/                 前端 API 与类型
docs/                  架构、配置、扩展与 API 文档
scripts/               开发脚本
```

## 场景与模型

场景包位于 `backend/scenarios/<id>/`，通过 `scenario.yaml` 声明阶段、默认参数、界面文案与提示词覆盖。模型通过 `backend/registry/models.yaml` 注册，可在生成设置中选择。

## 测试

```bash
cd backend && uv run --extra dev pytest
cd frontend && npx tsc --noEmit && npm run build
```

## License

[MIT](./LICENSE)

Copyright (c) 2026 Mat11-oo
