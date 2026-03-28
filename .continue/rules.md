# AXON Project Architecture

## Project Structure

AXON is a TypeScript/React application built with Vite, featuring a modern component-based architecture.

### Directory Layout

```
src/
├── components/        # React components
├── api/              # API integration and services
├── store/            # Redux state management
├── hooks/            # Custom React hooks
├── types/            # TypeScript type definitions
├── utils/            # Utility functions and helpers
└── pages/            # Page components
```

### Key Directories

- **Components** (`/src/components`): Reusable React UI components with TypeScript
- **API** (`/src/api`): API routes, client services, and backend integration
- **State Management** (`/src/store`): Redux store, slices, actions, and reducers
- **Hooks** (`/src/hooks`): Custom React hooks for logic reuse
- **Types** (`/src/types`): Shared TypeScript interfaces and types
- **Utils** (`/src/utils`): Helper functions and utilities
- **Pages** (`/src/pages`): Full page components

## Coding Standards

### TypeScript

- **Mandatory**: Use TypeScript for all new files (`.ts`, `.tsx`)
- **Type Safety**: Always define explicit types for functions and components
- **No `any` types**: Use proper types or `unknown` when needed
- **Interfaces**: Use interfaces for object shapes and props

### Component Development

- **Functional Components**: Use only React functional components with hooks
- **Props Typing**: Define all component props with TypeScript interfaces
- **Example**:

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = "primary",
}) => {
  // Implementation
};
```

### Naming Conventions

- **Components**: PascalCase (e.g., `UserCard.tsx`, `LoginForm.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`, `validateEmail.ts`)
- **Files**: Match export names
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`, `API_BASE_URL`)

### State Management (Redux)

- **Slices**: Use Redux Toolkit slices in `/src/store`
- **Naming**: `[feature]Slice.ts` (e.g., `authSlice.ts`, `userSlice.ts`)
- **Actions**: Auto-generated from slice definitions
- **Selectors**: Export typed selectors for each slice

### Testing

- **Coverage**: Write tests for all new features
- **Framework**: Use Vitest (configured in `vitest.config.ts`)
- **File Location**: Co-locate tests with source files as `.test.ts` or `.spec.ts`
- **Example Structure**:

```
src/
├── utils/
│   ├── helpers.ts
│   └── helpers.test.ts
```

### Styling

- **Framework**: Tailwind CSS (configured in `tailwind.config.ts`)
- **Utilities**: Use Tailwind utility classes
- **Custom CSS**: Minimal custom CSS, prefer Tailwind

### Code Organization

- **Single Responsibility**: Each file should have one primary purpose
- **Exports**: Keep exports explicit and typed
- **Imports**: Group imports (React, external packages, local files)

## Build & Deployment

- **Build Tool**: Vite (`vite.config.ts`)
- **Package Manager**: Bun (`bun.lockb`)
- **Deployment**: Vercel (`vercel.json`)
- **Linting**: ESLint (`eslint.config.js`)

## Key Technologies

- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Redux Toolkit** - State management
- **Tailwind CSS** - Styling
- **Supabase** - Backend services
- **Bun** - Package manager

## Development Guidelines

1. **Branch Strategy**: Create feature branches from `main`
2. **Code Review**: All changes require review before merging
3. **Commit Messages**: Use clear, descriptive commit messages
4. **Environment Variables**: Never commit `.env` files
5. **Dependencies**: Keep dependencies minimal and up-to-date

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.
