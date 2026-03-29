# Claims Processing System

A complete, production-grade Claims Processing System built for the Forward Deployed Engineer Take-Home Assignment.

## Features
- **Core Adjudication Engine**: Evaluates coverages, applies limits, calculates deductibles, and generates human-readable denial/approval explanations per line item.
- **Robust State Machine**: Enforces valid state transitions (e.g., `APPROVED` -> `PAID`, blocking invalid paths) with support for `DISPUTED` workflows.
- **Monorepo Architecture**: Clean separation of `apps/backend` (Express, InversifyJS, Sequelize) and `apps/frontend` (Next.js) with a shared `libs/shared` package.
- **Full E2E Verification**: Includes a comprehensive bash script testing 51 REST API assertions.

## Quick Start (Run Locally)

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL database running locally

### 2. Environment Setup
Configure your `.env` file in the root directory:
```env
DATABASE_URL=postgresql://expenses_user:expenses_pass@localhost:5432/expenses_db?schema=public
PORT=4300
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the Backend & Seed Data
Start the backend server on port 4300:
```bash
npm run dev:backend
```
In a new terminal window, seed the database with demo members, policies, and coverage rules:
```bash
npm run seed
```

### 5. Run the Frontend UI
```bash
npm run dev:frontend
```
Open [http://localhost:3000](http://localhost:3000) to access the Dashboard, view coverage rules, and submit claims!

## Deliverables Checklist
1. **Working System**: `apps/` and `libs/`
2. **Domain Model**: `docs/domain-model.md`
3. **Decisions & Trade-offs**: `docs/decisions.md`
4. **Self Review**: `docs/self-review.md`
5. **AI Artifacts**: `ai-artifacts/chat-log.md`
6. **Architecture Documentation**: Open `architecture.html` or `CONTEXT.md` for a comprehensive design overview.

## Testing the API
We have provided a comprehensive 51-assertion API Test Suite. To verify the backend core engine directly:
```bash
cd docs
bash api-test.sh
```

## Production Scripts
- `npm run build:backend`
- `npm run build:frontend`
- `npm run lint`
