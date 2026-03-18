# DevAgent UI — Setup Instructions

## Folder Structure
Place files like this inside your deep-multiagent folder:

```
deep-multiagent/
├── agents/
│   └── deep_agent.py
├── workspace/
├── ui/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       └── components/
│           ├── Sidebar.jsx
│           ├── ChatPanel.jsx
│           ├── ProjectsPanel.jsx
│           └── MemoryPanel.jsx
├── server.py          ← Flask backend
├── main.py
├── models.py
├── memory.py
└── mcp_servers.py
```

## Step 1 — Install Python deps
```powershell
cd C:\Users\vadla\Downloads\deep-multiagent
pip install flask flask-cors --break-system-packages
```

## Step 2 — Install React deps
```powershell
cd ui
npm install
```

## Step 3 — Run backend (Terminal 1)
```powershell
cd C:\Users\vadla\Downloads\deep-multiagent
python server.py
```
You should see:
```
DevAgent UI Server
http://localhost:8888
```

## Step 4 — Run frontend (Terminal 2)
```powershell
cd C:\Users\vadla\Downloads\deep-multiagent\ui
npm run dev
```
You should see:
```
VITE ready at http://localhost:5174
```

## Step 5 — Open browser
```
http://localhost:5174
```

## Features
- Chat with agent in real time
- See every tool call live as it happens
- Browse all your projects + read files
- View memory and stats
- Switch models from sidebar
- Select project context for chat
