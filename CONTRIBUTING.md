# Contributing to OpenBron

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/openbron.git
   cd openbron
   ```

2. Copy and configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start infrastructure services:
   ```bash
   docker compose up -d db redis
   ```

4. Run database migrations:
   ```bash
   cd backend
   pip install -r requirements.txt
   python -m app.db.migrations
   ```

5. Start the development servers:
   ```bash
   # Backend (Celery worker)
   cd backend
   celery -A app.tasks worker --loglevel=INFO

   # Frontend
   cd frontend
   npm install
   npm run dev
   ```

## Code Standards

- **Python**: PEP 8, type hints, Flake8-clean
- **TypeScript**: Strict mode, no `any`, ESLint-clean
- **Logging**: Use `structlog` (Python) or `pino` (Node.js) - no print/console.log
- **Testing**: pytest for Python, Vitest for TypeScript

## Pull Request Process

1. Create a feature branch from `main`
2. Write tests for new functionality
3. Ensure all tests pass and lint is clean
4. Open a PR with a clear description of changes

## Commit Messages

Use conventional commits:
- `feat:` new feature
- `fix:` bug fix
- `refactor:` code restructuring
- `test:` adding tests
- `docs:` documentation changes
