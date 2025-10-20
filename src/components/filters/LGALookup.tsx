"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, MapPin, ChevronDown, Loader2 } from "lucide-react";

export interface LGA {
  id: string;
  name: string;
  region: string;
  population: number | null;
  populationYear?: number | null;
  housingTarget?: number;
  urbanity?: string; // 'U' for Urban, 'R' for Rural
  councilName?: string; // Full council name
  geometry?: any; // GeoJSON geometry object
  area?: number; // Area in square kilometers
}

interface LGALookupProps {
  onLGAChange: (lga: LGA | null) => void;
  selectedLGA: LGA | null;
}


// Helper function to convert text to proper title case
const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

// Helper function to remove suffix words from LGA names
const cleanLGAName = (str: string): string => {
  if (!str) return '';
  return str.replace(/\b(City|Shire|Regional)\b/gi, '').trim();
};

export function LGALookup({ onLGAChange, selectedLGA }: LGALookupProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [lgaData, setLgaData] = useState<LGA[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prevent multiple API calls with a ref
  const hasFetchedRef = React.useRef(false);

  // Fetch LGA data from NSW Spatial Services - only run once on mount
  useEffect(() => {
    let cancelled = false;

    // Prevent multiple API calls
    if (hasFetchedRef.current) {
      return;
    }

    hasFetchedRef.current = true;

    const fetchLGAs = async () => {
      try {
        setIsLoading(true);

        // Only use database connection - no fallbacks
        const response = await fetch('/api/lga-database?action=list');

        // Check if component unmounted
        if (cancelled) return;

        const data = await response.json();

        if (response.ok && data.lgas && data.lgas.length > 0) {
          // Transform database data to our format
          const transformedLGAs: LGA[] = data.lgas.map((lga: any) => ({
            id: lga.code?.toString() || lga.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: cleanLGAName(toTitleCase(lga.name)),
            region: lga.region || 'NSW',
            population: null, // Can be populated later if needed
            urbanity: 'U', // Default to Urban
            councilName: lga.name
          }));

          // Add NSW state-wide option at the top
          const nswStateWide: LGA = {
            id: 'nsw-state',
            name: 'New South Wales (State-wide)',
            region: 'State',
            population: null,
            urbanity: 'S', // 'S' for State
            councilName: 'NSW Government'
          };

          if (!cancelled) {
            setLgaData([nswStateWide, ...transformedLGAs]);
            setError(null);
            console.log(`Loaded ${transformedLGAs.length} LGAs from Azure PostgreSQL database`);
          }
        } else {
          // Database connection failed
          if (!cancelled) {
            setLgaData([]);
            setError(data.error || 'Database connection failed');
            console.error('Failed to load LGAs from database:', data.error);
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching LGAs from database:', err);
        setLgaData([]);
        setError('Database connection error');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchLGAs();

    // Cleanup function
    return () => {
      cancelled = true;
    };
  }, []); // Empty dependency array - only run once on mount

  // Auto-select NSW state-wide if nothing is selected and data is loaded (only once)
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  useEffect(() => {
    if (!selectedLGA && lgaData.length > 0 && !isLoading && !hasAutoSelected && !error) {
      const nswStateWide = lgaData.find(lga => lga.id === 'nsw-state');
      if (nswStateWide) {
        onLGAChange(nswStateWide);
        setHasAutoSelected(true);
      }
    }
  }, [selectedLGA, lgaData, isLoading, hasAutoSelected, error]);

  // Filter LGAs based on search term
  const filteredLGAs = useMemo(() => {
    if (!searchTerm.trim()) return lgaData;
    
    const term = searchTerm.toLowerCase();
    return lgaData.filter(lga => 
      lga.name.toLowerCase().includes(term) ||
      lga.region.toLowerCase().includes(term) ||
      (lga.councilName && lga.councilName.toLowerCase().includes(term))
    );
  }, [searchTerm, lgaData]);

  // Group LGAs by region
  const groupedLGAs = useMemo(() => {
    const groups: { [key: string]: LGA[] } = {};
    filteredLGAs.forEach(lga => {
      if (!groups[lga.region]) {
        groups[lga.region] = [];
      }
      groups[lga.region].push(lga);
    });
    
    // Sort regions and LGAs within each region
    const sortedGroups: { [key: string]: LGA[] } = {};
    Object.keys(groups).sort().forEach(region => {
      sortedGroups[region] = groups[region].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    return sortedGroups;
  }, [filteredLGAs]);

  const handleLGASelect = async (lga: LGA) => {
    if (lga && lga.id !== 'nsw-state') {
      // Fetch additional details including geometry and area from database
      try {
        const response = await fetch(`/api/lga-database?action=details&lgaCode=${lga.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.lga) {
            // Enhance the LGA object with geometry and area
            const enhancedLGA = {
              ...lga,
              geometry: data.lga.geometry,
              area: data.lga.area
            };
            onLGAChange(enhancedLGA);
            setIsDropdownOpen(false);
            setSearchTerm('');
            return;
          }
        }
      } catch (error) {
        console.error('Failed to fetch LGA details:', error);
      }
    }

    // Fallback to basic LGA data
    onLGAChange(lga);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  const handleClearSelection = () => {
    onLGAChange(null);
    setSearchTerm('');
  };

  return (
    <Card className="shadow-lg border border-border/50 h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-xl">Secondary Search</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Filter all housing data by NSW LGA
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading LGAs...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
            <div className="text-xs text-yellow-800">{error}</div>
          </div>
        )}

        {/* Current Selection - Always visible to prevent resizing */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              {selectedLGA ? (
                <>
                  <div className="font-semibold text-foreground">{selectedLGA.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedLGA.councilName || selectedLGA.region}
                    {selectedLGA.population && ` • Pop: ${selectedLGA.population.toLocaleString()}`}
                    {selectedLGA.housingTarget && ` • Target: ${selectedLGA.housingTarget.toLocaleString()}`}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-muted-foreground">No Selection</div>
                  <div className="text-xs text-muted-foreground">
                    Choose an LGA to view specific data
                  </div>
                </>
              )}
            </div>
            {selectedLGA && (
              <button
                onClick={handleClearSelection}
                className="text-xs bg-destructive/20 text-destructive hover:bg-destructive/30 px-2 py-1 rounded transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isDropdownOpen) {
                // Select the top search result
                const firstGroup = Object.values(groupedLGAs)[0];
                if (firstGroup && firstGroup.length > 0) {
                  handleLGASelect(firstGroup[0]);
                }
              } else if (e.key === 'Escape') {
                setIsDropdownOpen(false);
                setSearchTerm('');
              }
            }}
            placeholder="Search NSW Local Government Areas..."
            className="w-full pl-10 pr-10 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Dropdown Results */}
        {isDropdownOpen && (
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-80 overflow-y-auto left-0 right-0">
            {Object.keys(groupedLGAs).length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No LGAs found matching "{searchTerm}"
              </div>
            ) : (
              Object.entries(groupedLGAs).map(([region, lgas]) => (
                <div key={region}>
                  <div className="sticky top-0 bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
                    {region}
                  </div>
                  {lgas.map((lga) => (
                    <button
                      key={lga.id}
                      onClick={() => handleLGASelect(lga)}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b border-border/30 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-foreground">{lga.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {lga.councilName || lga.region}
                            {lga.population && ` • ${lga.population.toLocaleString()}`}
                          </div>
                        </div>
                        {selectedLGA?.id === lga.id && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* Click outside to close dropdown */}
        {isDropdownOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}

        {/* Stats */}
        {!isLoading && (
          <div className="text-xs text-muted-foreground border-t pt-3">
            {filteredLGAs.length} of {lgaData.length} NSW LGAs available
          </div>
        )}
      </CardContent>
    </Card>
  );
}