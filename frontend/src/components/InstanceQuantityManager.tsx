import { useState, useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import { spotStore, actions } from '../store/spotStore';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RegionCode } from '@/types/spot';
import { getRegionName } from '@/lib/regionMapping';
import { Badge } from '@/components/ui/badge';
import { OSSelector } from './OSSelector';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface InstanceQuantityManagerProps {
  className?: string;
}

export function InstanceQuantityManager({ className }: InstanceQuantityManagerProps) {
  const { selectedInstances, selectedRegions, instanceQuantities } = useSnapshot(spotStore);
  const [instanceQuantityMap, setInstanceQuantityMap] = useState<Record<string, number>>({});
  const [activeOS, setActiveOS] = useState<'Linux' | 'Windows'>('Linux');
  const [activeRegion, setActiveRegion] = useState<RegionCode | ''>('');
  // Start with the UI expanded by default
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Track if user has manually selected a region
  const userSelectedRegion = useRef(false);

  // Initialize with currently selected region or first available region
  useEffect(() => {
    if (selectedRegions.length > 0 && !activeRegion) {
      setActiveRegion(selectedRegions[0]);
    }
  }, [selectedRegions, activeRegion]);

  // When region changes, make sure all instances are initialized for that region
  useEffect(() => {
    if (!activeRegion || selectedInstances.length === 0) return;
    
    // Initialize any missing quantities for the newly selected region
    selectedInstances.forEach(instanceType => {
      const key = `${instanceType}-${activeRegion}-${activeOS}`;
      if (!instanceQuantityMap[key]) {
        // Check if this instance-region-OS combination already has a quantity in the store
        const existingConfig = instanceQuantities.find(
          q => q.instanceType === instanceType && 
              q.region === activeRegion && 
              q.operatingSystem === activeOS
        );
        
        if (!existingConfig) {
          // If no quantity exists yet, initialize with 1
          actions.updateInstanceQuantity(instanceType, activeRegion as RegionCode, activeOS, 1);
        }
      }
    });
  }, [activeRegion, activeOS, selectedInstances, instanceQuantityMap, instanceQuantities]);

  // Always expand the UI when quantities are imported
  useEffect(() => {
    if (instanceQuantities.length > 0) {
      setIsCollapsed(false);
    }
  }, [instanceQuantities]);

  // Initialize all instances with quantity 1 for each selected region and both OS
  useEffect(() => {
    if (selectedInstances.length === 0 || selectedRegions.length === 0) return;
    
    // Only initialize instances that don't have quantity set yet
    const operatingSystems: ('Linux' | 'Windows')[] = ['Linux', 'Windows'];
    
    selectedInstances.forEach(instanceType => {
      selectedRegions.forEach(region => {
        operatingSystems.forEach(os => {
          const key = `${instanceType}-${region}-${os}`;
          if (!instanceQuantityMap[key]) {
            // Don't initialize with default 1 if quantities were imported
            const existingConfig = instanceQuantities.find(
              q => q.instanceType === instanceType && q.region === region && q.operatingSystem === os
            );
            
            if (!existingConfig) {
              actions.updateInstanceQuantity(instanceType, region, os, 1);
            }
          }
        });
      });
    });
  }, [selectedInstances, selectedRegions, instanceQuantityMap, instanceQuantities]);

  // Update instance quantities when a region or OS changes
  const updateInstanceQuantity = (instanceType: string, quantity: number) => {
    if (!activeRegion) return;
    
    actions.updateInstanceQuantity(
      instanceType,
      activeRegion as RegionCode,
      activeOS,
      quantity
    );

    // Update local state for UI
    setInstanceQuantityMap({
      ...instanceQuantityMap,
      [`${instanceType}-${activeRegion}-${activeOS}`]: quantity
    });
    
    // Trigger price recalculation after quantity change
    setTimeout(() => actions.analyzeInstances(), 100);
  };

  // Initialize quantity map from store
  useEffect(() => {
    const newMap: Record<string, number> = {};
    
    instanceQuantities.forEach(item => {
      const key = `${item.instanceType}-${item.region}-${item.operatingSystem}`;
      newMap[key] = item.quantity;
    });
    
    setInstanceQuantityMap(newMap);
    
    // Only set the initial region if user hasn't manually selected one yet
    if (!userSelectedRegion.current && instanceQuantities.length > 0 && selectedRegions.length > 0) {
      // Find a region with configured quantities
      const regionsWithQuantities = new Set(
        instanceQuantities.map(item => item.region)
      );
      
      // Set the active region to the first region that has quantities
      const regionWithQuantities = selectedRegions.find(r => regionsWithQuantities.has(r));
      
      if (regionWithQuantities && !activeRegion) {
        setActiveRegion(regionWithQuantities);
      }
    }
  }, [instanceQuantities, selectedRegions, activeRegion]);

  // Get quantity for a specific instance in the current region/OS
  const getQuantity = (instanceType: string): number => {
    if (!activeRegion) return 1;
    const key = `${instanceType}-${activeRegion}-${activeOS}`;
    return instanceQuantityMap[key] || 1;
  };

  // Apply quantities to all regions for a specific instance
  const applyToAllRegions = (instanceType: string, quantity: number) => {
    if (quantity <= 0) return;
    
    selectedRegions.forEach(region => {
      actions.updateInstanceQuantity(
        instanceType,
        region,
        activeOS,
        quantity
      );
    });
    
    // Trigger price recalculation after quantity change
    setTimeout(() => actions.analyzeInstances(), 100);
  };

  // Apply current quantities to all regions for all instances
  const applyAllToAllRegions = () => {
    if (!activeRegion) return;
    
    selectedInstances.forEach(instanceType => {
      const quantity = getQuantity(instanceType);
      applyToAllRegions(instanceType, quantity);
    });
    
    // Trigger price recalculation after quantity change
    setTimeout(() => actions.analyzeInstances(), 100);
  };

  // Show message if no instances or regions are selected
  if (selectedInstances.length === 0 || selectedRegions.length === 0) {
    return null;
  }
  
  const hasQuantities = instanceQuantities.length > 0;

  return (
    <Card className={`${className || ''} border bg-card`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Instance Quantities
            {hasQuantities && (
              <Badge className="ml-2 bg-primary/20 text-primary">
                {instanceQuantities.length} configured
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 relative h-8"
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
          </Button>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="pb-4">
          {hasQuantities ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Region:</span>
                  <Select 
                    value={activeRegion} 
                    onValueChange={(value: string) => {
                      userSelectedRegion.current = true; // Mark that user has selected a region
                      setActiveRegion(value as RegionCode);
                      // Force immediate update of the instance quantity map
                      const newMap = { ...instanceQuantityMap };
                      instanceQuantities.forEach(item => {
                        if (item.region === value) {
                          const key = `${item.instanceType}-${item.region}-${item.operatingSystem}`;
                          newMap[key] = item.quantity;
                        }
                      });
                      setInstanceQuantityMap(newMap);
                    }}
                  >
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select region..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedRegions.map(region => (
                        <SelectItem key={region} value={region}>
                          {getRegionName(region)} ({region})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">OS:</span>
                  <OSSelector 
                    activeOS={activeOS} 
                    onChange={(os) => {
                      const newOS = os === 'Both' ? 'Linux' : os;
                      setActiveOS(newOS);
                      
                      // Force immediate update of the instance quantity map for the new OS
                      if (activeRegion) {
                        const newMap = { ...instanceQuantityMap };
                        instanceQuantities.forEach(item => {
                          if (item.region === activeRegion && item.operatingSystem === newOS) {
                            const key = `${item.instanceType}-${item.region}-${item.operatingSystem}`;
                            newMap[key] = item.quantity;
                          }
                        });
                        setInstanceQuantityMap(newMap);
                      }
                    }} 
                  />
                </div>
              </div>
              
              {/* Global Apply to All Regions button */}
              <div className="flex justify-center my-4">
                <Button
                  variant="default"
                  className="w-full max-w-md"
                  onClick={applyAllToAllRegions}
                  disabled={!activeRegion || selectedInstances.length === 0}
                >
                  Apply All Instances to All Regions
                </Button>
              </div>

              {/* Instance Quantity Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instance Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedInstances.map((instanceType) => (
                    <TableRow key={`${instanceType}-${activeRegion}-${activeOS}`}>
                      <TableCell className="font-medium">{instanceType}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={getQuantity(instanceType)}
                            onChange={(e) => updateInstanceQuantity(instanceType, parseInt(e.target.value) || 1)}
                            min={1}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">in {activeRegion ? getRegionName(activeRegion as RegionCode) : ''}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => applyToAllRegions(instanceType, getQuantity(instanceType))}
                          disabled={getQuantity(instanceType) < 1 || !activeRegion}
                        >
                          Apply to All Regions
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="flex justify-center">
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    actions.clearInstanceQuantities();
                    setTimeout(() => actions.analyzeInstances(), 100);
                  }}
                  disabled={!hasQuantities}
                  className="mx-auto"
                >
                  Clear All Quantities
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center border rounded-md bg-muted/10">
              <p className="text-muted-foreground">No instance quantities configured yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Set quantities for each instance type to improve your analysis.
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
} 