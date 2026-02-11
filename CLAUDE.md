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

# Database Access Restrictions

## CRITICAL SECURITY RULES

Claude Code MUST follow these rules when working with databases:

1. **ONLY** access database: `research&insights`
2. **NEVER** connect to: `mosaic_pro`, `postgres`, or any other database
3. **CAN** access any schema within `research&insights` database
4. **ALWAYS** use the connection pool from `@/lib/db-pool`
5. **NEVER** create direct database connections with custom configs

## When Generating Scripts

- All database scripts MUST import from `@/lib/db-pool`
- All queries MUST go through `executeQuery()` or pool methods
- No direct `pg.Client` or custom connection strings
- All write operations MUST be logged

## Validation Requirements

Before ANY database operation, Claude Code must:
1. Confirm database is `research&insights`
2. Any schema within `research&insights` is allowed
3. Log all operations for audit trail

## Forbidden Actions

❌ Connect to any database except `research&insights`
❌ Modify database connection configs in `db-pool.ts`
❌ Create scripts with hardcoded credentials
❌ Bypass validation layers
❌ Execute queries without validation
❌ Access or reference `mosaic_pro` database in any code

# Development Applications Feature - ON HOLD

## Status: Awaiting DPHI API Subscription Key

**Last Updated**: 2026-01-23

### Current State: Implementation Complete, Awaiting API Access

**✅ Completed:**
1. Database table created: `housing_dashboard.development_applications`
   - Stores monthly DA determination data by LGA
   - Indexes for fast querying (lga_code, month_year, composite)
   - Permissions granted to mosaic_readonly and db_admin

2. Data fetching script: `scripts/fetch-development-applications.js`
   - Fetches from DPHI ePlanning API: https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA
   - Aggregates by LGA and month
   - Categorizes as approved/refused/withdrawn
   - Upserts to database (handles conflicts)
   - Ready to run weekly via cron job

3. API route: `src/app/api/development-applications/route.ts`
   - POST endpoint accepting lgaName or lgaCode
   - Returns last 12 months of data (configurable)
   - Calculates summary statistics (approval rate, average per month)
   - Uses readonly pool for queries

4. Dashboard card: `src/components/dashboard/DevelopmentApplicationsCard.tsx`
   - Line chart showing monthly DA trends (Recharts)
   - Three lines: total determined, approved, refused
   - Summary statistics with approval rate
   - Auto-refreshes when LGA selected
   - Purple theme in Card Library

5. Card integration:
   - Added to DraggableCard.tsx (renders the card)
   - Added to DraggableDashboard.tsx (card type definition)
   - Added to AdminToolbar.tsx (Card Library with purple styling)

6. Documentation: `database/DEVELOPMENT_APPLICATIONS_SETUP.md`
   - Complete setup guide with step-by-step instructions
   - Troubleshooting section
   - Cron job configuration options
   - System architecture diagram

**⏸️ Blocked - Awaiting:**

DPHI API Subscription Key (required in header: `Ocp-Apim-Subscription-Key`)

**How to Obtain:**
1. Email: eplanning.integration@planning.nsw.gov.au
2. Include: Organization name and contact person details
3. Wait: 1-2 business days for approval
4. Documentation: https://www.planningportal.nsw.gov.au/API-faqs

**Once Key Received:**
1. Add to `.env.local`: `DPHI_API_KEY=your-subscription-key-here`
2. Run initial data fetch: `node scripts/fetch-development-applications.js`
3. Set up cron job for weekly updates (Sunday 8 PM recommended)
4. Verify card displays data when LGA selected

**API Rate Limit:** 150 calls per 60 seconds

**Next Actions When Unblocked:**
- Test data fetching script with real API key
- Verify data populates correctly in database
- Confirm dashboard card displays properly
- Set up automated weekly cron job
- Monitor initial data quality and coverage