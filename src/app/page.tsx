import Link from "next/link";
import { TrendingUp, BarChart3, LineChart } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Housing Insights Dashboard
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            Advanced housing market analytics platform providing comprehensive trend analysis and forecasting for public transparency and data-driven insights
          </p>
          <div className="flex justify-center gap-6">
            <Link 
              href="/dashboard"
              className="bg-primary hover:bg-primary/80 text-primary-foreground font-medium py-4 px-8 rounded-lg transition-colors inline-flex items-center gap-2 text-lg"
            >
              <TrendingUp className="w-5 h-5" />
              View Analytics Dashboard
            </Link>
            <button className="bg-card hover:bg-muted text-card-foreground font-medium py-4 px-8 rounded-lg border border-border transition-colors text-lg">
              Explore Data Sources
            </button>
          </div>
        </div>
        
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-card p-8 rounded-lg border border-border">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold text-card-foreground">Trend Analysis</h3>
            </div>
            <p className="text-muted-foreground">Historical housing data, market progression tracking, and predictive forecasting models</p>
          </div>
          <div className="bg-card p-8 rounded-lg border border-border">
            <div className="flex items-center gap-3 mb-4">
              <LineChart className="w-6 h-6 text-chart-2" />
              <h3 className="text-xl font-semibold text-card-foreground">Market Intelligence</h3>
            </div>
            <p className="text-muted-foreground">Real-time market indicators, price movements, and comprehensive market health metrics</p>
          </div>
          <div className="bg-card p-8 rounded-lg border border-border">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-6 h-6 text-chart-3" />
              <h3 className="text-xl font-semibold text-card-foreground">Public Accessibility</h3>
            </div>
            <p className="text-muted-foreground">Transparent, accessible housing data visualization designed for community understanding</p>
          </div>
        </div>
      </div>
    </div>
  );
}