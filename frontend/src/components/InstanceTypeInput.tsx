import { useState } from 'react';
import { useSnapshot } from 'valtio';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { X, Loader2 } from 'lucide-react';
import { spotStore, actions } from '../store/spotStore';
import { SpotService } from '../services/spotService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatInstanceSpecs } from '@/lib/utils';

export function InstanceTypeInput() {
  const { selectedInstances = [], instanceTypes = [], isLoading, error } = useSnapshot(spotStore);
  const [inputValue, setInputValue] = useState('');
  const spotService = SpotService.getInstance();
  const spotData = spotService.getSpotData();

  const handleSelect = (value: string) => {
    if (!selectedInstances.includes(value)) {
      actions.setSelectedInstances([...selectedInstances, value]);
    }
  };

  const removeInstanceType = (type: string) => {
    actions.setSelectedInstances(selectedInstances.filter(t => t !== type));
  };

  const clearInstanceTypes = () => {
    actions.setSelectedInstances([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 border rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading instance types...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Command className="border rounded-lg flex-1">
          <CommandInput
            placeholder="Search instance types..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>No instance type found.</CommandEmpty>
            <CommandGroup>
              {instanceTypes
                .filter(type => type.toLowerCase().includes(inputValue.toLowerCase()))
                .map(type => {
                  const specs = spotData?.instance_types[type];
                  return (
                    <CommandItem
                      key={type}
                      value={type}
                      onSelect={handleSelect}
                      disabled={selectedInstances.includes(type)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <span>{type}</span>
                        {specs && (
                          <span className="text-xs text-muted-foreground">
                            {formatInstanceSpecs(specs.cores, specs.ram_gb)}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </CommandList>
        </Command>
        {selectedInstances.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearInstanceTypes}
            className="ml-2"
          >
            Clear
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {selectedInstances.map(type => {
          const specs = spotData?.instance_types[type];
          return (
            <Badge key={type} variant="secondary" className="flex items-center gap-1">
              <div className="flex flex-col">
                <span>{type}</span>
                {specs && (
                  <span className="text-xs text-muted-foreground">
                    {formatInstanceSpecs(specs.cores, specs.ram_gb)}
                  </span>
                )}
              </div>
              <button
                onClick={() => removeInstanceType(type)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
      </div>
    </div>
  );
} 