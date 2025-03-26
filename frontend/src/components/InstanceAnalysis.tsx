import React, { useState, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { spotStore } from '../store/spotStore';
import { InstanceAnalysis as InstanceAnalysisType, RegionAnalysis, StackAnalysis, InstanceCost } from '../types/spot';
import { formatRegionName } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StackAnalysisVisual } from '@/components/StackAnalysisVisual';
import { Loader2 } from 'lucide-react';
import { InstanceSelector } from './InstanceSelector';
import { RegionSelector } from './RegionSelector';
import { InstanceQuantityManager } from './InstanceQuantityManager';
import { OSSelector } from './OSSelector';
import { Button } from '@/components/ui/button';
import { actions } from '../store/spotStore';

const ratingLabels = ['Very High Risk', 'High Risk', 'Medium Risk', 'Low Risk', 'Very Low Risk'];

function MetricTooltip({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <InfoCircledIcon className="h-4 w-4 inline-block ml-1 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent>
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface CostDisplayProps {
  cost: InstanceCost;
  windowsCost?: InstanceCost;
  isWindows?: boolean;
}

const CostDisplay: React.FC<CostDisplayProps> = ({ cost, windowsCost, isWindows = false }) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{isWindows ? 'Windows:' : 'Linux:'}</span>
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-600">
            {cost.onDemand.toFixed(3)} {cost.currency}/{cost.unit}
          </span>
          <span className="text-xs text-gray-400">→</span>
          <span className="text-sm text-green-600">
            {cost.spot.toFixed(3)} {cost.currency}/{cost.unit}
          </span>
          <span className="text-xs text-green-600 ml-1">
            (-{((cost.savings / cost.onDemand) * 100).toFixed(1)}%)
          </span>
        </div>
      </div>
      {!isWindows && windowsCost && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Windows:</span>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">
              {windowsCost.onDemand.toFixed(3)} {windowsCost.currency}/{windowsCost.unit}
            </span>
            <span className="text-xs text-gray-400">→</span>
            <span className="text-sm text-green-600">
              {windowsCost.spot.toFixed(3)} {windowsCost.currency}/{windowsCost.unit}
            </span>
            <span className="text-xs text-green-600 ml-1">
              (-{((windowsCost.savings / windowsCost.onDemand) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

function RegionComparisonTable({ analysis, selectedOS = 'both' }: { 
  analysis: InstanceAnalysisType; 
  selectedOS?: 'both' | 'linux' | 'windows';
}) {
  const sortedMetrics = [...analysis.spotMetrics].sort((a, b) => {
    const aValue = a.windowsMetrics?.s ?? a.metrics?.s ?? 0;
    const bValue = b.windowsMetrics?.s ?? b.metrics?.s ?? 0;
    return bValue - aValue;
  });

  const shouldShowWindows = selectedOS === 'both' || selectedOS === 'windows';
  const shouldShowLinux = selectedOS === 'both' || selectedOS === 'linux';

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-center">Region</TableHead>
          <TableHead className="text-center">
            Savings over On-Demand
            <MetricTooltip>
              Percentage savings compared to on-demand pricing
            </MetricTooltip>
          </TableHead>
          <TableHead className="text-center">
            Interruption Frequency
            <MetricTooltip>
              Historical frequency of spot instance interruptions
            </MetricTooltip>
          </TableHead>
          <TableHead className="text-center">Cost</TableHead>
          <TableHead className="text-center">Savings Comparison</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedMetrics.map(({ region, metrics, cost, windowsMetrics, windowsCost }) => {
          // If metrics is undefined, it means Linux is not selected
          // If windowsMetrics is undefined, it means Windows is not selected or not available
          const showLinux = shouldShowLinux && metrics !== undefined && metrics !== windowsMetrics;
          const showWindows = shouldShowWindows && windowsMetrics !== undefined;
          
          if (!showLinux && !showWindows) return null;

          return (
            <TableRow key={region} className="group">
              <TableCell className="font-medium text-center">
                {formatRegionName(region)}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col gap-1">
                  {showLinux && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-medium">Linux:</span>
                      <span>{metrics.s}%</span>
                    </div>
                  )}
                  {showWindows && windowsMetrics && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-medium">Windows:</span>
                      <span>{windowsMetrics.s}%</span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col gap-1">
                  {showLinux && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-medium">Linux:</span>
                      <span>{metrics.interruptionFrequency}</span>
                    </div>
                  )}
                  {showWindows && windowsMetrics && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-medium">Windows:</span>
                      <span>{windowsMetrics.interruptionFrequency}</span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col gap-1">
                  {showLinux && (
                    <div className="flex items-center justify-center">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-600">
                          {cost.onDemand.toFixed(3)} {cost.currency}/{cost.unit}
                        </span>
                        <span className="text-xs text-gray-400">→</span>
                        <span className="text-sm text-green-600">
                          {cost.spot.toFixed(3)} {cost.currency}/{cost.unit}
                        </span>
                        <span className="text-xs text-green-600 ml-1">
                          (-{((cost.savings / cost.onDemand) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  )}
                  {showWindows && windowsCost && (
                    <div className="flex items-center justify-center">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-600">
                          {windowsCost.onDemand.toFixed(3)} {windowsCost.currency}/{windowsCost.unit}
                        </span>
                        <span className="text-xs text-gray-400">→</span>
                        <span className="text-sm text-green-600">
                          {windowsCost.spot.toFixed(3)} {windowsCost.currency}/{windowsCost.unit}
                        </span>
                        <span className="text-xs text-green-600 ml-1">
                          (-{((windowsCost.savings / windowsCost.onDemand) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col gap-1">
                  {showLinux && (
                    <div className="flex items-center justify-center">
                      <Progress value={metrics.s} className="w-24" />
                    </div>
                  )}
                  {showWindows && windowsMetrics && (
                    <div className="flex items-center justify-center">
                      <Progress value={windowsMetrics.s} className="w-24" />
                    </div>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function RegionAnalysisView({ analysis, selectedOS }: { analysis: readonly RegionAnalysis[], selectedOS: 'both' | 'linux' | 'windows' }) {
  const shouldShowWindows = selectedOS === 'both' || selectedOS === 'windows';
  const shouldShowLinux = selectedOS === 'both' || selectedOS === 'linux';

  const calculateTotalCost = (region: RegionAnalysis) => {
    let linuxOnDemand = 0;
    let linuxSpot = 0;
    let windowsOnDemand = 0;
    let windowsSpot = 0;

    region.instances.forEach(instance => {
      if (shouldShowLinux && instance.cost) {
        linuxOnDemand += instance.cost.onDemand;
        linuxSpot += instance.cost.spot;
      }
      if (shouldShowWindows && instance.windowsCost) {
        windowsOnDemand += instance.windowsCost.onDemand;
        windowsSpot += instance.windowsCost.spot;
      }
    });

    return {
      linux: {
        onDemand: linuxOnDemand,
        spot: linuxSpot,
        savings: linuxOnDemand - linuxSpot,
        currency: region.totalCost.currency,
        unit: region.totalCost.unit,
      },
      windows: {
        onDemand: windowsOnDemand,
        spot: windowsSpot,
        savings: windowsOnDemand - windowsSpot,
        currency: region.totalCost.currency,
        unit: region.totalCost.unit,
      }
    };
  };

  return (
    <div className="space-y-4">
      {analysis.map(region => {
        const totalCost = calculateTotalCost(region);
        return (
          <Card key={region.region}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>{formatRegionName(region.region)}</div>
                <div className="text-sm">
                  <div className="flex flex-col gap-2">
                    {shouldShowLinux && totalCost.linux.onDemand > 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-medium">Linux On-Demand:</span>
                          <span>{totalCost.linux.onDemand.toFixed(3)} {totalCost.linux.currency}/{totalCost.linux.unit}</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-600">
                          <span className="font-medium">Linux Spot:</span>
                          <span>{totalCost.linux.spot.toFixed(3)} {totalCost.linux.currency}/{totalCost.linux.unit}</span>
                          <span className="text-xs">
                            (-{((totalCost.linux.savings / totalCost.linux.onDemand) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    )}
                    {shouldShowWindows && totalCost.windows.onDemand > 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-medium">Windows On-Demand:</span>
                          <span>{totalCost.windows.onDemand.toFixed(3)} {totalCost.windows.currency}/{totalCost.windows.unit}</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-600">
                          <span className="font-medium">Windows Spot:</span>
                          <span>{totalCost.windows.spot.toFixed(3)} {totalCost.windows.currency}/{totalCost.windows.unit}</span>
                          <span className="text-xs">
                            (-{((totalCost.windows.savings / totalCost.windows.onDemand) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instance Type</TableHead>
                    <TableHead>Specifications</TableHead>
                    <TableHead className="text-right">Savings over On-Demand</TableHead>
                    <TableHead className="text-right">Interruption Frequency</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {region.instances
                    .filter(instance => {
                      const analysis = spotStore.analysis.find(a => a.instanceType === instance.instanceType);
                      const hasLinux = shouldShowLinux && instance.cost;
                      const hasWindows = shouldShowWindows && analysis?.spotMetrics.find(m => m.region === region.region)?.windowsMetrics;
                      return hasLinux || hasWindows;
                    })
                    .map(instance => {
                      const specs = spotStore.analysis.find(a => a.instanceType === instance.instanceType)?.specs;
                      const analysisMetrics = spotStore.analysis
                        .find(a => a.instanceType === instance.instanceType)
                        ?.spotMetrics.find(m => m.region === region.region);

                      const windowsMetrics = analysisMetrics?.windowsMetrics;
                      const windowsCost = analysisMetrics?.windowsCost;

                      const SpecsDisplay = () => (
                        <div className="flex items-center gap-2 text-sm">
                          <span>{specs?.cores ?? 0} vCPU{(specs?.cores ?? 0) > 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>{specs?.ram_gb ?? 0} GB RAM</span>
                          {specs?.emr && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">EMR</Badge>
                            </>
                          )}
                        </div>
                      );

                      return (
                        <React.Fragment key={instance.instanceType}>
                          {shouldShowLinux && instance.cost && (
                            <TableRow>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span>{instance.instanceType}</span>
                                  <span className="text-xs text-muted-foreground">Linux</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {specs ? <SpecsDisplay /> : 'N/A'}
                              </TableCell>
                              <TableCell className="text-right">{instance.metrics.s}%</TableCell>
                              <TableCell className="text-right">{instance.metrics.interruptionFrequency}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-sm text-gray-600">
                                    {instance.cost.onDemand.toFixed(3)} {instance.cost.currency}/{instance.cost.unit}
                                  </span>
                                  <span className="text-xs text-gray-400">→</span>
                                  <span className="text-sm text-green-600">
                                    {instance.cost.spot.toFixed(3)} {instance.cost.currency}/{instance.cost.unit}
                                  </span>
                                  <span className="text-xs text-green-600 ml-1">
                                    (-{((instance.cost.savings / instance.cost.onDemand) * 100).toFixed(1)}%)
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          {shouldShowWindows && windowsMetrics && windowsCost && (
                            <TableRow>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span>{instance.instanceType}</span>
                                  <span className="text-xs text-muted-foreground">Windows</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {specs ? <SpecsDisplay /> : 'N/A'}
                              </TableCell>
                              <TableCell className="text-right">{windowsMetrics.s}%</TableCell>
                              <TableCell className="text-right">{windowsMetrics.interruptionFrequency}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-sm text-gray-600">
                                    {windowsCost.onDemand.toFixed(3)} {windowsCost.currency}/{windowsCost.unit}
                                  </span>
                                  <span className="text-xs text-gray-400">→</span>
                                  <span className="text-sm text-green-600">
                                    {windowsCost.spot.toFixed(3)} {windowsCost.currency}/{windowsCost.unit}
                                  </span>
                                  <span className="text-xs text-green-600 ml-1">
                                    (-{((windowsCost.savings / windowsCost.onDemand) * 100).toFixed(1)}%)
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StackAnalysisView({ analysis, selectedOS }: { analysis: readonly StackAnalysis[], selectedOS: 'both' | 'linux' | 'windows' }) {
  const { regionAnalysis } = useSnapshot(spotStore);
  return <StackAnalysisVisual stackAnalysis={analysis} regionAnalysis={regionAnalysis} selectedOS={selectedOS} />;
}

function InstanceCard({ analysis }: { analysis: InstanceAnalysisType }) {
  const hasSpotMetrics = analysis.spotMetrics.length > 0;
  const unavailableRegions = analysis.totalRegionsCount - analysis.availableRegionsCount;
  const [selectedOS, setSelectedOS] = useState<'both' | 'linux' | 'windows'>('both');

  // Calculate average savings for each OS
  const averageSavings = {
    linux: analysis.averageScore,
    windows: analysis.spotMetrics.reduce((acc, metric) => 
      metric.windowsMetrics ? acc + metric.windowsMetrics.s : acc, 0) / 
      analysis.spotMetrics.filter(m => m.windowsMetrics).length || 0
  };

  const shouldShowWindows = selectedOS === 'both' || selectedOS === 'windows';
  const shouldShowLinux = selectedOS === 'both' || selectedOS === 'linux';

  return (
    <Card className="w-full">
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{analysis.instanceType}</span>
            {analysis.specs.emr && (
              <Badge variant="outline" className="text-xs">
                EMR Compatible
              </Badge>
            )}
          </div>
          <Select value={selectedOS} onValueChange={(value: 'both' | 'linux' | 'windows') => setSelectedOS(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select OS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Both OS</SelectItem>
              <SelectItem value="linux">Linux Only</SelectItem>
              <SelectItem value="windows">Windows Only</SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
        {unavailableRegions > 0 && (
          <Badge variant="secondary" className="w-fit">
            Available in {analysis.availableRegionsCount} of {analysis.totalRegionsCount} regions
          </Badge>
        )}
        <CardDescription>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 min-w-[120px]">
              <span className="font-medium text-foreground">CPU:</span>
              <span>{analysis.specs.cores} vCPU{analysis.specs.cores > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Memory:</span>
              <span>{analysis.specs.ram_gb} GB</span>
            </div>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasSpotMetrics ? (
          <Alert>
            <AlertDescription>
              No spot metrics available for this instance type in the selected regions.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Average Savings over On-Demand</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>Average percentage savings compared to on-demand pricing across selected regions</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {shouldShowLinux && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Linux:</span>
                      <span className="font-bold text-lg text-green-600">{averageSavings.linux.toFixed(1)}%</span>
                    </div>
                  )}
                  {shouldShowWindows && averageSavings.windows > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Windows:</span>
                      <span className="font-bold text-lg text-green-600">{averageSavings.windows.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Typical Interruption Frequency</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>Most common frequency of spot instance interruptions across selected regions</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {shouldShowLinux && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Linux:</span>
                      <span className="font-bold">
                        {analysis.spotMetrics[0]?.metrics.interruptionFrequency ?? 'Unknown'}
                      </span>
                    </div>
                  )}
                  {shouldShowWindows && analysis.spotMetrics[0]?.windowsMetrics && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Windows:</span>
                      <span className="font-bold">
                        {analysis.spotMetrics[0]?.windowsMetrics?.interruptionFrequency ?? 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <RegionComparisonTable 
                analysis={{
                  ...analysis,
                  spotMetrics: analysis.spotMetrics.map(metric => ({
                    ...metric,
                    windowsMetrics: shouldShowWindows ? metric.windowsMetrics : undefined,
                    windowsCost: shouldShowWindows ? metric.windowsCost : undefined,
                    metrics: shouldShowLinux ? metric.metrics : metric.windowsMetrics!
                  })).filter(metric => 
                    (shouldShowLinux && metric.metrics) || 
                    (shouldShowWindows && metric.windowsMetrics)
                  )
                }} 
                selectedOS={selectedOS}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

type ViewType = 'instance' | 'region' | 'stack';

export function InstanceAnalysis() {
  const snap = useSnapshot(spotStore);
  const { selectedInstances, isLoading, error, regionAnalysis, stackAnalysis } = snap;
  const analysis = snap.analysis;
  const [selectedView, setSelectedView] = useState<ViewType>('instance');
  const [selectedOS, setSelectedOS] = useState<'both' | 'linux' | 'windows'>('both');
  const { selectedRegions } = snap;
  const [forceRender, setForceRender] = useState(0);

  // Function to trigger analysis and ensure UI updates
  const handleAnalysis = async () => {
    console.log("Running analysis directly...");
    try {
      setForceRender(prev => prev + 1);
      await actions.analyzeInstances();
      // Force another re-render after analysis is complete
      setTimeout(() => {
        setForceRender(prev => prev + 1);
        console.log("Forced re-render after analysis");
      }, 100);
    } catch (error) {
      console.error("Error running analysis:", error);
    }
  };

  // Force re-render when analysis updates
  useEffect(() => {
    if (analysis && analysis.length > 0) {
      console.log('Analysis updated, forcing re-render');
      setForceRender(prev => prev + 1);
    }
  }, [analysis]);

  const renderContent = () => {
    console.log("Rendering content with state:", { 
      isLoading, 
      error, 
      selectedInstances: selectedInstances.length,
      analysisLength: analysis?.length, 
      hasResults: analysis?.length > 0,
      forceRender,
      firstInstanceType: analysis?.[0]?.instanceType
    });

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px] bg-background/50">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Analyzing instances...</p>
          </div>
        </div>
      );
    }

    if (error && !analysis?.length) {
      return (
        <Alert variant="destructive" className="mt-4 border-destructive/20 bg-destructive/10">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (!selectedInstances.length) {
      return (
        <div className="flex items-center justify-center min-h-[400px] text-center bg-background/50 rounded-lg border-2 border-dashed border-muted">
          <div className="max-w-md p-6">
            <h3 className="text-xl font-semibold mb-3 text-primary">No Instances Selected</h3>
            <p className="text-muted-foreground leading-relaxed">
              Select one or more instance types to analyze their spot instance availability and pricing across regions.
            </p>
          </div>
        </div>
      );
    }

    if (!analysis?.length) {
      console.log("No analysis results found", { analysis });
      return (
        <Alert className="mt-4 bg-muted/50">
          <AlertDescription>No analysis data available for the selected instances. Press the "Analyze Instances" button to generate the analysis.</AlertDescription>
        </Alert>
      );
    }

    // Show warning for regions with missing data if there's an error but we still have some analysis
    const warningMessage = error ? (
      <Alert className="mb-4 border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20">
        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
          Some regions have missing or incomplete data. Showing available information for other regions.
        </AlertDescription>
      </Alert>
    ) : null;

    return (
      <>
        {warningMessage}
        {selectedView === 'instance' && (
          <div className="grid gap-6">
            {analysis.map((instanceAnalysis: InstanceAnalysisType, index: number) => (
              <Card key={index} className="overflow-hidden border-2 shadow-lg bg-gradient-to-b from-card to-background">
                <CardHeader className="bg-primary/5 border-b space-y-4 pb-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <CardTitle className="text-2xl font-bold text-primary">
                        {instanceAnalysis.instanceType}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="font-medium">{instanceAnalysis.specs.cores} vCPUs</span>
                        <span className="text-primary/30">•</span>
                        <span className="font-medium">{instanceAnalysis.specs.ram_gb} GB RAM</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="px-3 py-1 bg-primary/5 border-primary/20 text-primary">
                        {instanceAnalysis.availableRegionsCount} of {instanceAnalysis.totalRegionsCount} Regions
                      </Badge>
                      {instanceAnalysis.specs.emr && (
                        <Badge variant="outline" className="px-3 py-1 bg-green-50 text-green-700 border-green-200">
                          EMR Compatible
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <Card className="border shadow-sm bg-card/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <span>Region Analysis</span>
                        <MetricTooltip>
                          Compare spot instance pricing and availability across regions
                        </MetricTooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="space-y-1">
                              <span className="text-sm font-medium text-muted-foreground">Average Savings</span>
                              <div className="text-2xl font-bold text-primary">{instanceAnalysis.averageScore.toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="space-y-1">
                              <span className="text-sm font-medium text-muted-foreground">Available Regions</span>
                              <div className="text-2xl font-bold text-primary">{instanceAnalysis.spotMetrics.length}</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="space-y-1">
                              <span className="text-sm font-medium text-muted-foreground">Average Rating</span>
                              <div className="text-2xl font-bold text-primary">{ratingLabels[Math.floor(instanceAnalysis.averageRating)]}</div>
                            </div>
                          </div>
                        </div>
                        <RegionComparisonTable analysis={instanceAnalysis} selectedOS={selectedOS} />
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedView === 'region' && (
          <RegionAnalysisView analysis={regionAnalysis} selectedOS={selectedOS} />
        )}

        {selectedView === 'stack' && (
          <StackAnalysisView analysis={stackAnalysis} selectedOS={selectedOS} />
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background border-b pb-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <img 
                src="/logo.svg" 
                alt="Spot Wizard" 
                className="w-12 h-12 md:w-16 md:h-16"
                style={{ filter: 'drop-shadow(0 0 12px rgba(0, 0, 0, 0.15))' }}
              />
              <div>
                <h1 className="text-2xl font-bold text-primary">Spot Wizard</h1>
                <p className="text-sm text-muted-foreground">
                  Analyze spot instance availability and ratings across regions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedView} onValueChange={(value: ViewType) => setSelectedView(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instance">Instance View</SelectItem>
                  <SelectItem value="region">Region View</SelectItem>
                  <SelectItem value="stack">Stack View</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <InstanceSelector />
            <RegionSelector />
          </div>

          {/* Analyze Button */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleAnalysis}
              disabled={selectedInstances.length === 0 || selectedRegions.length === 0 || isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze Instances'
              )}
            </Button>
            <OSSelector 
              activeOS={selectedOS === 'both' ? 'Both' : selectedOS === 'linux' ? 'Linux' : 'Windows'} 
              onChange={(os) => setSelectedOS(os === 'Both' ? 'both' : os.toLowerCase() as 'linux' | 'windows')} 
            />
            {(selectedInstances.length === 0 || selectedRegions.length === 0) && (
              <Alert variant="destructive" className="flex-1 py-2 border-none bg-transparent">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertDescription className="text-sm">
                    Please select at least one instance type and region
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 space-y-6">
          {/* Instance Quantity Manager */}
          <InstanceQuantityManager className="sticky top-[5.5rem] z-10" />
          
          {renderContent()}
        </div>
      </div>
    </div>
  );
} 