import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegionSelector } from "./RegionSelector";
import { InstanceSelector } from "./InstanceSelector";
import { useSnapshot } from "valtio";
import { spotStore, actions } from "../store/spotStore";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { formatRegionName } from "@/lib/utils";
import { useEffect } from "react";

export function AnalysisForm() {
  const { selectedRegions, selectedInstances, availableRegions } = useSnapshot(spotStore);

  useEffect(() => {
    console.log('AnalysisForm mounted, checking regions:', { selectedRegions, availableRegions });
    if (selectedRegions.length === 0 && availableRegions.length > 0) {
      actions.setSelectedRegions([availableRegions[0]]);
    }
  }, [availableRegions]);

  const removeRegion = (region: string) => {
    console.log('Removing region:', region);
    actions.setSelectedRegions(selectedRegions.filter(r => r !== region));
  };

  const removeInstance = (instance: string) => {
    console.log('Removing instance:', instance);
    actions.setSelectedInstances(selectedInstances.filter(i => i !== instance));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Regions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RegionSelector />
          <div className="flex flex-wrap gap-2">
            {selectedRegions.map(region => (
              <Badge key={region} variant="secondary" className="flex items-center gap-1">
                {formatRegionName(region)}
                <button
                  onClick={() => removeRegion(region)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Instance Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InstanceSelector />
          <div className="flex flex-wrap gap-2">
            {selectedInstances.map(instance => (
              <Badge key={instance} variant="secondary" className="flex items-center gap-1">
                {instance}
                <button
                  onClick={() => removeInstance(instance)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 