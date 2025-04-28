# Full-Stack Housing Price Map and Chatbot System

Urban Transit and Real Estate: DMV Area Metro-Centric Price Map

> A full-stack project integrating a React frontend and a FastAPI backend with Supabase PostgreSQL database and a LangChain-powered chatbot.
> 

---
<img width="1512" alt="Group 2" src="https://github.com/user-attachments/assets/26de512e-3f2d-4834-a8a8-a93705f24399" />


# 📄 Introduction

Public transportation, particularly subway systems, plays a crucial role in urban housing markets, influencing property values based on proximity and accessibility. This study presents a Database Management System (DBMS)-based web application that analyzes and visualizes the relationship between subway stations and housing prices. Our system integrates real estate transaction data, public transit information, and geographic mapping tools to provide an interactive user interface.

By clicking on a subway station, users can view nearby property prices, recent market trends, and comparative analytics. The database is designed for efficient spatial querying, enabling real-time retrieval and visualization of housing price variations.

Additionally, the system incorporates time-series analysis to detect fluctuations in property values over different periods. Our approach leverages structured data storage, indexing techniques, and optimization strategies to enhance query performance.

To further improve user experience, a chatbot powered by a LangChain LLM (Large Language Model) is integrated into the system. Users can interact with the chatbot by asking natural language questions about housing prices, market trends, or station-related information. The backend automatically translates these questions into SQL queries, retrieves relevant data, and responds with clear, human-readable answers.

Experimental results demonstrate the effectiveness of our platform in providing urban planners, investors, and residents with data-driven insights into the impact of metro accessibility on property values.

# 🔧 Setup Instructions

## 1. Backend (FastAPI + LangChain + Supabase)

### Python Environment Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

```

> requirements.txt includes:
> 
> - FastAPI (>=0.100.0)
> - Uvicor
> - SQLAlchemy
> - LangChain (community, experimental, openai)
> - psycopg2-binary
> - python-dotenv

### Environment Variables (.env file)

Create a `.env` file at the project root with:

```bash
DB_USER=<your-database-username>
PASSWORD=<your-database-password>
DB_HOST=<your-supabase-db-host>
DB_NAME=<your-database-name>
OPENAI_API_KEY=<your-openai-api-key>

```

### Running the Backend

```bash
uvicorn main:app --reload
```

- API runs at [http://localhost:8000](http://localhost:8000/)

---

## 2. Frontend (React inside `src/` folder)

### Node.js Environment Setup

```bash
npm install

```

This installs:

- React 19
- React Router DOM 7.5
- Supabase JS SDK
- Leaflet (Maps)
- Recharts (Charts)

### Running the Frontend

```bash
npm start

```

- App available at [http://localhost:3000](http://localhost:3000/)
- React source files are under the `src/` directory.

### Frontend Features

- Map visualization of housing data (Leaflet)
- Chat widget powered by backend chatbot API (`src/components/ChatWidget/`)
- Charts for station and zipcode data (`src/services/`)
- Supabase client setup (`src/supabaseClient.js`)

---

# 📁 Project Structure Overview

```bash
|-- main.py                      # FastAPI main app
|-- langchain_supabase_rag.py     # Backend LangChain + DB handler
|-- requirements.txt             # Python packages
|-- package.json                 # React app settings
|-- public/                      # React public assets
|-- src/                         # React frontend code
|   |-- App.js, index.js          # Entry points
|   |-- supabaseClient.js         # Connects to Supabase
|   |-- components/               # UI Components (ChatWidget, MapView)
|   |-- services/                 # API services (chatbot, charts)
|   |-- styles/                   # CSS files
|-- node_modules/                 # Installed Node.js dependencies
|-- __pycache__/                  # Python cache

```

---

# 🚀 Deployment Guide

### Backend (FastAPI)

- Deploy using Uvicorn/Gunicorn on AWS EC2, Render, or HuggingFace.
- Set up environment variables properly.

### Frontend (React)

- Build production version:

```bash
npm run build
```


---

# 📊 Tech Stack Summary

| Technology | Version |
| --- | --- |
| Python | >=3.8 |
| Node.js | >=18.x |
| FastAPI | >=0.100.0 |
| React | 19.x |
| Supabase | PostgreSQL backend |
| LangChain | 0.0.30+ |

---

# 📢 Notes

- Backend runs on port 8000.
- Frontend runs on port 3000.
- Make sure CORS is handled properly if deploying separately.
- Monitor OpenAI API key usage to prevent unexpected billing.

---

# 👤 Author

- **Wilson (Chen-Wei Chang, wilsonchang@vt.edu)** 
- **Sophia (Yu-Chieh Cheng, yj24@vt.edu)**
- **Eyan (Yun-En Tsai, yunen@vt.edu)**

Virginia Tech

---
