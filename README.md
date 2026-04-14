# Sc₹awnySpend - Smart Expense Tracker

Sc₹awnySpend is an AI-powered, full-stack personal finance application. It allows users to track their expenses, visualize financial habits, and receive machine-learning-driven budget predictions and anomaly detection. 

The entire project is built on a modern, 100% free cloud-native architecture deployed across Netlify, Render, and MongoDB Atlas.

## System Architecture

```mermaid
graph TD
    %% Styling
    classDef frontend fill:#3b0764,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef backend fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff
    classDef database fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff
    classDef ai fill:#78350f,stroke:#f59e0b,stroke-width:2px,color:#fff

    subgraph Client ["Client (React PWA • Netlify)"]
        UI[Frontend UI<br/>React + Tailwind + Vite]:::frontend
        AuthStore[State Management<br/>Zustand Store]:::frontend
    end

    subgraph API ["Backend (Node.js • Render)"]
        Gateway[Express Gateway<br/>Rate Limiting + Routing]:::backend
        Services[Business Logic<br/>Auth + OTP Verification]:::backend
        AILink[AI Engine Bridge<br/>Axios REST Client]:::backend
    end

    subgraph ML ["AI Engine (Python • Render)"]
        Flask[Flask API<br/>Gunicorn Target]:::ai
        Classifier[Spend Classifier<br/>Scikit-Learn]:::ai
        Predictor[Budget Predictor<br/>Tensorflow/Keras]:::ai
    end

    subgraph DB ["Data Layer (MongoDB Atlas)"]
        Atlas[(MongoDB Cluster<br/>Users + Expenses)]:::database
    end

    %% Flow routes
    UI -- "HTTPS/REST (JWT)" --> Gateway
    Gateway --> Services
    Services -- "Google Apps Script" --> Email[OTP Webhook]
    Services -- "Mongoose OGM" --> Atlas
    Services -- "Async Trigger" --> AILink
    AILink -- "HTTPS/REST (Secure)" --> Flask
    Flask --> Classifier
    Flask --> Predictor
    Flask -- "Read/Write" --> Atlas
```

## Data Lifecycle & AI Integration Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as User (PWA)
    participant React as Netlify (Frontend)
    participant Node as Render (Node.js API)
    participant Mongo as Atlas (MongoDB M0)
    participant Python as Render (Python AI)

    User->>React: Submits new Expense
    React->>Node: POST /api/expenses (with JWT)
    Node->>Mongo: Validate & Save Expense to DB
    Mongo-->>Node: 201 Created (Expense ID)
    
    %% Async AI Trigger
    rect rgb(20, 30, 40)
    Note right of Node: Non-blocking AI Trigger
    Node-)Python: POST /api/ai/classify (Internal Request)
    Python->>Mongo: Retrieve Last 30 Days Context
    Python->>Python: Run Isolation Forest (Anomaly)<br/>Run ANN (Prediction)
    Python->>Mongo: Save Insights & Flags
    end
    
    Node-->>React: Response 201 OK
    React-->>User: Updates UI Dashboard
    
    %% Subsequent Read
    User->>React: Clicks "AI Insights" Tab
    React->>Node: GET /api/ai/insights
    Node->>Mongo: Fetch Stored Python Predictions
    Node-->>React: Returns JSON
    React-->>User: Renders Custom AI Dashboard
```




```mermaid
flowchart TD

subgraph group_group_frontend["Frontend"]
  node_frontend_app["React app<br/>SPA shell<br/>[App.jsx]"]
  node_frontend_pages["Pages<br/>screens"]
  node_frontend_components["UI components<br/>view components"]
  node_frontend_hooks["Client hooks<br/>state hooks"]
  node_frontend_api["API client<br/>service layer<br/>[api.js]"]
  node_frontend_store[("Auth store<br/>zustand state<br/>[authStore.js]")]
end

subgraph group_group_backend["Backend"]
  node_backend_entry["Server entry<br/>node bootstrap<br/>[server.js]"]
  node_backend_app["Express app<br/>api shell<br/>[app.js]"]
  node_backend_auth["Auth domain<br/>controller-service<br/>[auth.controller.js]"]
  node_backend_expenses["Expenses domain<br/>controller-service"]
  node_backend_budgets["Budgets domain<br/>controller-service"]
  node_backend_analytics["Analytics domain<br/>aggregation service"]
  node_backend_reports["Reports domain<br/>reporting"]
  node_backend_ai_bridge["AI bridge<br/>integration service<br/>[aiService.js]"]
  node_backend_db[("MongoDB<br/>persistence<br/>[db.js]")]
  node_backend_models[("Domain models<br/>mongoose models")]
  node_backend_utils["Shared infra<br/>cross-cutting"]
end

subgraph group_group_ai["AI Engine"]
  node_ai_app["Flask app<br/>python api<br/>[app.py]"]
  node_ai_routes["AI routes<br/>inference endpoints"]
  node_ai_preprocess["Preprocessor<br/>feature prep<br/>[preprocessor.py]"]
  node_ai_models[("ML models<br/>trained assets")]
end

node_frontend_pages -->|"renders"| node_frontend_components
node_frontend_app -->|"routes"| node_frontend_pages
node_frontend_app -->|"reads auth"| node_frontend_store
node_frontend_pages -->|"uses"| node_frontend_hooks
node_frontend_hooks -->|"calls"| node_frontend_api
node_frontend_components -->|"submit data"| node_frontend_api
node_frontend_api -->|"HTTP"| node_backend_app
node_backend_entry -->|"boots"| node_backend_app
node_backend_app -->|"middleware"| node_backend_utils
node_backend_app -->|"mounts"| node_backend_auth
node_backend_app -->|"mounts"| node_backend_expenses
node_backend_app -->|"mounts"| node_backend_budgets
node_backend_app -->|"mounts"| node_backend_analytics
node_backend_app -->|"mounts"| node_backend_reports
node_backend_app -->|"mounts"| node_backend_ai_bridge
node_backend_auth -->|"uses"| node_backend_models
node_backend_expenses -->|"uses"| node_backend_models
node_backend_budgets -->|"uses"| node_backend_models
node_backend_analytics -->|"aggregates"| node_backend_db
node_backend_reports -->|"reads"| node_backend_db
node_backend_ai_bridge -->|"HTTP"| node_ai_app
node_ai_app -->|"serves"| node_ai_routes
node_ai_routes -->|"prep"| node_ai_preprocess
node_ai_routes -->|"runs"| node_ai_models
node_ai_app -->|"reads/writes"| node_backend_db
node_backend_ai_bridge -->|"stores outputs"| node_backend_models

click node_frontend_app "https://github.com/park-bit/scrawny-spend/blob/main/frontend/src/App.jsx"
click node_frontend_pages "https://github.com/park-bit/scrawny-spend/tree/main/frontend/src/pages"
click node_frontend_components "https://github.com/park-bit/scrawny-spend/tree/main/frontend/src/components"
click node_frontend_hooks "https://github.com/park-bit/scrawny-spend/tree/main/frontend/src/hooks"
click node_frontend_api "https://github.com/park-bit/scrawny-spend/blob/main/frontend/src/services/api.js"
click node_frontend_store "https://github.com/park-bit/scrawny-spend/blob/main/frontend/src/store/authStore.js"
click node_backend_entry "https://github.com/park-bit/scrawny-spend/blob/main/backend/server.js"
click node_backend_app "https://github.com/park-bit/scrawny-spend/blob/main/backend/src/app.js"
click node_backend_auth "https://github.com/park-bit/scrawny-spend/blob/main/backend/src/controllers/auth.controller.js"
click node_backend_expenses "https://github.com/park-bit/scrawny-spend/blob/main/backend/src/controllers/expense.controller.js"
click node_backend_budgets "https://github.com/park-bit/scrawny-spend/blob/main/backend/src/controllers/budget.controller.js"
click node_backend_analytics "https://github.com/park-bit/scrawny-spend/blob/main/backend/src/controllers/analytics.controller.js"
click node_backend_reports "https://github.com/park-bit/scrawny-spend/blob/main/backend/src/controllers/report.controller.js"
click node_backend_ai_bridge "https://github.com/park-bit/scrawny-spend/blob/main/backend/src/services/aiService.js"
click node_backend_db "https://github.com/park-bit/scrawny-spend/blob/main/backend/src/config/db.js"
click node_backend_models "https://github.com/park-bit/scrawny-spend/tree/main/backend/src/models"
click node_backend_utils "https://github.com/park-bit/scrawny-spend/tree/main/backend/src/utils"
click node_ai_app "https://github.com/park-bit/scrawny-spend/blob/main/ai-engine/app.py"
click node_ai_routes "https://github.com/park-bit/scrawny-spend/tree/main/ai-engine/routes"
click node_ai_preprocess "https://github.com/park-bit/scrawny-spend/blob/main/ai-engine/utils/preprocessor.py"
click node_ai_models "https://github.com/park-bit/scrawny-spend/tree/main/ai-engine/models"

classDef toneNeutral fill:#f8fafc,stroke:#334155,stroke-width:1.5px,color:#0f172a
classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
classDef toneIndigo fill:#e0e7ff,stroke:#4f46e5,stroke-width:1.5px,color:#312e81
classDef toneTeal fill:#ccfbf1,stroke:#0f766e,stroke-width:1.5px,color:#134e4a
class node_frontend_app,node_frontend_pages,node_frontend_components,node_frontend_hooks,node_frontend_api,node_frontend_store toneBlue
class node_backend_entry,node_backend_app,node_backend_auth,node_backend_expenses,node_backend_budgets,node_backend_analytics,node_backend_reports,node_backend_ai_bridge,node_backend_db,node_backend_models,node_backend_utils toneAmber
class node_ai_app,node_ai_routes,node_ai_preprocess,node_ai_models toneMint
```
