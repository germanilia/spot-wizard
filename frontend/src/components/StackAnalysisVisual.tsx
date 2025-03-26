import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StackAnalysis, RegionAnalysis } from '@/types/spot';
import { formatRegionName } from '@/lib/utils';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Legend, Cell } from 'recharts';
import { Tooltip as RechartsTooltip } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface StackAnalysisVisualProps {
  stackAnalysis: readonly StackAnalysis[];
  regionAnalysis: readonly RegionAnalysis[];
  selectedOS: 'both' | 'linux' | 'windows';
}

interface RegionRiskData {
  riskScore: number | null;
  region: string;
}

export function StackAnalysisVisual({ stackAnalysis, regionAnalysis, selectedOS }: StackAnalysisVisualProps) {
  const [selectedView, setSelectedView] = useState<'savings' | 'risk' | 'combined' | 'regions'>('savings');

  const getRiskColor = (score: number | null): string => {
    if (score === null) return '#94a3b8'; // gray for no data
    if (score >= 3.5) return '#ef4444';   // very high - red
    if (score >= 2.5) return '#f97316';   // high - orange
    if (score >= 1.5) return '#facc15';   // medium - yellow
    if (score >= 0.5) return '#4ade80';   // low - light green
    return '#22c55e';                     // very low - green
  };

  // Prepare data for region comparison based on OS selection
  const regionComparisonData = regionAnalysis.map(region => {
    const linuxMetrics = region.instances.filter(instance => instance.metrics);
    const windowsMetrics = region.instances.filter(instance => instance.windowsMetrics);
    
    const calculateMetrics = (instances: typeof linuxMetrics, isWindows: boolean) => {
      const metrics = instances.map(inst => ({
        cost: isWindows ? inst.windowsCost : inst.cost,
        metrics: isWindows ? inst.windowsMetrics : inst.metrics,
      })).filter(m => m.cost && m.metrics);

      const validMetrics = metrics.filter(m => m.metrics && typeof m.metrics.r === 'number');
      
      return {
        savings: metrics.reduce((acc, m) => acc + (m.cost?.savings || 0), 0),
        onDemand: metrics.reduce((acc, m) => acc + (m.cost?.onDemand || 0), 0),
        spot: metrics.reduce((acc, m) => acc + (m.cost?.spot || 0), 0),
        riskScore: validMetrics.length > 0 
          ? validMetrics.reduce((acc, m) => acc + m.metrics!.r, 0) / validMetrics.length 
          : null,
      };
    };

    const linux = calculateMetrics(linuxMetrics, false);
    const windows = calculateMetrics(windowsMetrics, true);

    const getMetricsForSelectedOS = () => {
      switch (selectedOS) {
        case 'windows':
          return windows;
        case 'linux':
          return linux;
        case 'both': {
          const linuxCount = linuxMetrics.length;
          const windowsCount = windowsMetrics.length;
          const totalCount = linuxCount + windowsCount;
          
          // Only calculate risk score if we have data
          const riskScore = totalCount > 0 
            ? ((linux.riskScore || 0) * linuxCount + (windows.riskScore || 0) * windowsCount) / totalCount
            : null;

          return {
            savings: linux.savings + windows.savings,
            onDemand: linux.onDemand + windows.onDemand,
            spot: linux.spot + windows.spot,
            riskScore,
          };
        }
      }
    };

    const selectedMetrics = getMetricsForSelectedOS();

    return {
      region: formatRegionName(region.region),
      savings: selectedMetrics.savings,
      onDemand: selectedMetrics.onDemand,
      spot: selectedMetrics.spot,
      riskScore: selectedMetrics.riskScore,
      linuxMetrics: linux,
      windowsMetrics: windows,
      hasLinux: linuxMetrics.length > 0,
      hasWindows: windowsMetrics.length > 0,
    };
  }).filter(region => {
    if (selectedOS === 'linux') return region.hasLinux;
    if (selectedOS === 'windows') return region.hasWindows;
    return region.hasLinux || region.hasWindows;
  });

  // Sort regions by savings
  const sortedBySavings = [...regionComparisonData].sort((a, b) => b.savings - a.savings);
  // Sort regions by risk (higher risk score = higher risk)
  const sortedByRisk = [...regionComparisonData]
    .filter(region => region.riskScore !== null)
    .sort((a, b) => (a.riskScore || 0) - (b.riskScore || 0));

  // Calculate combined score (higher savings, lower risk)
  const combinedScoreData = regionComparisonData
    .filter(region => region.riskScore !== null)
    .map(region => ({
      ...region,
      combinedScore: (region.savings / Math.max(...regionComparisonData.map(r => r.savings))) * 100 - 
                    ((region.riskScore || 0) / Math.max(...regionComparisonData.filter(r => r.riskScore !== null).map(r => r.riskScore || 0))) * 100
    }));

  const sortedByCombined = [...combinedScoreData].sort((a, b) => b.combinedScore - a.combinedScore);

  const getRiskLabel = (score: number | null): string => {
    if (score === null) return 'No Data';
    if (score >= 3.5) return 'Very High';  // Risk score 3.5-4 should be Very High Risk
    if (score >= 2.5) return 'High';       // Risk score 2.5-3.5 should be High Risk
    if (score >= 1.5) return 'Medium';     // Risk score 1.5-2.5 should be Medium Risk
    if (score >= 0.5) return 'Low';        // Risk score 0.5-1.5 should be Low Risk
    return 'Very Low';                     // Risk score 0-0.5 should be Very Low Risk
  };

  return (
    <div className="space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 rounded-lg shadow-lg">
      <Tabs value={selectedView} onValueChange={(value: any) => setSelectedView(value)}>
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-center gap-4">
            <TabsList className="grid grid-cols-4 w-[600px] bg-slate-100 dark:bg-slate-800">
              <TabsTrigger 
                value="savings" 
                className={cn(
                  "data-[state=active]:bg-green-500 data-[state=active]:text-white",
                  "transition-all duration-200"
                )}
              >
                Savings Analysis
              </TabsTrigger>
              <TabsTrigger 
                value="risk" 
                className={cn(
                  "data-[state=active]:bg-red-500 data-[state=active]:text-white",
                  "transition-all duration-200"
                )}
              >
                Risk Analysis
              </TabsTrigger>
              <TabsTrigger 
                value="combined" 
                className={cn(
                  "data-[state=active]:bg-purple-500 data-[state=active]:text-white",
                  "transition-all duration-200"
                )}
              >
                Combined Score
              </TabsTrigger>
              <TabsTrigger 
                value="regions" 
                className={cn(
                  "data-[state=active]:bg-blue-500 data-[state=active]:text-white",
                  "transition-all duration-200"
                )}
              >
                Region Details
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6">
          <TabsContent value="savings" className="space-y-4 mt-0">
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-500 to-green-700 bg-clip-text text-transparent">
                  Region Savings Comparison
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Total savings by region when using spot instances
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedBySavings}>
                      <XAxis dataKey="region" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="savings" name="Savings" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="onDemand" name="On-Demand Cost" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="spot" name="Spot Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4 mt-0">
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
                  Region Risk Analysis
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 space-y-2">
                  <div>Risk scores by region (lower is better)</div>
                  <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm space-y-2">
                    <div className="font-medium">How Risk Score is Calculated:</div>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Score ranges from 0 (lowest risk) to 4 (highest risk)</li>
                      <li>Based on historical interruption rates for spot instances</li>
                      <li>Considers frequency and duration of interruptions</li>
                      <li>Weighted average across all selected instance types in the region</li>
                      <li>For multiple OS types, shows combined weighted risk score</li>
                    </ul>
                    <div className="mt-2 grid grid-cols-5 gap-2">
                      <div className="p-2 bg-red-100 dark:bg-red-900 rounded">Very High (4)</div>
                      <div className="p-2 bg-orange-50 dark:bg-orange-900 rounded">High (3)</div>
                      <div className="p-2 bg-yellow-50 dark:bg-yellow-900 rounded">Medium (2)</div>
                      <div className="p-2 bg-green-50 dark:bg-green-800 rounded">Low (1)</div>
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded">Very Low (0)</div>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedByRisk}>
                      <XAxis dataKey="region" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(value: number) => [`${getRiskLabel(value)} (${value.toFixed(2)})`, 'Risk Score']}
                      />
                      <Legend />
                      <Bar 
                        dataKey="riskScore" 
                        name="Risk Score"
                        radius={[4, 4, 0, 0]}
                        fillOpacity={0.8}
                      >
                        {sortedByRisk.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={getRiskColor(entry.riskScore)} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="combined" className="space-y-4 mt-0">
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-purple-700 bg-clip-text text-transparent">
                  Combined Region Score
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Balanced score considering both savings and risk
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedByCombined}>
                      <XAxis dataKey="region" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="combinedScore" name="Combined Score" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regions" className="space-y-4 mt-0">
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
                  Detailed Region Analysis
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Comprehensive metrics for each region
                </CardDescription>
              </CardHeader>
            </Card>
            <div className="grid gap-4">
              {regionComparisonData.map(region => (
                <Card key={region.region} className="overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
                    <CardTitle className="text-xl">{region.region}</CardTitle>
                    <CardDescription>Instance performance metrics for this region</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          Total Savings per Hour
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <InfoCircledIcon className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Total hourly savings in this region</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          ${region.savings.toFixed(2)}/hr
                        </div>
                        {selectedOS === 'both' && (
                          <div className="text-sm text-muted-foreground pt-2 border-t border-slate-200 dark:border-slate-700">
                            {region.hasLinux && (
                              <div>Linux: ${region.linuxMetrics.savings.toFixed(2)}/hr</div>
                            )}
                            {region.hasWindows && (
                              <div>Windows: ${region.windowsMetrics.savings.toFixed(2)}/hr</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          Cost Comparison
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <InfoCircledIcon className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>On-demand vs spot costs in this region</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div>
                          <div className="text-sm">On-Demand: ${region.onDemand.toFixed(2)}/hr</div>
                          <div className="text-sm text-green-600">Spot: ${region.spot.toFixed(2)}/hr</div>
                        </div>
                        {selectedOS === 'both' && (
                          <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                            {region.hasLinux && (
                              <>
                                <div>Linux On-Demand: ${region.linuxMetrics.onDemand.toFixed(2)}/hr</div>
                                <div>Linux Spot: ${region.linuxMetrics.spot.toFixed(2)}/hr</div>
                              </>
                            )}
                            {region.hasWindows && (
                              <>
                                <div>Windows On-Demand: ${region.windowsMetrics.onDemand.toFixed(2)}/hr</div>
                                <div>Windows Spot: ${region.windowsMetrics.spot.toFixed(2)}/hr</div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          Interruption Risk
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <InfoCircledIcon className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Risk of spot instance interruption in this region</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="text-2xl font-bold">
                          {region.riskScore !== null 
                            ? getRiskLabel(region.riskScore)
                            : 'No Data'}
                        </div>
                        <div className={cn(
                          "h-2 w-full rounded-full mt-2",
                          region.riskScore === null ? "bg-slate-200" :
                          region.riskScore >= 3.5 ? "bg-red-500" :
                          region.riskScore >= 2.5 ? "bg-orange-500" :
                          region.riskScore >= 1.5 ? "bg-yellow-400" :
                          region.riskScore >= 0.5 ? "bg-green-400" :
                          "bg-green-500"
                        )} />
                        {selectedOS === 'both' && (
                          <div className="text-sm text-muted-foreground pt-2 border-t border-slate-200 dark:border-slate-700">
                            {region.hasLinux && (
                              <div>Linux: {region.linuxMetrics.riskScore !== null 
                                ? getRiskLabel(region.linuxMetrics.riskScore)
                                : 'No Data'}</div>
                            )}
                            {region.hasWindows && (
                              <div>Windows: {region.windowsMetrics.riskScore !== null 
                                ? getRiskLabel(region.windowsMetrics.riskScore)
                                : 'No Data'}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
} 