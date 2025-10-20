"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, MapPin, ChevronDown, Loader2 } from "lucide-react";

export interface ABSLGA {
  id: string;
  name: string;
  code: string;
  state: string;
  area_sqkm?: number;
}

interface ABSLGALookupProps {
  onLGAChange: (lga: ABSLGA | null) => void;
  selectedLGA: ABSLGA | null;
}

export function ABSLGALookup({ onLGAChange, selectedLGA }: ABSLGALookupProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [lgaData, setLgaData] = useState<ABSLGA[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch LGA data from Mosaic_pro ABS Census 2024
  useEffect(() => {
    const fetchLGAs = async () => {
      try {
        setIsLoading(true);

        const response = await fetch('/api/abs-census-lga');
        const data = await response.json();

        if (response.ok && data.lgas && data.lgas.length > 0) {
          // Transform ABS Census data to our format
          const transformedLGAs: ABSLGA[] = data.lgas.map((lga: any) => ({
            id: lga.code?.toString() || lga.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: lga.name,
            code: lga.code,
            state: lga.state,
            area_sqkm: lga.area_sqkm
          }));

          setLgaData(transformedLGAs);
          setError(null);

          console.log(`Loaded ${transformedLGAs.length} LGAs from ABS Census 2024 (Mosaic_pro)`);
        } else {
          if (data.error && data.error.includes('permission denied')) {
            setError('Database permissions required: Need access to boundaries schema');
          } else {
            setError('Failed to load ABS Census 2024 data');
          }
        }
      } catch (err) {
        console.error('Error fetching ABS Census LGAs:', err);
        if (err instanceof Error && err.message.includes('permission denied')) {
          setError('Database permissions required: mosaic_readonly user needs boundaries schema access');
        } else {
          setError('Connection error - Mosaic_pro server unavailable');
        }
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
      lga.state.toLowerCase().includes(term) ||
      lga.code.toLowerCase().includes(term)
    );
  }, [searchTerm, lgaData]);

  // Group LGAs by state
  const groupedLGAs = useMemo(() => {
    const groups: { [key: string]: ABSLGA[] } = {};
    filteredLGAs.forEach(lga => {
      if (!groups[lga.state]) {
        groups[lga.state] = [];
      }
      groups[lga.state].push(lga);
    });

    // Sort states and LGAs within each state
    const sortedGroups: { [key: string]: ABSLGA[] } = {};
    Object.keys(groups).sort().forEach(state => {
      sortedGroups[state] = groups[state].sort((a, b) => a.name.localeCompare(b.name));
    });

    return sortedGroups;
  }, [filteredLGAs]);

  const handleLGASelect = (lga: ABSLGA) => {
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
            <CardTitle className="text-xl">ABS Geography Search</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Search using ABS Census 2024 LGA data from Mosaic_pro
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading ABS Census 2024 data...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2">
            <div className="text-xs text-red-800">{error}</div>
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
                    {selectedLGA.state} • Code: {selectedLGA.code}
                    {selectedLGA.area_sqkm && ` • Area: ${selectedLGA.area_sqkm.toFixed(1)} km²`}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-muted-foreground">No Selection</div>
                  <div className="text-xs text-muted-foreground">
                    Choose an LGA from ABS Census 2024 data
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
            placeholder="Search ABS Census 2024 LGAs..."
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
              Object.entries(groupedLGAs).map(([state, lgas]) => (
                <div key={state}>
                  <div className="sticky top-0 bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
                    {state}
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
                            Code: {lga.code}
                            {lga.area_sqkm && ` • ${lga.area_sqkm.toFixed(1)} km²`}
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
            {filteredLGAs.length} of {lgaData.length} ABS Census 2024 LGAs available
          </div>
        )}
      </CardContent>
    </Card>
  );
}