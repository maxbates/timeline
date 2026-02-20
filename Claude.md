# Timeline Visualization App - Development Guidelines

## Project Overview

A timeline visualization application with LLM integration for generating and managing events over time. Think GarageBand-style visual timelines with AI-powered content generation.

### Core Features (v1)

- Interactive timeline visualization with rich visuals
- LLM integration (Claude API) for generating timeline events as JSON
- Save and share timelines
- Side-by-side timeline viewing

### Future Features (Stretch Goals)

- Additional visualizations (maps, custom widgets)
- Multi-visualization coordination
- LLM-powered timeline recommendations and discovery
- Interactive timeline querying and modification

## Technology Stack

### Frontend

- **TypeScript**: Strict type safety throughout the application
- **React 18+**: UI component library
- **Next.js 15** (App Router): Full-stack React framework with SSR/SSG capabilities
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Zod**: Runtime type validation and schema definition
- **React Query (TanStack Query)**: Server state management
- **Zustand** or **Jotai**: Client state management (if needed)

### Backend

- **Next.js API Routes** or **tRPC**: Type-safe API layer
- **Anthropic Claude API**: LLM integration for timeline generation
- **PostgreSQL**: Primary database (with Supabase or similar for hosting)
- **Prisma**: Type-safe ORM with migrations
- **NextAuth.js**: Authentication (when needed)

### Testing

- **Vitest**: Unit and integration testing (faster Jest alternative)
- **Playwright**: End-to-end testing with browser automation
- **Testing Library**: React component testing
- **MSW (Mock Service Worker)**: API mocking for tests

### Development Tools

- **pnpm**: Fast, disk-efficient package manager
- **ESLint**: Code linting with TypeScript support
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks
- **Conventional Commits**: Commit message standard

## Architecture Principles

### 1. Interface-Driven Development

All major features should be defined by TypeScript interfaces and types first. This creates clear contracts between modules.

```typescript
// Example: Define data contracts first
interface TimelineEvent {
  id: string;
  timestamp: Date;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

interface Timeline {
  id: string;
  name: string;
  events: TimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Modular Organization

Code should be organized by feature/domain, not by technical layer:

```
src/
├── features/
│   ├── timeline/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── types.ts
│   │   ├── api.ts
│   │   └── timeline.test.ts
│   ├── llm-generation/
│   └── sharing/
├── lib/
│   ├── api-client.ts
│   └── utils.ts
└── types/
    └── common.ts
```

### 3. Type Safety Throughout

- Use TypeScript strict mode
- Define Zod schemas for runtime validation (API boundaries, user input)
- Use discriminated unions for state machines and complex states
- Prefer type inference where reasonable, explicit types for public APIs

### 4. Testable Code

- Every feature must have corresponding tests
- Write tests alongside implementation, not after
- Aim for high coverage of business logic
- Use Playwright for critical user flows

## Testing Strategy

### Unit Tests (Vitest)

- All utility functions
- Business logic and data transformations
- React hooks
- Pure components

### Integration Tests (Vitest + Testing Library)

- Component interactions
- API route handlers
- Database operations (with test DB)

### End-to-End Tests (Playwright)

- Critical user journeys (creating timeline, generating with LLM, sharing)
- Cross-browser compatibility
- Visual regression testing (optional)

### Test Organization

- Place tests next to the code they test: `feature.test.ts` alongside `feature.ts`
- Use descriptive test names: `it('should generate timeline events from LLM prompt')`
- Follow AAA pattern: Arrange, Act, Assert

## Development Workflow

### 1. Feature Development

1. Define TypeScript interfaces/types for the feature
2. Write tests based on the interface contracts
3. Implement the feature to pass tests
4. Manual testing in dev environment
5. Code review and refinement

### 2. Commit Guidelines

Use Conventional Commits format:

- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `test:` adding or updating tests
- `refactor:` code changes that neither fix bugs nor add features
- `chore:` maintenance tasks

### 3. Branch Strategy

- Main branch: `main` (protected)
- Feature branches: `claude/feature-name-{sessionId}`
- Always create PR for review before merging

## Initial Setup Checklist

### 1. Initialize Next.js Project

```bash
pnpm create next-app@latest timeline-app --typescript --tailwind --app --use-pnpm
cd timeline-app
```

### 2. Install Core Dependencies

```bash
# Type safety and validation
pnpm add zod

# Database and ORM
pnpm add @prisma/client
pnpm add -D prisma

# API and state management
pnpm add @tanstack/react-query
pnpm add @trpc/client @trpc/server @trpc/react-query @trpc/next

# LLM Integration
pnpm add @anthropic-ai/sdk

# Testing
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react
pnpm add -D playwright @playwright/test
pnpm add -D msw

# Dev tools
pnpm add -D eslint-config-prettier
pnpm add -D husky lint-staged
```

### 3. Initialize Testing Tools

```bash
# Playwright setup
pnpm playwright install

# Initialize Prisma
pnpm prisma init
```

### 4. Configure Development Environment

- Set up `.env.local` with API keys (Claude API key)
- Configure Vitest in `vitest.config.ts`
- Configure Playwright in `playwright.config.ts`
- Set up ESLint and Prettier rules
- Initialize Husky for pre-commit hooks

### 5. Create Initial Project Structure

```bash
mkdir -p src/features src/lib src/types
```

## Code Quality Standards

### TypeScript

- Enable strict mode in `tsconfig.json`
- No `any` types without explicit justification
- Use `unknown` for truly unknown types
- Prefer `interface` for object shapes, `type` for unions/intersections

### React

- Functional components only
- Custom hooks for reusable logic
- Prefer composition over prop drilling
- Use React Server Components where appropriate (Next.js App Router)

### Styling

- Tailwind utility classes for most styling
- CSS modules for complex component-specific styles
- Mobile-first responsive design
- Accessible color contrast and interactions

### Performance

- Use React.memo() judiciously (measure first)
- Implement proper loading states
- Optimize bundle size (check with `pnpm analyze`)
- Lazy load heavy components

## LLM Integration Guidelines

### Claude API Usage

- **API key is set by the user in the browser UI** and stored in `localStorage` (not in server-side environment variables). The key is passed to the Next.js API routes via the `X-API-Key` HTTP header on every request. There is no server-side `ANTHROPIC_API_KEY` env var — users bring their own key.
- Implement rate limiting and error handling
- Cache responses when appropriate
- Use streaming for real-time timeline generation
- Define clear JSON schemas for LLM outputs (use Zod)

### Example Timeline Generation Prompt Structure

```typescript
interface TimelineGenerationRequest {
  topic: string;
  startDate?: Date;
  endDate?: Date;
  eventCount?: number;
  detailLevel: 'brief' | 'detailed';
}
```

## Browser Testing with Playwright

Playwright provides powerful browser automation for testing. You'll interact with it programmatically to write tests.

### Setting Up Playwright Tests

```typescript
import { test, expect } from '@playwright/test';

test('user can create a new timeline', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('button:text("New Timeline")');
  await page.fill('input[name="title"]', 'My Timeline');
  await page.click('button:text("Create")');

  await expect(page.locator('h1')).toContainText('My Timeline');
});
```

### Using Claude for Test Development

Claude can help you write Playwright tests by:

1. Understanding your UI requirements
2. Generating test scenarios
3. Writing test code with proper selectors
4. Debugging test failures

## Questions and Clarifications

Before starting implementation, consider these questions:

- [ ] What date range should timelines support? (historical, future, both?)
- [ ] Should timeline events support hierarchies or dependencies?
- [ ] What sharing permissions model? (public link, specific users, etc.)
- [ ] What's the expected scale? (dozens of events vs thousands per timeline)
- [ ] Visual style preference? (modern/minimal, colorful, professional, etc.)

## Next Steps

1. Run initial setup commands to create the Next.js project
2. Configure TypeScript strict mode and ESLint
3. Set up testing infrastructure (Vitest + Playwright)
4. Define core data types and interfaces (Timeline, TimelineEvent, etc.)
5. Implement basic timeline visualization component
6. Add LLM integration for event generation
7. Build save/share functionality
8. Add comprehensive test coverage

---

**Last Updated**: 2026-01-03
