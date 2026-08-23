# GitHub Docs Flattener & MD Converter

A high-performance web utility designed to prepare deeply nested GitHub documentation for LLMs, PDF converters, and offline reading. It resolves GitHub directory URLs or local ZIP archives, flattens the file structure, and sanitizes MDX/JSX into clean Markdown.

![License](https://img.shields.io/github/license/humiditron/md_utility)
![Docker](https://img.shields.io/badge/docker-ready-blue)
![Pages](https://img.shields.io/badge/hosted-github_pages-pink)

## 🚀 Key Features

- **GitHub Tree Resolution**: Provide a URL (e.g., `facebook/react/tree/main/docs`) and the app will stream the files directly via GitHub API.
- **Directory Flattening**: Converts `docs/api/auth.md` into `docs__api__auth.md` to prevent filename collisions in flat environments.
- **MDX to Markdown**: Strips JSX tags, converts Admonitions (`<Note>`, `<Warning>`) into standard blockquotes, and removes JS imports/exports.
- **Asset Handling**: Replaces relative image/file links with stylish dummy placeholders to ensure documents remain readable without local assets.
- **ISO A4 PDF Export**: Includes a built-in print engine with Table of Contents and Cover Page generation.
- **Privacy First**: All processing happens **locally in your browser**. No data is uploaded to a server.

## 🛠 Usage

### 1. Web Version (Instant)
Access the live tool at: **[humiditron.github.io/md_utility](https://humiditron.github.io/md_utility)**

### 2. Docker (Local/Self-Hosted)
Pull and run the pre-compiled image:
```bash
docker run -p 3000:3000 ghcr.io/humiditron/md_utility:latest
```
Access at `http://localhost:3000`.

### 3. Local Development
```bash
git clone https://github.com/humiditron/md_utility.git
cd your-repo-name
npm install
npm run dev
```

## 📄 Configuration Settings

- **Separator**: Choose between `__`, `--`, or `.` for path flattening.
- **Strip Root**: Automatically removes the top-level GitHub folder (e.g., `repo-main/`).
- **Placeholder Style**: Select from various banner styles for missing assets.
- **Dark Mode**: Fully supports system-level dark/light theme switching.

## ⚖️ License
MIT - Created for the developer community.

## Co-authored with: 
- *Gemini 3 Flash-Preview*

