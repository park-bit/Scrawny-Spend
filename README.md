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
