# Development Guide

This guide will help you set up your local development environment for the web-template project.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Debugging](#debugging)
- [Common Issues](#common-issues)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: >= 18.x (LTS recommended)
- **npm**: >= 9.x or **yarn**: >= 1.22.x
- **Docker**: >= 24.x
- **Docker Compose**: >= 2.x
- **Git**: >= 2.x

### Verify Installation

```bash
node --version
npm --version
docker --version
docker-compose --version
git --version
```

## Project Structure

```
web-template/
├── client/              # React frontend application
│   ├── src/
│   │   ├── components/  # Atomic design components
│   │   │   ├── atoms/
│   │   │   ├── molecules/
│   │   │   ├── organisms/
│   │   │   └── templates/
│   │   ├── hooks/       # Custom React hooks
│   │   ├── models/      # Data models and types
│   │   ├── services/    # API services
│   │   ├── store/       # State management
│   │   ├── tests/       # Frontend tests
│   │   └── utils/       # Utility functions
│   └── docs/            # Frontend documentation
├── server/              # Express backend application
│   ├── src/
│   │   ├── application/ # Application layer (use cases)
│   │   ├── domain/      # Domain layer (business logic)
│   │   ├── interfaces/  # Adapters and external interfaces
│   │   └── infrastructure/ # Infrastructure layer (DB, APIs)
│   ├── tests/           # Backend tests
│   └── docs/            # Backend documentation
├── docs/                # General project documentation
├── Dockerfile           # Docker image
└── docker-compose.yml   # Docker orchestration
```

## Getting Started

### 1. Clone the Repository

If you're contributing, fork the repository first and clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/web-template.git
cd web-template
```

If you're just setting up locally:

```bash
git clone https://github.com/codesphere-dev/web-template.git
cd web-template
```

### 2. Set Up Remote

If you forked the repository, add the upstream remote:

```bash
git remote add upstream https://github.com/codesphere-dev/web-template.git
```

### 3. Install Dependencies

#### Using Docker

```bash
docker-compose up -d
```

This will:
- Build and start the client container
- Build and start the server container
- Set up the database
- Install all dependencies automatically

### 5. Database Setup

If using Docker, the database is automatically initialized. If running manually:

```bash
cd server
npm run db:migrate
npm run db:seed
```

## Development Workflow

### Running the Application

```bash
# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Access the Application

- **Client**: http://localhost:3000
- **Server API**: http://localhost:5000

### Hot Reloading

Both the client and server support hot reloading:

- **Client**: Changes to React components will automatically refresh the browser
- **Server**: Changes to server code will automatically restart the server (using nodemon)

### Making Changes

1. **Create a branch** following the naming convention (see [GIT.md](GIT.md))
2. **Make your changes** in the appropriate directory
3. **Test your changes** (see [Testing](#testing))
4. **Commit your changes** following the commit guidelines (see [GIT.md](GIT.md))

## Testing

### Running Tests

#### Client Tests

```bash
# Run all tests
docker-compose exec client npm test

# Run tests in watch mode
docker-compose exec client npm test -- --watch

# Run tests with coverage
docker-compose exec client npm test -- --coverage
```

#### Server Tests
```bash
# Run all tests
docker-compose exec server npm test

# Run unit tests only
docker-compose exec server npm run test:unit

# Run integration tests only
docker-compose exec server npm run test:integration

# Run tests with coverage
docker-compose exec server npm run test:coverage
```
```

#### Docker Testing

```bash
# Run client tests in Docker
docker-compose exec client npm test

# Run server tests in Docker
docker-compose exec server npm test
```

### Writing Tests

- Use **Jest** as the testing framework
- Follow the **AAA pattern**: Arrange, Act, Assert
- Place tests in the `tests/` directory. (Please for unit tests choose the right layer)
- Name test files: `*.test.js`

**Example Unit Test:**

```javascript
import { calculateTotal } from './utils';

describe('calculateTotal', () => {
  it('should calculate the total correctly', () => {
    // Arrange
    const items = [10, 20, 30];
    
    // Act
    const result = calculateTotal(items);
    
    // Assert
    expect(result).toBe(60);
  });
});
```

## Debugging

### Client Debugging

#### Browser DevTools

- Open Chrome DevTools (F12)
- Use React DevTools extension
- Use the Console and Network tabs

#### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Client: Chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/client/src"
    }
  ]
}
```

### Server Debugging

#### Console Logging

```javascript
console.log('Debug info:', variable);
console.error('Error:', error);
```

#### VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Server: Debug",
  "program": "${workspaceFolder}/server/src/index.js",
  "cwd": "${workspaceFolder}/server",
  "env": {
    "NODE_ENV": "development"
  }
}
```

#### Docker Debugging

```bash
# View container logs
docker-compose logs -f server

# Execute commands in container
docker-compose exec server bash

# Inspect container
docker-compose exec server npm run debug
```

## Common Issues

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find the process using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port in .env
```

### Docker Issues

**Problem**: Docker containers won't start

**Solution**:
```bash
# Clean up Docker
docker-compose down -v
docker system prune -a

# Rebuild
docker-compose build --no-cache
docker-compose up
```

### Module Not Found

**Problem**: `Error: Cannot find module 'xyz'`

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Or in Docker
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Database Connection Failed

**Problem**: Cannot connect to database

**Solution**:
```bash
# Check database container is running
docker-compose ps

# Check database logs
docker-compose logs db

# Verify environment variables in .env
# Ensure DATABASE_URL is correct
```

### Hot Reload Not Working

**Problem**: Changes don't trigger reload

**Solution**:
```bash
# For Docker on Windows/Mac, add polling:
# In docker-compose.yml, add environment variable:
# CHOKIDAR_USEPOLLING=true

# Or restart the service
docker-compose restart client
```

## Additional Resources

- [React Documentation](https://react.dev/)
- [Express Documentation](https://expressjs.com/)
- [Jest Documentation](https://jestjs.io/)
- [Docker Documentation](https://docs.docker.com/)
- [Git Workflow](GIT.md)
- [Contributing Guide](CONTRIBUTING.md)

## Getting Help

If you encounter issues:

1. Check this guide and the [Common Issues](#common-issues) section
2. Search existing GitHub issues
3. Create a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Your environment (OS, Node version, etc.)
   - Error messages and logs

Happy coding! 🚀
