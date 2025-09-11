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
}

interface LGALookupProps {
  onLGAChange: (lga: LGA | null) => void;
  selectedLGA: LGA | null;
}

// This will be replaced by database data
const FALLBACK_NSW_LGAS: LGA[] = [
  // Sydney Metropolitan
  { id: 'sydney', name: 'Sydney', region: 'Sydney Metro', population: 240000 },
  { id: 'parramatta', name: 'Parramatta', region: 'Sydney Metro', population: 249000 },
  { id: 'blacktown', name: 'Blacktown', region: 'Sydney Metro', population: 387000 },
  { id: 'penrith', name: 'Penrith', region: 'Sydney Metro', population: 215000 },
  { id: 'liverpool', name: 'Liverpool', region: 'Sydney Metro', population: 230000 },
  { id: 'campbelltown', name: 'Campbelltown', region: 'Sydney Metro', population: 180000 },
  { id: 'fairfield', name: 'Fairfield', region: 'Sydney Metro', population: 208000 },
  { id: 'bankstown', name: 'Canterbury-Bankstown', region: 'Sydney Metro', population: 380000 },
  { id: 'georges-river', name: 'Georges River', region: 'Sydney Metro', population: 165000 },
  { id: 'sutherland', name: 'Sutherland Shire', region: 'Sydney Metro', population: 230000 },
  { id: 'bayside', name: 'Bayside', region: 'Sydney Metro', population: 170000 },
  { id: 'randwick', name: 'Randwick', region: 'Sydney Metro', population: 150000 },
  { id: 'waverley', name: 'Waverley', region: 'Sydney Metro', population: 75000 },
  { id: 'woollahra', name: 'Woollahra', region: 'Sydney Metro', population: 60000 },
  { id: 'inner-west', name: 'Inner West', region: 'Sydney Metro', population: 195000 },
  { id: 'canada-bay', name: 'Canada Bay', region: 'Sydney Metro', population: 95000 },
  { id: 'strathfield', name: 'Strathfield', region: 'Sydney Metro', population: 42000 },
  { id: 'burwood', name: 'Burwood', region: 'Sydney Metro', population: 42000 },
  { id: 'ryde', name: 'Ryde', region: 'Sydney Metro', population: 120000 },
  { id: 'hunters-hill', name: 'Hunters Hill', region: 'Sydney Metro', population: 14000 },
  { id: 'lane-cove', name: 'Lane Cove', region: 'Sydney Metro', population: 38000 },
  { id: 'willoughby', name: 'Willoughby', region: 'Sydney Metro', population: 75000 },
  { id: 'north-sydney', name: 'North Sydney', region: 'Sydney Metro', population: 70000 },
  { id: 'mosman', name: 'Mosman', region: 'Sydney Metro', population: 30000 },
  { id: 'manly', name: 'Northern Beaches', region: 'Sydney Metro', population: 265000 },
  { id: 'ku-ring-gai', name: 'Ku-ring-gai', region: 'Sydney Metro', population: 125000 },
  { id: 'hornsby', name: 'Hornsby', region: 'Sydney Metro', population: 165000 },
  { id: 'the-hills', name: 'The Hills Shire', region: 'Sydney Metro', population: 175000 },
  { id: 'blacktown-west', name: 'Blacktown', region: 'Sydney Metro', population: 387000 },
  { id: 'blue-mountains', name: 'Blue Mountains', region: 'Sydney Metro', population: 82000 },

  // Central Coast
  { id: 'central-coast', name: 'Central Coast', region: 'Central Coast', population: 350000 },

  // Hunter
  { id: 'newcastle', name: 'Newcastle', region: 'Hunter', population: 167000 },
  { id: 'lake-macquarie', name: 'Lake Macquarie', region: 'Hunter', population: 215000 },
  { id: 'maitland', name: 'Maitland', region: 'Hunter', population: 90000 },
  { id: 'cessnock', name: 'Cessnock', region: 'Hunter', population: 60000 },
  { id: 'port-stephens', name: 'Port Stephens', region: 'Hunter', population: 74000 },
  { id: 'singleton', name: 'Singleton', region: 'Hunter', population: 24000 },
  { id: 'muswellbrook', name: 'Muswellbrook', region: 'Hunter', population: 17000 },

  // Illawarra
  { id: 'wollongong', name: 'Wollongong', region: 'Illawarra', population: 220000 },
  { id: 'shellharbour', name: 'Shellharbour', region: 'Illawarra', population: 75000 },
  { id: 'kiama', name: 'Kiama', region: 'Illawarra', population: 23000 },
  { id: 'shoalhaven', name: 'Shoalhaven', region: 'Illawarra', population: 110000 },
  { id: 'wingecarribee', name: 'Wingecarribee', region: 'Illawarra', population: 50000 },

  // Central West
  { id: 'bathurst', name: 'Bathurst Regional', region: 'Central West', population: 45000 },
  { id: 'orange', name: 'Orange', region: 'Central West', population: 42000 },
  { id: 'dubbo', name: 'Dubbo Regional', region: 'Central West', population: 55000 },
  { id: 'wagga-wagga', name: 'Wagga Wagga', region: 'Central West', population: 70000 },
  { id: 'albury', name: 'Albury', region: 'Central West', population: 55000 },

  // North Coast
  { id: 'tweed', name: 'Tweed', region: 'North Coast', population: 100000 },
  { id: 'byron', name: 'Byron', region: 'North Coast', population: 35000 },
  { id: 'ballina', name: 'Ballina', region: 'North Coast', population: 47000 },
  { id: 'lismore', name: 'Lismore', region: 'North Coast', population: 45000 },
  { id: 'richmond-valley', name: 'Richmond Valley', region: 'North Coast', population: 23000 },
  { id: 'coffs-harbour', name: 'Coffs Harbour', region: 'North Coast', population: 78000 },
  { id: 'port-macquarie-hastings', name: 'Port Macquarie-Hastings', region: 'North Coast', population: 85000 },

  // Far West
  { id: 'broken-hill', name: 'Broken Hill', region: 'Far West', population: 18000 },
  { id: 'unincorporated-far-west', name: 'Unincorporated Far West', region: 'Far West', population: 5000 }
];

export function LGALookup({ onLGAChange, selectedLGA }: LGALookupProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [lgaData, setLgaData] = useState<LGA[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch LGA data from database
  useEffect(() => {
    const fetchLGAs = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/lgas');
        const data = await response.json();
        
        if (data.success) {
          setLgaData(data.lgas);
          setError(null);
        } else {
          console.warn('Failed to fetch LGAs from database, using fallback data');
          setLgaData(FALLBACK_NSW_LGAS);
          setError('Using offline data');
        }
      } catch (err) {
        console.error('Error fetching LGAs:', err);
        setLgaData(FALLBACK_NSW_LGAS);
        setError('Using offline data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLGAs();
  }, []);

  // Filter LGAs based on search term
  const filteredLGAs = useMemo(() => {
    if (!searchTerm.trim()) return lgaData;
    
    const term = searchTerm.toLowerCase();
    return lgaData.filter(lga => 
      lga.name.toLowerCase().includes(term) ||
      lga.region.toLowerCase().includes(term)
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

  const handleLGASelect = (lga: LGA) => {
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
            <CardTitle className="text-xl">Local Government Area</CardTitle>
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

        {/* Current Selection */}
        {selectedLGA && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground">{selectedLGA.name}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedLGA.region}
                  {selectedLGA.population && ` • Pop: ${selectedLGA.population.toLocaleString()}`}
                  {selectedLGA.housingTarget && ` • Target: ${selectedLGA.housingTarget.toLocaleString()}`}
                </div>
              </div>
              <button
                onClick={handleClearSelection}
                className="text-xs bg-destructive/20 text-destructive hover:bg-destructive/30 px-2 py-1 rounded transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

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
                            {lga.population 
                              ? `Population: ${lga.population.toLocaleString()}` 
                              : `Housing Target: ${lga.housingTarget?.toLocaleString() || 'N/A'}`
                            }
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