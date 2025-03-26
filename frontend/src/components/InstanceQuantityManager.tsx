import React, { useState, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { spotStore, actions } from '../store/spotStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Initialize with currently selected region or first available region
  useEffect(() => {
    if (selectedRegions.length > 0 && !activeRegion) {
      setActiveRegion(selectedRegions[0]);
    }
  }, [selectedRegions, activeRegion]);

  // Initialize all instances with quantity 1 for each selected region and both OS
  useEffect(() => {
    if (selectedInstances.length === 0 || selectedRegions.length === 0) return;
    
    console.log('Initializing quantities for instances:', selectedInstances);
    console.log('Regions:', selectedRegions);
    
    // Only initialize instances that don't have quantity set yet
    const operatingSystems: ('Linux' | 'Windows')[] = ['Linux', 'Windows'];
    
    selectedInstances.forEach(instanceType => {
      selectedRegions.forEach(region => {
        operatingSystems.forEach(os => {
          const key = `${instanceType}-${region}-${os}`;
          if (!instanceQuantityMap[key]) {
            actions.updateInstanceQuantity(instanceType, region, os, 1);
          }
        });
      });
    });
  }, [selectedInstances, selectedRegions, instanceQuantityMap]);

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
  };

  // Initialize quantity map from store
  useEffect(() => {
    const newMap: Record<string, number> = {};
    
    instanceQuantities.forEach(item => {
      newMap[`${item.instanceType}-${item.region}-${item.operatingSystem}`] = item.quantity;
    });
    
    setInstanceQuantityMap(newMap);
  }, [instanceQuantities]);

  // Get quantity for a specific instance in the current region/OS
  const getQuantity = (instanceType: string): number => {
    if (!activeRegion) return 1;
    return instanceQuantityMap[`${instanceType}-${activeRegion}-${activeOS}`] || 1;
  };

  // Apply quantities to all regions
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
  };

  // Show message if no instances or regions are selected
  if (selectedInstances.length === 0 || selectedRegions.length === 0) {
    return (
      <Card className={`w-full shadow-md ${className || ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-semibold text-primary">Configure Instance Quantities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/40 rounded-lg p-6 text-center">
            <p className="text-muted-foreground">
              Please select at least one instance type and region above to configure quantities.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full shadow-md ${className || ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-1"
              aria-label={isCollapsed ? "Expand quantity manager" : "Collapse quantity manager"}
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              {isCollapsed ? "Configure Quantities" : "Collapse"}
            </Button>
            {!isCollapsed && (
              <CardTitle className="text-xl font-semibold text-primary">Instance Type | Region | OS | Quantity</CardTitle>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isCollapsed && instanceQuantities.length > 0 && (
              <Badge variant="outline" className="mr-2">
                {instanceQuantities.length} quantities configured
              </Badge>
            )}
            {!isCollapsed && (
              <OSSelector 
                activeOS={activeOS === 'Linux' ? 'Linux' : 'Windows'} 
                onChange={(os) => setActiveOS(os === 'Both' ? 'Linux' : os)} 
              />
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.clearInstanceQuantities()}
              disabled={instanceQuantities.length === 0}
            >
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent>
          <div className="space-y-6">
            {/* Region Selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Region:</span>
                <Select 
                  value={activeRegion} 
                  onValueChange={(value: string) => setActiveRegion(value as RegionCode)}
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
            </div>

            {/* Instance Quantity Table */}
            <div className="border rounded-md">
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
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
} 