import { SpotData, InstanceAnalysis, InstanceSpotData, RegionAnalysis, StackAnalysis, InstanceCost, PricingConfig, SpotMetrics, RegionCode, InstanceQuantityConfig } from '../types/spot';
import { PricingService } from './pricingService';
import { getSpotAdvisorCode, isValidRegionCode } from '@/lib/regionMapping';
import { spotStore } from '../store/spotStore';

const SPOT_DATA_URL = 'https://spot-bid-advisor.s3.amazonaws.com/spot-advisor-data.json';

export class SpotService {
  private static instance: SpotService;
  private spotData: SpotData | null = null;
  private fetchPromise: Promise<SpotData> | null = null;
  private isLoading: boolean = false;
  private error: Error | null = null;
  private pricingService: PricingService;

  private constructor() {
    this.pricingService = PricingService.getInstance();
  }

  public static getInstance(): SpotService {
    if (!SpotService.instance) {
      SpotService.instance = new SpotService();
    }
    return SpotService.instance;
  }

  public async fetchSpotData(): Promise<SpotData> {
    if (this.spotData) {
      return this.spotData;
    }

    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    const fetchWithRetry = async (retryCount: number = 0): Promise<SpotData> => {
      try {
        this.isLoading = true;
        if (process.env.NODE_ENV === 'development') {
          console.debug(`Fetching spot data from API (attempt ${retryCount + 1})...`);
        }
        
        const response = await fetch('/api/spot-data', {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch spot data: ${response.status} ${errorText}`);
        }

        // Check if we got a complete response
        const contentLength = response.headers.get('content-length');
        if (contentLength !== null) {
          const responseSize = response.headers.get('content-length');
          if (responseSize !== null && parseInt(contentLength) !== parseInt(responseSize)) {
            throw new Error('Incomplete response received');
          }
        }
        
        const data = await response.json();
        if (!data || !data.spot_advisor) {
          throw new Error('Invalid spot data received');
        }
        this.spotData = data;
        const regionCount = Object.keys(data.spot_advisor).length;
        if (process.env.NODE_ENV === 'development') {
          console.debug('Spot data fetched successfully:', regionCount, 'regions');
        }
        return data;
      } catch (error) {
        console.error(`Error fetching spot data (attempt ${retryCount + 1}):`, error);
        
        if (retryCount < MAX_RETRIES) {
          if (process.env.NODE_ENV === 'development') {
            console.debug(`Retrying in ${RETRY_DELAY}ms...`);
          }
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return fetchWithRetry(retryCount + 1);
        }
        
        throw error;
      } finally {
        this.isLoading = false;
        this.fetchPromise = null;
      }
    };

    try {
      this.fetchPromise = fetchWithRetry();
      return await this.fetchPromise;
    } catch (error) {
      this.error = error instanceof Error ? error : new Error('Unknown error occurred');
      throw this.error;
    }
  }

  public getSpotData(): SpotData | null {
    return this.spotData;
  }

  private getDefaultMetrics(): SpotMetrics {
    return {
      s: 0,  // 0% savings
      r: 0,  // Highest risk
      interruptionFrequency: 'Not Available'
    };
  }

  private calculateInstanceCost(instanceType: string, region: string, pricingConfig: PricingConfig): { linux: InstanceCost; windows?: InstanceCost } {
    if (!this.spotData) {
      throw new Error('Spot data not initialized');
    }

    // Update the pricing config with the correct region
    const regionPricingConfig = { ...pricingConfig, region };

    const linuxPricing = this.pricingService.getInstancePrice(instanceType, { ...regionPricingConfig, operatingSystem: 'Linux' });
    const windowsPricing = this.pricingService.getInstancePrice(instanceType, { ...regionPricingConfig, operatingSystem: 'Windows' });
    
    const regionData = this.spotData.spot_advisor[region];
    const linuxMetrics = regionData?.Linux?.[instanceType];
    const windowsMetrics = regionData?.Windows?.[instanceType];
    
    const result: { linux: InstanceCost; windows?: InstanceCost } = {
      linux: {
        onDemand: linuxPricing ? parseFloat(linuxPricing.price) : 0,
        spot: 0,
        savings: 0,
        currency: 'USD',
        unit: linuxPricing?.unit ?? 'Hrs',
        isSpotAvailable: !!linuxMetrics
      }
    };

    // Calculate Linux spot price and savings if metrics are available
    if (linuxMetrics) {
      result.linux.spot = result.linux.onDemand * (1 - (linuxMetrics.s ?? 0) / 100);
      result.linux.savings = result.linux.onDemand - result.linux.spot;
    } else {
      result.linux.spot = result.linux.onDemand; // Same as on-demand if spot not available
      result.linux.savings = 0;
    }

    // If Windows pricing exists, include Windows costs
    if (windowsPricing) {
      const windowsOnDemand = parseFloat(windowsPricing.price);
      result.windows = {
        onDemand: windowsOnDemand,
        spot: windowsOnDemand,
        savings: 0,
        currency: 'USD',
        unit: windowsPricing.unit ?? 'Hrs',
        isSpotAvailable: !!windowsMetrics
      };

      if (windowsMetrics) {
        result.windows!.spot = windowsOnDemand * (1 - (windowsMetrics.s ?? 0) / 100);
        result.windows!.savings = result.windows!.onDemand - result.windows!.spot;
      }
    }

    return result;
  }

  private getInterruptionFrequency(rating: number, os: 'Linux' | 'Windows'): string {
    if (!this.spotData) {
      return 'Not Available';
    }

    // Find the range with matching index
    const range = this.spotData.ranges.find(r => r.index === rating);
    return range?.label || 'Not Available';
  }

  public async analyzeInstances(
    instanceTypes: string[], 
    regions: string[],
    pricingConfig: PricingConfig
  ): Promise<InstanceAnalysis[]> {
    if (!this.spotData) {
      console.error('Spot data not initialized');
      throw new Error('Spot data not initialized');
    }

    // Get instance quantities from the store
    const { instanceQuantities } = spotStore;

    // Helper function to get quantity for an instance in a region with specific OS
    const getQuantity = (instanceType: string, region: string, os: 'Linux' | 'Windows'): number => {
      const config = instanceQuantities.find(
        item => item.instanceType === instanceType && 
                item.region === region && 
                item.operatingSystem === os
      );
      return config?.quantity || 1; // Default to 1 if not configured
    };

    // Track regions with available pricing data
    const availableRegions = new Set<string>();
    const unavailableRegions = new Set<string>();

    // Pre-fetch pricing data and track which regions have data
    await Promise.all(
      regions.map(async (region) => {
        try {
          await Promise.all([
            this.pricingService.fetchPricing({ ...pricingConfig, region, operatingSystem: 'Linux' }),
            this.pricingService.fetchPricing({ ...pricingConfig, region, operatingSystem: 'Windows' })
          ]);
          availableRegions.add(region);
        } catch (error) {
          // Only log if it's not an expected "no data" error
          if (error instanceof Error && !error.message.startsWith('NO_PRICING_DATA:')) {
            console.warn(`Error fetching pricing data for region ${region}:`, error);
          }
          unavailableRegions.add(region);
        }
      })
    );

    if (availableRegions.size === 0) {
      throw new Error('No pricing data available for any selected region');
    }

    // Calculate instance cost with quantity
    const calculateInstanceCostWithQuantity = (
      instanceType: string, 
      region: string, 
      pricingConfig: PricingConfig
    ): { linux: InstanceCost; windows?: InstanceCost } => {
      const baseCosts = this.calculateInstanceCost(instanceType, region, pricingConfig);
      const linuxQuantity = getQuantity(instanceType, region, 'Linux');
      const windowsQuantity = getQuantity(instanceType, region, 'Windows');
      
      // Multiply costs by quantity
      const result: { linux: InstanceCost; windows?: InstanceCost } = {
        linux: {
          ...baseCosts.linux,
          onDemand: baseCosts.linux.onDemand * linuxQuantity,
          spot: baseCosts.linux.spot * linuxQuantity,
          savings: baseCosts.linux.savings * linuxQuantity
        }
      };
      
      if (baseCosts.windows) {
        result.windows = {
          ...baseCosts.windows,
          onDemand: baseCosts.windows.onDemand * windowsQuantity,
          spot: baseCosts.windows.spot * windowsQuantity,
          savings: baseCosts.windows.savings * windowsQuantity
        };
      }
      
      return result;
    };

    const spotData = this.spotData;
    
    try {
      const analysisResults = instanceTypes.map(instanceType => {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`Analyzing instance type: ${instanceType}`);
        }
        const specs = spotData.instance_types[instanceType];
        if (!specs) {
          console.error(`Instance type ${instanceType} not found in spot data`);
          throw new Error(`Instance type ${instanceType} not found`);
        }

        // Only process regions that have pricing data
        const spotMetrics = Array.from(availableRegions).map(region => {
          if (process.env.NODE_ENV === 'development') {
            console.debug(`Processing region: ${region} for instance: ${instanceType}`);
          }
          const regionData = spotData.spot_advisor[region];
          if (!regionData) {
            if (process.env.NODE_ENV === 'development') {
              console.debug(`Region ${region} not found in spot data`);
            }
            const costData = calculateInstanceCostWithQuantity(instanceType, region, pricingConfig);
            return {
              region,
              metrics: this.getDefaultMetrics(),
              cost: costData.linux,
              windowsCost: costData.windows,
              spotUnavailable: true
            };
          }

          const linuxMetrics = regionData.Linux?.[instanceType];
          const windowsMetrics = regionData.Windows?.[instanceType];

          let metrics: SpotMetrics;
          if (linuxMetrics) {
            metrics = {
              ...linuxMetrics,
              interruptionFrequency: this.getInterruptionFrequency(linuxMetrics.r, 'Linux')
            };
          } else {
            metrics = this.getDefaultMetrics();
          }

          // Use Windows metrics if Linux is not available
          let windowsMetricsWithFrequency: SpotMetrics | undefined;
          if (windowsMetrics) {
            windowsMetricsWithFrequency = {
              ...windowsMetrics,
              interruptionFrequency: this.getInterruptionFrequency(windowsMetrics.r, 'Windows')
            };
          }

          const { linux: cost, windows: windowsCost } = calculateInstanceCostWithQuantity(instanceType, region, pricingConfig);

          const result = {
            region,
            metrics,
            cost,
            windowsCost,
            spotUnavailable: !linuxMetrics
          };

          if (windowsMetricsWithFrequency) {
            return {
              ...result,
              windowsMetrics: windowsMetricsWithFrequency
            };
          }

          return result;
        });

        const availableSpotMetrics = spotMetrics.filter(metric => {
          return !metric.spotUnavailable;
        });
        const totalCost = spotMetrics.reduce(
          (acc, curr) => {
            const linuxCost = curr.cost;
            const windowsCost = curr.windowsCost;
            
            return {
              onDemand: acc.onDemand + linuxCost.onDemand + (windowsCost?.onDemand || 0),
              spot: acc.spot + linuxCost.spot + (windowsCost?.spot || 0),
              savings: acc.savings + linuxCost.savings + (windowsCost?.savings || 0),
              currency: linuxCost.currency,
              unit: linuxCost.unit,
              isSpotAvailable: true
            };
          },
          { onDemand: 0, spot: 0, savings: 0, currency: 'USD', unit: 'Hrs', isSpotAvailable: true }
        );

        return {
          instanceType,
          specs,
          spotMetrics,
          averageScore: availableSpotMetrics.length > 0 
            ? availableSpotMetrics.reduce((acc, curr) => acc + curr.metrics.s, 0) / availableSpotMetrics.length 
            : 0,
          averageRating: availableSpotMetrics.length > 0
            ? availableSpotMetrics.reduce((acc, curr) => acc + curr.metrics.r, 0) / availableSpotMetrics.length
            : 0,
          availableRegionsCount: availableSpotMetrics.length,
          totalRegionsCount: regions.length,
          totalCost,
          unavailableRegions: Array.from(unavailableRegions)
        };
      });

      if (unavailableRegions.size > 0) {
        const unavailableRegionsList = Array.from(unavailableRegions).join(', ');
        console.warn(`Some regions were skipped due to missing pricing data: ${unavailableRegionsList}`);
      }

      return analysisResults;
    } catch (error) {
      console.error('Error during instance analysis:', error);
      throw error;
    }
  }

  public analyzeRegions(instanceAnalysis: InstanceAnalysis[]): RegionAnalysis[] {
    const regionMap = new Map<RegionCode, RegionAnalysis>();

    instanceAnalysis.forEach(analysis => {
      analysis.spotMetrics.forEach(({ region, metrics, cost, windowsMetrics, windowsCost }) => {
        if (isValidRegionCode(region)) {
          if (!regionMap.has(region)) {
            regionMap.set(region, {
              region,
              instances: [],
              totalCost: { 
                onDemand: 0, 
                spot: 0, 
                savings: 0, 
                currency: cost.currency, 
                unit: cost.unit,
                isSpotAvailable: true 
              },
            });
          }

          const regionAnalysis = regionMap.get(region)!;
          regionAnalysis.instances = [...regionAnalysis.instances, {
            instanceType: analysis.instanceType,
            metrics,
            cost: {
              ...cost,
              isSpotAvailable: true
            },
            windowsMetrics,
            windowsCost: windowsCost ? {
              ...windowsCost,
              isSpotAvailable: true
            } : undefined
          }];

          // Add Linux costs
          regionAnalysis.totalCost.onDemand += cost.onDemand;
          regionAnalysis.totalCost.spot += cost.spot;
          regionAnalysis.totalCost.savings += cost.savings;

          // Add Windows costs if available
          if (windowsCost) {
            regionAnalysis.totalCost.onDemand += windowsCost.onDemand;
            regionAnalysis.totalCost.spot += windowsCost.spot;
            regionAnalysis.totalCost.savings += windowsCost.savings;
          }
        }
      });
    });

    return Array.from(regionMap.values());
  }

  public analyzeStacks(instanceAnalysis: InstanceAnalysis[]): StackAnalysis[] {
    const defaultStack: StackAnalysis = {
      name: 'Default Stack',
      instances: instanceAnalysis.map(analysis => analysis.instanceType),
      regions: Array.from(new Set(instanceAnalysis.flatMap(analysis => 
        analysis.spotMetrics.map(metric => metric.region)
      ))),
      totalCost: {
        onDemand: instanceAnalysis.reduce((acc, curr) => acc + curr.totalCost.onDemand, 0),
        spot: instanceAnalysis.reduce((acc, curr) => acc + curr.totalCost.spot, 0),
        savings: instanceAnalysis.reduce((acc, curr) => acc + curr.totalCost.savings, 0),
        currency: instanceAnalysis[0]?.totalCost.currency ?? 'USD',
        unit: instanceAnalysis[0]?.totalCost.unit ?? 'Hrs',
        isSpotAvailable: true
      },
      averageScore: instanceAnalysis.reduce((acc, curr) => acc + curr.averageScore, 0) / instanceAnalysis.length,
      averageRating: instanceAnalysis.reduce((acc, curr) => acc + curr.averageRating, 0) / instanceAnalysis.length,
    };

    return [defaultStack];
  }

  public getAvailableRegions(): RegionCode[] {
    if (!this.spotData) {
      return [];
    }
    return Object.keys(this.spotData.spot_advisor)
      .filter(isValidRegionCode);
  }

  public getAvailableInstanceTypes(): string[] {
    if (!this.spotData) {
      return [];
    }
    return Object.keys(this.spotData.instance_types);
  }

  public getLoadingState(): boolean {
    return this.isLoading;
  }

  public getError(): Error | null {
    return this.error;
  }
}