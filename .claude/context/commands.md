# Commands

## Setup

```bash
npm install      # install node packages before starting development
```

## Development

```bash
npm run dev              # Run CLI in development mode with tsx
npm run build           # Compile TypeScript to dist/
npm start               # Run CLI directly with tsx
```

## Testing

```bash
npm test                # Run all tests
npm run test:unit       # Run unit tests only
npm run test:e2e        # Run end-to-end tests
npm run test:e2e:api    # Run API-focused e2e tests
npm run test:e2e:eval   # Run evaluation-focused e2e tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

## Code Quality

```bash
npm run typecheck       # TypeScript type checking
npm run lint            # Run ESLint
npm run lint:fix        # Run ESLint with auto-fix
npm run format          # Format code with Prettier
npm run format:check    # Check code formatting
```

## Pre-commit Hooks

The project uses lefthook with automatic staging of fixes:

- **format**: Runs Prettier and stages fixes
- **lint**: Runs ESLint with --fix and stages fixes
- **typecheck**: Validates TypeScript types
- **test**: Runs unit tests
