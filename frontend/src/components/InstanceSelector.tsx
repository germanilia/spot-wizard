import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSnapshot } from "valtio";
import { spotStore, actions } from "../store/spotStore";
import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Helper function to get instance family
const getInstanceFamily = (instance: string): string => {
  const match = instance.match(/^([a-z0-9]+)\./);
  return match ? match[1] : 'Other';
};

export function InstanceSelector() {
  const [open, setOpen] = useState(false);
  const { instanceTypes, selectedInstances } = useSnapshot(spotStore);

  // Group instances by family
  const groupedInstances = useMemo(() => {
    const groups = instanceTypes.reduce((acc, instance) => {
      const family = getInstanceFamily(instance);
      if (!acc[family]) acc[family] = [];
      acc[family].push(instance);
      return acc;
    }, {} as Record<string, string[]>);

    // Sort instances within each group
    Object.keys(groups).forEach(family => {
      groups[family].sort();
    });

    // Sort groups
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [instanceTypes]);

  const handleSelectAll = () => {
    actions.setSelectedInstances(instanceTypes);
  };

  const handleClearAll = () => {
    actions.setSelectedInstances([]);
  };

  const handleSelectFamily = (family: string) => {
    const familyInstances = groupedInstances.find(([f]) => f === family)?.[1] || [];
    const newSelected = [...selectedInstances];
    
    // If all instances in family are selected, unselect them
    const allSelected = familyInstances.every(instance => selectedInstances.includes(instance));
    
    if (allSelected) {
      familyInstances.forEach(instance => {
        const index = newSelected.indexOf(instance);
        if (index > -1) newSelected.splice(index, 1);
      });
    } else {
      familyInstances.forEach(instance => {
        if (!newSelected.includes(instance)) {
          newSelected.push(instance);
        }
      });
    }
    
    actions.setSelectedInstances(newSelected);
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-primary">Select Instance Types</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={selectedInstances.length === instanceTypes.length}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={selectedInstances.length === 0}
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
                  {selectedInstances.length > 0
                    ? `${selectedInstances.length} instance${selectedInstances.length > 1 ? 's' : ''} selected`
                    : "Select instances..."}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput placeholder="Search instance types..." className="h-9" />
                <CommandEmpty>No instance type found.</CommandEmpty>
                <div className="max-h-[300px] overflow-y-auto">
                  {groupedInstances.map(([family, instances]) => (
                    <CommandGroup key={family} heading={family} className="px-2">
                      <CommandItem
                        value={`${family}-all`}
                        onSelect={() => handleSelectFamily(family)}
                        className="flex items-center py-2 px-2 cursor-pointer hover:bg-accent"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            instances.every(instance => selectedInstances.includes(instance))
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <span className="font-medium">Select All {family}</span>
                      </CommandItem>
                      {instances.map((instance) => (
                        <CommandItem
                          key={instance}
                          value={instance}
                          onSelect={() => {
                            if (!selectedInstances.includes(instance)) {
                              actions.setSelectedInstances([...selectedInstances, instance]);
                            }
                          }}
                          className="flex items-center py-2 px-2 cursor-pointer hover:bg-accent"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedInstances.includes(instance) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="font-medium">{instance}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </div>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedInstances.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedInstances.map((instance: string) => (
                <div
                  key={instance}
                  className="bg-primary/10 text-primary rounded-md px-2 py-1 text-sm flex items-center gap-2"
                >
                  <span>{instance}</span>
                  <button
                    onClick={() => {
                      actions.setSelectedInstances(
                        selectedInstances.filter((i) => i !== instance)
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