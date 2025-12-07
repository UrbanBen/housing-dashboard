# Housing Insights Dashboard - Project Handover Documentation

**Date:** December 3, 2025
**Version:** 1.0
**Current Status:** Development/Production Ready

---

## Executive Summary

The Housing Insights Dashboard is a professional, interactive data visualization platform designed for housing market analysis and urban planning insights. The application features a drag-and-drop dashboard interface with multiple data cards displaying census data, dwelling types, age demographics, and geographic mapping capabilities for Australian Local Government Areas (LGAs).

**Key Capabilities:**
- Dynamic, customizable dashboard with drag-and-drop card management
- Real-time database connections to Azure PostgreSQL
- Interactive geographic mapping (state-level and LGA-level)
- Census data visualization (Age by Sex, Dwelling Type)
- Admin mode for dashboard configuration
- Persistent layout storage in browser localStorage

---

## Technical Architecture

### Core Technology Stack

**Framework & Language:**
- **Next.js 15.5.2** (App Router) - React framework with server-side rendering
- **TypeScript** - Type-safe development
- **React 19** - UI library

**Styling & UI:**
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library built on Radix UI
- **Custom CSS** - For dashboard grid and card styling

**Data Visualization:**
- **@nivo/pie** - Pie chart visualizations
- **Recharts** - Additional charting capabilities
- **Custom SVG** - State map rendering from GeoJSON

**Drag & Drop:**
- **@dnd-kit** - Modern drag-and-drop toolkit
  - `@dnd-kit/core` - Core drag-and-drop functionality
  - `@dnd-kit/sortable` - Sortable list functionality

**Database:**
- **Azure PostgreSQL** - Hosted database (mecone-data-lake.postgres.database.azure.com)
- **pg (node-postgres)** - PostgreSQL client for Node.js

**Icons:**
- **lucide-react** - Icon library

---

## Project Structure

```
housing-insights-dashboard/
├── src/
│   ├── app/
│   │   ├── api/                      # API routes
│   │   │   ├── age-by-sex/          # Age demographics API
│   │   │   ├── dwelling-type/       # Dwelling type data API
│   │   │   ├── lga-database/        # LGA data lookup API
│   │   │   ├── lga-geometry/        # LGA boundary geometry API
│   │   │   └── test-search-data/    # Search geography API
│   │   ├── dashboard/
│   │   │   └── page.tsx             # Main dashboard page
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Global styles
│   │
│   ├── components/
│   │   ├── dashboard/               # Dashboard components
│   │   │   ├── ABSLGAMap.tsx       # ABS LGA boundary map
│   │   │   ├── ABSLGAMapConfigForm.tsx
│   │   │   ├── AdminToolbar.tsx    # Library sidebar with draggable cards
│   │   │   ├── AgeBySexyCard.tsx   # Census age/sex demographics
│   │   │   ├── DraggableCard.tsx   # Card wrapper with drag functionality
│   │   │   ├── DraggableDashboard.tsx # Main dashboard grid
│   │   │   ├── DwellingTypeCard.tsx # Dwelling type pie chart
│   │   │   ├── KeyMetrics.tsx      # Key metrics display
│   │   │   ├── KeyMetricsConfigForm.tsx
│   │   │   ├── TestCard.tsx        # Test/debug card
│   │   │   ├── TestCardConnectionForm.tsx
│   │   │   └── TestSearchCard.tsx  # Search geography card
│   │   │
│   │   ├── filters/
│   │   │   ├── ABSLGALookup.tsx    # ABS LGA search component
│   │   │   └── LGALookup.tsx       # LGA search/filter
│   │   │
│   │   ├── maps/
│   │   │   ├── ABSLGAMap.tsx       # LGA boundary visualization
│   │   │   ├── AustraliaStateMap.tsx # Interactive state map
│   │   │   └── LGAMap.tsx          # Generic LGA map
│   │   │
│   │   └── ui/                     # shadcn/ui components
│   │       └── card.tsx            # Card component primitives
│   │
│   └── lib/
│       └── utils.ts                # Utility functions
│
├── public/
│   ├── australia-states.geojson    # State boundary GeoJSON
│   ├── mosaic-logo.svg            # Company logo
│   └── reset-layout.html          # Layout reset utility
│
├── .env.local                      # Environment variables (NOT in repo)
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
├── tailwind.config.ts             # Tailwind configuration
├── next.config.ts                 # Next.js configuration
└── CLAUDE.md                       # Project memory/instructions
```

---

## Database Architecture

### Connection Details

**Primary Database:**
- **Host:** mecone-data-lake.postgres.database.azure.com
- **Port:** 5432
- **Database:** research&insights
- **User:** db_admin
- **Password Location:** `/users/ben/permissions/.env.admin`

### Schema Structure

#### s12_census Schema (Census 2021 Data)

**cen21_age_by_sex_lga:**
- Contains age and sex distribution by LGA
- Key columns: `lga_name_2021`, `age_group`, `male`, `female`, `total`

**cen21_dwelling_type_lga:**
- Contains dwelling type distribution by LGA
- Key columns: `lga_name_2021`, `dwelling_type`, `value`
- Dwelling types:
  - Occupied private dwellings
  - Unoccupied private dwellings
  - Non-private dwellings
  - Migratory
  - Off-shore
  - Shipping

**cen11_age_by_sex_lga:**
- Census 2011 data for historical comparison
- Similar structure to cen21 version

#### housing_dashboard Schema (Custom Data)

**search table:**
- Geographic search data
- Key columns: `lga_name24`, `lga_code24`, `ste_name21`
- Used by Search Geography card

### Password File Structure

Location: `/users/ben/permissions/.env.admin`

```env
DB_PASSWORD=your_database_password_here
```

---

## Key Features & Components

### 1. Dashboard Grid System

**File:** `src/app/dashboard/page.tsx`, `src/components/dashboard/DraggableDashboard.tsx`

**Capabilities:**
- Responsive grid layout (1-6 columns based on screen size)
- Drag-and-drop card reordering
- Persistent layout storage in localStorage
- Edit mode for dashboard configuration
- Admin mode with library sidebar

**Grid Sizing:**
- Uses CSS Grid with `grid-auto-rows: 20px` for fine-grained control
- Cards span multiple rows based on content
- Responsive breakpoints:
  - 3440px+: 6 columns
  - 2560px+: 5 columns
  - 1920px+: 4 columns
  - 1400px+: 3 columns
  - 768px+: 2 columns
  - <768px: 1 column

### 2. Admin Toolbar & Library

**File:** `src/components/dashboard/AdminToolbar.tsx`

**Features:**
- Collapsible sidebar (300px width)
- Organized card categories:
  - **Search**: Geographic search tools
  - **Map**: Mapping visualizations
  - **Chart**: Data charts and graphs
  - **Data**: Data tables and displays
  - **Blank**: Empty cards for custom content
- Draggable card templates
- Custom styling per template (green for Search Geography)

**Template Structure:**
```typescript
{
  id: 'card-type',
  title: 'Card Title',
  category: 'search' | 'map' | 'chart' | 'data' | 'blank',
  icon: LucideIcon,
  description: 'Card description'
}
```

### 3. Search Geography Card

**File:** `src/components/dashboard/TestSearchCard.tsx`

**Features:**
- Interactive Australia state map
- State selection updates LGA list
- Searchable LGA dropdown
- Selected LGA displayed in card title
- React Portal-based dropdown (prevents z-index issues)
- Scroll-synchronized dropdown positioning
- Database-driven LGA data

**API Endpoint:** `/api/test-search-data`
- Actions: `getLGAs`, `getDataForLGA`
- Filters by state and returns matching LGAs

### 4. ABS LGA Map Card

**File:** `src/components/dashboard/ABSLGAMap.tsx`

**Features:**
- Displays LGA boundary geometry
- Fetches WKB (Well-Known Binary) geometry from database
- Converts to GeoJSON for visualization
- SVG-based rendering
- Responds to LGA selection from other cards

**API Endpoint:** `/api/lga-geometry`
- Fetches boundary geometry for selected LGA
- Returns WKB format converted to GeoJSON

### 5. Dwelling Type Card

**File:** `src/components/dashboard/DwellingTypeCard.tsx`

**Features:**
- Nivo pie chart visualization
- Multi-line labels with custom component
- Muted color palette (slate, stone, zinc tones)
- Percentage and count display
- Summary statistics grid below chart
- Custom tooltip with green border styling

**API Endpoint:** `/api/dwelling-type`
- Fetches dwelling type distribution for selected LGA
- Filters out zero-count dwelling types

### 6. Age by Sex Card

**File:** `src/components/dashboard/AgeBySexyCard.tsx`

**Features:**
- Grouped bar chart (male/female comparison)
- Age group distributions
- Responsive chart sizing
- Hover tooltips
- Summary statistics

**API Endpoint:** `/api/age-by-sex`
- Fetches age and sex distribution for selected LGA

---

## State Management & Data Flow

### LGA Selection Flow

```
TestSearchCard (Search Geography)
    ↓ (onLGAChange callback)
DashboardPage (selectedLGA state)
    ↓ (prop drilling)
DraggableDashboard
    ↓ (prop drilling)
Individual Cards (ABSLGAMap, DwellingTypeCard, AgeBySexyCard)
    ↓ (useEffect triggers)
API Calls to fetch LGA-specific data
```

**LGA Object Structure:**
```typescript
interface LGA {
  id: string;      // LGA code (e.g., "10050")
  name: string;    // LGA name (e.g., "Dubbo")
}
```

### Dashboard Layout Persistence

**Storage Key:** `dashboard-layout`
**Storage Location:** localStorage
**Data Structure:**
```typescript
DashboardCard[] = [
  {
    id: 'unique-id',
    type: 'card-type',
    title: 'Card Title',
    size: 'small' | 'medium' | 'large' | 'xl',
    category: 'lga' | 'metrics' | 'charts' | 'kpi' | 'search' | 'map' | 'data' | 'blank',
    gridArea?: 'optional-css-grid-area'
  }
]
```

---

## Styling System

### Theme Colors

**Primary:** `#00FF41` (Green) - Used for primary actions, selected states
**Orange:** `#f97316` (rgb(249 115 22)) - Used for edit mode indicators
**Background:** `#000000` (Black) - Dashboard background
**Card Background:** `hsl(var(--card))` - Defined in globals.css

### Edit Mode Styling

**Active Edit Mode:**
- Orange card borders: `2px solid rgb(249 115 22 / 0.5)`
- Orange background overlay: `bg-orange-500/10`
- Orange button: `bg-orange-500/20 text-orange-500`
- Pulsing orange glow on "Edit Mode" text

**Normal Mode:**
- Subtle card borders: `border-border/50`
- Green hover effects: `hover:ring-primary/50`
- Green button: `bg-[#00FF41]/20 text-[#00FF41]`

### Dashboard Grid Styles

**Card Transitions:**
- Smooth opacity/border/shadow transitions: `0.2s ease`
- NO transform transitions (prevents jank during drag)
- Drag overlay has 3-degree rotation for visual feedback

**Responsive Card Sizing:**
```typescript
const getCardSpan = (size: string, effectiveColumns: number) => {
  if (effectiveColumns === 1) return 1;

  switch(size) {
    case 'small': return 1;
    case 'medium': return Math.min(2, effectiveColumns);
    case 'large': return Math.min(3, effectiveColumns);
    case 'xl': return effectiveColumns;
    default: return 1;
  }
}
```

---

## API Routes

### Pattern

All API routes follow this structure:
```typescript
// src/app/api/[route]/route.ts
export async function POST(request: Request) {
  const body = await request.json();

  // Extract password from file
  const password = extractPassword(body.passwordPath);

  // Connect to database
  const client = new Client({ host, port, database, user, password });
  await client.connect();

  // Query database
  const result = await client.query(query);

  // Return response
  return NextResponse.json({ success: true, data: result.rows });
}
```

### Available Endpoints

#### GET/POST `/api/age-by-sex`
**Purpose:** Fetch age by sex distribution for an LGA
**Request Body:**
```typescript
{
  lgaName: string,
  host: string,
  port: number,
  database: string,
  user: string,
  passwordPath: string,
  schema: string,
  table: string,
  lgaColumn: string
}
```

#### POST `/api/dwelling-type`
**Purpose:** Fetch dwelling type distribution for an LGA
**Request Body:** Same as age-by-sex

#### GET `/api/test-search-data`
**Purpose:** LGA search and lookup
**Query Parameters:**
- `action=getLGAs`: Get all LGAs for a state
  - `schema`, `table`, `state_column`, `state_value`, `lga_column`
- `action=getDataForLGA`: Get data for specific LGA
  - `schema`, `table`, `column`, `lga_value`

#### POST `/api/lga-geometry`
**Purpose:** Fetch LGA boundary geometry
**Request Body:**
```typescript
{
  lgaName: string,
  host: string,
  port: number,
  database: string,
  user: string,
  passwordPath: string
}
```
**Returns:** WKB geometry converted to GeoJSON

---

## Development Setup

### Prerequisites

- **Node.js:** v18+ (LTS recommended)
- **npm:** v9+ (comes with Node.js)
- **Database Access:** Credentials for Azure PostgreSQL
- **Password File:** `/users/ben/permissions/.env.admin`

### Installation

```bash
# Clone repository
cd housing-insights-dashboard

# Install dependencies
npm install

# Create password file (if not exists)
mkdir -p /users/ben/permissions
echo "DB_PASSWORD=your_password_here" > /users/ben/permissions/.env.admin

# Run development server
npm run dev

# Open browser
# http://localhost:3000/dashboard
```

### Development Commands

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

### Environment Variables

Create `.env.local` in project root:
```env
# Optional: Override default database settings
DB_HOST=mecone-data-lake.postgres.database.azure.com
DB_PORT=5432
DB_NAME=research&insights
DB_USER=db_admin
```

---

## Known Issues & Considerations

### 1. Password File Path
**Issue:** Hardcoded password file path `/users/ben/permissions/.env.admin`
**Impact:** Not portable across different systems
**Recommendation:**
- Move to environment variables in `.env.local`
- Use Next.js environment variable system
- Implement secure credential management (e.g., Azure Key Vault)

### 2. Database Connection Pooling
**Issue:** Each API call creates new database connection
**Impact:** Performance degradation under load
**Recommendation:**
- Implement connection pooling with `pg.Pool`
- Reuse connections across requests
- Set appropriate pool size limits

### 3. Error Handling
**Issue:** Minimal error boundaries in components
**Impact:** Errors can crash entire dashboard
**Recommendation:**
- Add React Error Boundaries
- Implement graceful degradation
- Add retry logic for failed API calls

### 4. TypeScript Strict Mode
**Issue:** Some `any` types in components (especially drag-and-drop)
**Impact:** Reduced type safety
**Recommendation:**
- Define proper types for @dnd-kit props
- Remove `any` types in CustomArcLinkLabel and other components
- Enable stricter TypeScript compiler options

### 5. localStorage Reliability
**Issue:** Dashboard layout stored in browser localStorage
**Impact:**
- Layout lost when clearing browser data
- No cross-device synchronization
**Recommendation:**
- Implement backend storage for user preferences
- Add user authentication
- Sync layouts to database

### 6. Mobile Responsiveness
**Issue:** Dashboard optimized for desktop (1920px+ screens)
**Impact:** Limited mobile usability
**Recommendation:**
- Review card sizing on mobile devices
- Optimize touch interactions for drag-and-drop
- Consider mobile-specific layout

### 7. GeoJSON File Size
**Issue:** `australia-states.geojson` loaded on every state map render
**Impact:** Unnecessary network requests
**Recommendation:**
- Cache GeoJSON data in component state
- Use static import for build-time inclusion
- Consider optimizing/simplifying geometry

---

## Security Considerations

### Current Vulnerabilities

1. **Password File Exposure:** Password stored in plaintext file
2. **No Authentication:** Dashboard accessible without login
3. **SQL Injection Risk:** Limited input sanitization in API routes
4. **CORS:** No CORS policy defined

### Recommendations

1. **Implement Authentication:**
   - Add NextAuth.js or similar
   - Restrict dashboard access to authenticated users
   - Role-based access control for admin mode

2. **Secure Credentials:**
   - Use Azure Key Vault or similar secret management
   - Environment-based configuration
   - Never commit passwords to repository

3. **Input Validation:**
   - Use Zod or similar for API input validation
   - Parameterized queries to prevent SQL injection
   - Sanitize user inputs

4. **API Security:**
   - Implement rate limiting
   - Add API authentication tokens
   - Set appropriate CORS headers

---

## Deployment

### Vercel Deployment (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Production deployment
vercel --prod
```

**Environment Variables in Vercel:**
1. Go to Project Settings → Environment Variables
2. Add:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t housing-dashboard .
docker run -p 3000:3000 housing-dashboard
```

### Manual Server Deployment

```bash
# Build application
npm run build

# Copy build output
cp -r .next standalone public /var/www/housing-dashboard/

# Start with PM2
pm2 start npm --name housing-dashboard -- start
```

---

## Testing Strategy (Future Implementation)

### Recommended Testing Approach

1. **Unit Tests:**
   - Component rendering tests (React Testing Library)
   - Utility function tests
   - API route tests

2. **Integration Tests:**
   - Dashboard card interactions
   - LGA selection flow
   - Database connection tests

3. **E2E Tests:**
   - Playwright for user workflows
   - Drag-and-drop functionality
   - Admin mode operations

### Test Framework Setup

```bash
npm install -D @testing-library/react @testing-library/jest-dom vitest
npm install -D @playwright/test
```

---

## Performance Optimization Opportunities

1. **Code Splitting:**
   - Lazy load card components
   - Dynamic imports for heavy visualizations

2. **Data Caching:**
   - Cache database query results
   - Implement SWR or React Query
   - Add Redis for API caching

3. **Image Optimization:**
   - Use Next.js Image component for logos
   - Optimize SVG assets

4. **Bundle Size:**
   - Analyze with `@next/bundle-analyzer`
   - Tree-shake unused dependencies
   - Consider lighter alternatives to heavy libraries

---

## Future Enhancement Ideas

1. **User Profiles & Saved Dashboards:**
   - Multi-user support
   - Save/load custom dashboard configurations
   - Share dashboard templates

2. **Export Functionality:**
   - Export visualizations as PNG/SVG
   - Generate PDF reports
   - Export raw data to CSV/Excel

3. **Real-time Updates:**
   - WebSocket connections for live data
   - Auto-refresh on data changes
   - Collaborative editing

4. **Advanced Filtering:**
   - Date range selectors
   - Multi-LGA comparison
   - Custom query builder

5. **Accessibility Improvements:**
   - Keyboard navigation for drag-and-drop
   - Screen reader support
   - High contrast mode
   - WCAG 2.1 AA compliance

6. **Internationalization:**
   - Multi-language support
   - Locale-specific number formatting
   - Region-specific data sources

---

## Support & Resources

### Documentation
- **Next.js:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **shadcn/ui:** https://ui.shadcn.com
- **@dnd-kit:** https://docs.dndkit.com
- **Nivo Charts:** https://nivo.rocks

### Project-Specific Files
- `CLAUDE.md` - Project memory and development notes
- `SESSION-NOTES.md` - Development session history
- `sample.env` - Example environment configuration

### Key Dependencies

```json
{
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^9.0.0",
  "@nivo/pie": "^0.87.0",
  "lucide-react": "^0.468.0",
  "next": "15.5.2",
  "pg": "^8.13.1",
  "react": "^19.0.0",
  "recharts": "^2.15.0",
  "typescript": "^5"
}
```

---

## Contact & Handover

**Original Developer:** Ben
**Handover Date:** December 3, 2025
**Project Status:** Functional prototype ready for production hardening

### Critical Information for New Developer

1. **Database Credentials:** Ensure you have access to Azure PostgreSQL and password file
2. **Node Version:** Use Node 18+ for compatibility
3. **Local Testing:** Run `npm run dev` and navigate to `/dashboard`
4. **Reset Layout:** Use `/reset-layout.html` to clear localStorage if dashboard breaks

### First Steps for New Developer

1. Clone repository and install dependencies
2. Verify database access and password file
3. Run development server and explore dashboard
4. Review key files:
   - `src/app/dashboard/page.tsx` - Main dashboard logic
   - `src/components/dashboard/DraggableDashboard.tsx` - Grid system
   - `src/components/dashboard/AdminToolbar.tsx` - Library sidebar
5. Test LGA selection flow by:
   - Selecting state in Search Geography card
   - Selecting LGA from dropdown
   - Observing data update in other cards
6. Review API routes in `src/app/api/` for data flow understanding

---

## Appendix: Useful Commands

### Database Query Examples

```sql
-- Get all LGAs in NSW
SELECT DISTINCT lga_name24, lga_code24
FROM housing_dashboard.search
WHERE ste_name21 = 'New South Wales'
ORDER BY lga_name24;

-- Get dwelling type data for Dubbo
SELECT dwelling_type, value
FROM s12_census.cen21_dwelling_type_lga
WHERE lga_name_2021 = 'Dubbo';

-- Get age by sex data for Dubbo
SELECT age_group, male, female, total
FROM s12_census.cen21_age_by_sex_lga
WHERE lga_name_2021 = 'Dubbo'
ORDER BY age_group;
```

### Debugging Tips

**Clear localStorage:**
```javascript
localStorage.removeItem('dashboard-layout');
```

**Inspect drag-and-drop state:**
```javascript
// In DashboardPage component, add console.logs:
console.log('Active card:', activeCard);
console.log('All cards:', cards);
```

**Database connection test:**
```javascript
// Test in API route:
console.log('Connecting to:', { host, port, database, user });
```

---

**End of Handover Documentation**

For questions or clarifications, please refer to the codebase comments and CLAUDE.md project file for additional context.
