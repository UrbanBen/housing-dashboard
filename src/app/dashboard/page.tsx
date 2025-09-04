import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Home, DollarSign } from "lucide-react";
import { TrendChart } from "@/components/charts/TrendChart";
import { MarketOverview } from "@/components/dashboard/MarketOverview";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Housing Analytics</h2>
              <p className="text-sm text-muted-foreground">Market Intelligence Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs bg-highlight/10 text-highlight px-3 py-1 rounded-full font-medium">
                LIVE DATA
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-3">Housing Market Analytics</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Comprehensive trend analysis and market insights for informed decision-making and public transparency
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Median Home Price</CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-2">$485,200</div>
              <p className="text-sm flex items-center text-primary">
                <TrendingUp className="h-4 w-4 mr-1" />
                +2.4% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-chart-2/5 to-transparent"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Market Velocity</CardTitle>
              <Activity className="h-5 w-5 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-2">18 days</div>
              <p className="text-sm flex items-center text-chart-2">
                <TrendingDown className="h-4 w-4 mr-1" />
                -3 days from last month
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-chart-3/5 to-transparent"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Housing Inventory</CardTitle>
              <Home className="h-5 w-5 text-chart-3" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-2">2,847</div>
              <p className="text-sm flex items-center text-chart-3">
                <TrendingUp className="h-4 w-4 mr-1" />
                +8.2% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-highlight/5 to-transparent"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Price-to-Income Ratio</CardTitle>
              <TrendingUp className="h-5 w-5 text-highlight" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-2">4.2x</div>
              <p className="text-sm flex items-center text-highlight">
                <TrendingUp className="h-4 w-4 mr-1" />
                +0.3 from last quarter
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <Card className="shadow-lg border border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <TrendingUp className="h-6 w-6 text-primary" />
                Housing Price Trends
              </CardTitle>
              <CardDescription className="text-base">
                12-month median home price progression with forecasting models
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <TrendChart />
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Activity className="h-6 w-6 text-chart-2" />
                Market Overview
              </CardTitle>
              <CardDescription className="text-base">
                Key housing market indicators and health metrics comparison
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <MarketOverview />
            </CardContent>
          </Card>
        </div>

        {/* Additional Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Market Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <span className="text-sm font-medium text-foreground">Next Quarter</span>
                  <span className="font-bold text-lg text-primary">+3.2%</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-chart-2/5 border border-chart-2/10">
                  <span className="text-sm font-medium text-foreground">Next Year</span>
                  <span className="font-bold text-lg text-chart-2">+12.8%</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-highlight/5 border border-highlight/10">
                  <span className="text-sm font-medium text-foreground">Confidence Level</span>
                  <span className="font-bold text-lg text-highlight">85%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardHeader>
              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                <Home className="h-5 w-5 text-chart-3" />
                Regional Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-between items-center p-3 rounded-lg bg-card border border-border">
                  <span className="text-sm font-medium text-muted-foreground">Metro Average</span>
                  <span className="font-bold text-lg text-foreground">$467,100</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-card border border-border">
                  <span className="text-sm font-medium text-muted-foreground">State Average</span>
                  <span className="font-bold text-lg text-foreground">$421,900</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-card border border-border">
                  <span className="text-sm font-medium text-muted-foreground">National Average</span>
                  <span className="font-bold text-lg text-foreground">$398,500</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardHeader>
              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                <Activity className="h-5 w-5 text-chart-4" />
                Data Freshness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Price Data</span>
                  <span className="text-sm bg-primary/15 text-primary px-3 py-1.5 rounded-full font-semibold">
                    Real-time
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Inventory</span>
                  <span className="text-sm bg-chart-2/15 text-chart-2 px-3 py-1.5 rounded-full font-semibold">
                    Daily
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Market Stats</span>
                  <span className="text-sm bg-chart-3/15 text-chart-3 px-3 py-1.5 rounded-full font-semibold">
                    Weekly
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()} • Data sources: Multiple MLS feeds, Census Bureau, Federal Reserve
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}