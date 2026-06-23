# DataForge

Enterprise-grade SaaS platform for web data extraction and browser automation.

## Features

### Core Functionality
- **Workspace Management**: Multi-tenant workspace system with team collaboration
- **Project Organization**: Organize tasks and data within projects
- **Task Scheduling**: Manual, one-time, cron-based, and recurring schedules
- **Job Queue**: Celery + Redis powered job processing with priorities
- **Browser Automation**: Playwright-based browser automation with recording
- **Visual Workflow Builder**: Drag-and-drop workflow designer with React Flow
- **Data Extraction**: Extract structured data from any website

### Data Management
- **Data Stores**: Persistent storage for extracted data
- **Export Options**: JSON, CSV, and Excel exports
- **Schema Definition**: Define extraction patterns and schemas
- **Data Search & Filters**: Query and filter extracted data

### Developer Experience
- **REST API**: Full REST API with OpenAPI documentation
- **API Keys**: Scoped API key management
- **Webhooks**: Real-time notifications via webhooks
- **SDK**: JavaScript/Python SDKs for programmatic access

### Analytics & Monitoring
- **Real-time Dashboard**: Live job monitoring
- **Performance Metrics**: Duration, success rate, throughput
- **Resource Monitoring**: CPU, memory, and queue stats
- **Error Tracking**: Detailed error logs and stack traces

### Team & Security
- **Role-based Access Control**: Owner, Admin, Member roles
- **Team Collaboration**: Invite members, share workspaces
- **Audit Logs**: Complete activity tracking
- **SSO Support**: OAuth providers (Google, GitHub)

### Billing & Subscriptions
- **Subscription Plans**: Free, Starter, Pro, Enterprise
- **Stripe Integration**: Secure payment processing
- **Usage Limits**: Per-plan quotas and restrictions

### Marketplace
- **Template Library**: Pre-built automation templates
- **Community Templates**: Share and use templates from other users
- **Categories**: E-commerce, Social Media, Search Engines, etc.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (via Supabase)
- **Cache**: Redis
- **Task Queue**: Celery
- **Async**: asyncio
- **Auth**: JWT + OAuth
- **Browser**: Playwright
- **Storage**: S3-compatible

### Frontend
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Charts**: Apache ECharts
- **State**: Zustand
- **Animations**: Framer Motion

## Project Structure

```
project/
├── backend/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Core configuration
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── workers/       # Celery tasks
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── app/               # Next.js app directory
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   └── layout/       # Layout components
│   ├── lib/              # Utilities and store
│   └── package.json
└── README.md
```

## Database Schema

The platform uses a comprehensive PostgreSQL schema with:
- Users, Workspaces, Workspace Members
- Projects, Tasks, Jobs, Job Logs
- Workflows, Workflow Versions
- Data Stores, Data Store Items
- API Keys, Notifications, Audit Logs
- Subscription Plans, Workspace Subscriptions
- Marketplace Templates

All tables have Row Level Security (RLS) enabled for multi-tenant isolation.

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set environment variables
export SUPABASE_URL=your_supabase_url
export SUPABASE_KEY=your_supabase_key
export JWT_SECRET_KEY=your_jwt_secret

# Run the server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install

# Set environment variables
export NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Run the dev server
npm run dev
```

## API Documentation

Access the interactive API documentation at `/api/docs` when running the backend.

### Core Endpoints

- `POST /api/v1/auth/login` - User login
- `GET /api/v1/workspaces` - List workspaces
- `POST /api/v1/projects` - Create project
- `POST /api/v1/projects/{id}/tasks` - Create task
- `POST /api/v1/projects/{id}/jobs` - Create job
- `GET /api/v1/jobs/{id}` - Get job status
- `GET /api/v1/marketplace` - Browse templates

## License

MIT License

## Security Notes

- Always obtain permission before scraping websites
- Respect robots.txt and rate limits
- Use the platform only for lawful purposes
- Consider using official APIs when available
