# Housing Insights Dashboard Project Memory

## Project Overview
**Purpose**: Professional housing insights dashboard for company deployment
**User Profile**: UI/UX designer who needs full technical guidance
**Goal**: Complete end-to-end solution with automated testing and debugging feedback loop

## Technical Architecture Decision
**Selected Stack (2025 Best Practices)**:
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript (essential for professional development)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand (lightweight, modern)
- **Forms**: React Hook Form + Zod validation
- **Charts/Visualization**: Recharts (React-native), Chart.js integration
- **Database**: TBD based on hosting requirements
- **Testing**: Playwright with MCP server for automated UI testing and debugging

## Housing Dashboard Domain Knowledge
**Key Features for Housing Insights**:
- Interactive maps for geographic housing data
- Affordability trend charts and comparisons
- Key Performance Indicators (KPI) tracking
- Property market statistics and trends
- Demographic overlay capabilities
- Multi-level geographic analysis (national, state, MSA, county, tract)
- Real-time data visualization and reporting

**Common Chart Types**:
- Geospatial maps (static and interactive)
- Bar charts for comparisons (most/least affordable areas)
- Line charts for trends over time
- Pie charts for compositional breakdowns
- Tables for detailed data examination
- Infographics for key insights

**Data Sources Pattern**:
- Point in Time Count data
- Housing Management Information Systems
- Appraisal report statistics
- Affordability indices
- Property market data
- Demographics and economic indicators

## Playwright MCP Integration Strategy
**Purpose**: Create feedback loop for automated UI testing and bug fixing
**Installation Path**:
1. Prerequisites: Node.js LTS, browser drivers
2. Installation: `npx @playwright/mcp@latest`
3. Configuration: VS Code integration recommended
4. Security: Review permissions and access controls
5. Integration: Link with development server for live testing

**Usage Pattern**:
- Automated UI testing during development
- Console error detection and reporting
- Visual regression testing
- Cross-browser compatibility validation
- Performance monitoring and optimization

## Development Workflow
**Phase 1**: Environment Setup
- Install and configure Playwright MCP
- Set up Next.js project with TypeScript
- Configure development tools and linting

**Phase 2**: UI/UX Consultation
- Gather specific housing data requirements
- Define visual design preferences
- Establish user workflow priorities

**Phase 3**: Implementation
- Core dashboard framework
- Data visualization components
- Interactive features and routing
- Responsive design implementation

**Phase 4**: Testing & Iteration
- Playwright automated testing
- Performance optimization
- Production deployment preparation

## Constants (Technical Standards)
- Professional code quality with TypeScript
- Responsive design for all screen sizes
- Accessibility standards compliance (WCAG)
- SEO optimization for public-facing portions
- Modern React patterns (Server Components, etc.)
- Security best practices
- Performance optimization (Core Web Vitals)

## Dynamics (User-Specific Decisions)
- Specific housing data sources and APIs
- Visual design preferences and branding
- Target audience and use case prioritization
- Geographic focus and scope
- Interactive feature requirements
- Deployment platform and hosting strategy