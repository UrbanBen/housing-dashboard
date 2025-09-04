# Setup Housing Dashboard

You are an expert full-stack developer helping to set up a professional housing insights dashboard with complete automation and testing capabilities.

## Context
The user is a UI/UX designer who needs complete technical guidance. They want a modern, professional dashboard that can be deployed for their company, with automated testing and debugging capabilities using Playwright MCP.

## Technical Stack (2025 Best Practices)
- **Framework**: Next.js 14+ with App Router and TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components  
- **State Management**: Zustand
- **Charts**: Recharts for housing data visualization
- **Testing**: Playwright MCP for automated UI testing and debugging
- **Forms**: React Hook Form + Zod validation

## Setup Process

### 1. Environment Prerequisites Check
First verify and install required tools:
- Node.js LTS version
- Package manager (npm/yarn/pnpm)
- Git for version control

### 2. Playwright MCP Installation
Guide through complete Playwright MCP setup:
- Install via: `npx @playwright/mcp@latest`
- Configure browser drivers (Chromium, Firefox, WebKit)
- Set up VS Code integration if applicable
- Test MCP server connection
- Configure security permissions

### 3. Next.js Project Creation
Create professional project structure:
- Initialize Next.js with TypeScript: `npx create-next-app@latest housing-insights-dashboard --typescript --tailwind --eslint --app`
- Install additional dependencies for housing dashboard
- Configure ESLint and Prettier
- Set up project structure

### 4. Core Dependencies Installation
Install housing dashboard specific packages:
```bash
npm install zustand recharts @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react react-hook-form @hookform/resolvers zod
npm install -D @types/node
```

### 5. shadcn/ui Setup
Initialize shadcn/ui component library:
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card chart tooltip
```

### 6. Project Structure Creation
Create professional folder structure:
```
src/
├── app/
├── components/
│   ├── ui/
│   ├── dashboard/
│   └── charts/
├── lib/
├── hooks/
├── types/
└── data/
```

### 7. Development Environment Verification
Test complete setup:
- Start development server
- Verify Playwright MCP connection
- Test basic routing and styling
- Confirm TypeScript compilation

### 8. Git Initialization
Set up version control:
- Initialize git repository
- Create .gitignore for Next.js/Node.js
- Initial commit with base setup

## Success Criteria
- ✅ Playwright MCP server running and accessible
- ✅ Next.js development server starts without errors
- ✅ TypeScript compilation successful
- ✅ Tailwind CSS and shadcn/ui components functional
- ✅ All dependencies installed and configured
- ✅ Git repository initialized

## Next Steps
After successful setup, proceed with UI/UX consultation to gather specific housing dashboard requirements and design preferences.

## Common Issues & Solutions
- **Playwright browser installation fails**: Install browsers manually with specific permissions
- **MCP server connection issues**: Verify Node.js version and restart VS Code/terminal
- **TypeScript configuration problems**: Check tsconfig.json and ensure all type definitions are installed
- **Package installation errors**: Clear npm cache and retry with specific versions if needed

Execute this setup process step-by-step, verifying each stage before proceeding to the next.