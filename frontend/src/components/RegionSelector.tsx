import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { useSnapshot } from "valtio";
import { spotStore, actions } from "../store/spotStore";
import { getRegionName } from "@/lib/regionMapping";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { RegionCode } from "@/types/spot";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Group regions by geographical area
const getRegionGroup = (regionCode: string): string => {
  if (regionCode.startsWith('us-')) return 'Americas - US';
  if (regionCode.startsWith('ca-')) return 'Americas - Canada';
  if (regionCode.startsWith('sa-')) return 'Americas - South';
  if (regionCode.startsWith('mx-')) return 'Americas - Mexico';
  if (regionCode.startsWith('eu-')) return 'Europe';
  if (regionCode.startsWith('ap-')) return 'Asia Pacific';
  if (regionCode.startsWith('me-')) return 'Middle East';
  if (regionCode.startsWith('af-')) return 'Africa';
  if (regionCode.startsWith('il-')) return 'Middle East';
  return 'Other';
};

// Helper function to get all regions in a group
const getRegionsInGroup = (regions: RegionCode[], group: string): RegionCode[] => {
  return regions.filter(region => getRegionGroup(region) === group);
};

export function RegionSelector() {
  const [open, setOpen] = useState(false);
  const { availableRegions = [], selectedRegions = [] } = useSnapshot(spotStore);
  const [searchValue, setSearchValue] = useState("");

  // Sort and group regions
  const groupedRegions = useMemo(() => {
    // Filter regions based on search value
    const filteredRegions = availableRegions.filter(regionCode => {
      const friendlyName = getRegionName(regionCode).toLowerCase();
      const code = regionCode.toLowerCase();
      const search = searchValue.toLowerCase();
      return code.startsWith(search) || friendlyName.includes(search);
    });

    // Group the filtered regions
    const groups = filteredRegions.reduce((acc, regionCode) => {
      const group = getRegionGroup(regionCode);
      if (!acc[group]) acc[group] = [];
      acc[group].push(regionCode);
      return acc;
    }, {} as Record<string, RegionCode[]>);

    // Sort regions within each group
    Object.keys(groups).forEach(group => {
      groups[group].sort((a, b) => getRegionName(a).localeCompare(getRegionName(b)));
    });

    // Sort groups
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [availableRegions, searchValue]);

  const handleSelectAll = () => {
    actions.setSelectedRegions([...availableRegions]);
  };

  const handleClearAll = () => {
    actions.setSelectedRegions([]);
  };

  const handleSelectGroup = (group: string) => {
    const groupRegions = getRegionsInGroup(availableRegions, group);
    const newSelected = [...selectedRegions];
    
    // If all regions in group are selected, unselect them
    const allSelected = groupRegions.every(region => selectedRegions.includes(region));
    
    if (allSelected) {
      groupRegions.forEach(region => {
        const index = newSelected.indexOf(region);
        if (index > -1) newSelected.splice(index, 1);
      });
    } else {
      groupRegions.forEach(region => {
        if (!newSelected.includes(region)) {
          newSelected.push(region);
        }
      });
    }
    
    actions.setSelectedRegions(newSelected);
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-primary">Select Regions</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={selectedRegions.length === availableRegions.length}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={selectedRegions.length === 0}
            >
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between border-2 hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <span className="truncate">
                  {selectedRegions.length > 0
                    ? `${selectedRegions.length} region${selectedRegions.length > 1 ? 's' : ''} selected`
                    : "Select regions..."}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput 
                  placeholder="Search regions..." 
                  value={searchValue}
                  onValueChange={setSearchValue}
                  className="h-9"
                />
                <CommandEmpty>No regions found.</CommandEmpty>
                <div className="max-h-[300px] overflow-y-auto">
                  {groupedRegions.map(([group, regions]) => (
                    <CommandGroup key={group} heading={group} className="px-2">
                      <CommandItem
                        value={`${group}-all`}
                        onSelect={() => handleSelectGroup(group)}
                        className="flex items-center py-2 px-2 cursor-pointer hover:bg-accent"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            regions.every(region => selectedRegions.includes(region))
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <span className="font-medium">Select All {group}</span>
                      </CommandItem>
                      {regions.map(regionCode => {
                        const isSelected = selectedRegions.includes(regionCode);
                        const friendlyName = getRegionName(regionCode);
                        
                        return (
                          <CommandItem
                            key={regionCode}
                            value={regionCode}
                            onSelect={() => {
                              if (!selectedRegions.includes(regionCode)) {
                                actions.setSelectedRegions([...selectedRegions, regionCode]);
                              }
                            }}
                            className="flex items-center py-2 px-2 cursor-pointer hover:bg-accent"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{friendlyName}</span>
                              <span className="text-xs text-muted-foreground">{regionCode}</span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ))}
                </div>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedRegions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedRegions.map(region => (
                <div
                  key={region}
                  className="bg-primary/10 text-primary rounded-md px-2 py-1 text-sm flex items-center gap-2"
                >
                  <div className="flex flex-col">
                    <span>{getRegionName(region)}</span>
                    <span className="text-xs text-muted-foreground">{region}</span>
                  </div>
                  <button
                    onClick={() => {
                      actions.setSelectedRegions(
                        selectedRegions.filter((r) => r !== region)
                      );
                    }}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}