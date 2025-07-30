# Contributing to MCP Server Tester

Thanks for your interest in contributing! This guide explains how to get involved.

## Getting Started

1. Fork the repository and clone it locally
2. Install dependencies with `npm install`
3. Run `npm run dev` to start the CLI in development mode
4. Test your changes with the example test files in the `examples/` directory

## Development Process & Pull Requests

1. Create a new branch for your changes
2. Make your changes following existing code style and conventions
   - Run `npm run lint` and `npm run format` to check code style
   - Run `npm run typecheck` to verify TypeScript types
3. Test changes thoroughly:
   - Run `npm test` to run all tests
   - Test with real MCP servers when possible
4. Update documentation as needed (README.md, inline comments)
5. Use clear commit messages explaining your changes
6. Verify all changes work as expected
7. Submit a pull request with a clear description of changes
8. PRs will be reviewed quickly by maintainers

## Development Commands

- `npm run dev` - Run CLI in development mode
- `npm test` - Run all tests
- `npm run lint` - Check code style
- `npm run format` - Format code
- `npm run typecheck` - Check TypeScript types
- `npm run build` - Build for production

## Testing Guidelines

- Add unit tests for new functionality
- Include integration tests for CLI commands
- Test with various MCP server configurations
- Verify eval tests work with different LLM responses
- Check edge cases and error handling

## Code Style

- Follow existing TypeScript/JavaScript conventions
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and testable
- Use the existing error handling patterns

## Questions?

Feel free to open an issue for questions or create a discussion for general topics about MCP server testing.

## License

By contributing, you agree that your contributions will be licensed under the MIT license.
