import { proxy } from 'valtio';
import { InstanceAnalysis, RegionAnalysis, StackAnalysis, PricingConfig, RegionCode, InstanceQuantityConfig } from '../types/spot';
import { SpotService } from '../services/spotService';

interface SpotStore {
  instanceTypes: string[];
  selectedRegions: RegionCode[];
  selectedInstances: string[];
  availableRegions: RegionCode[];
  analysis: readonly InstanceAnalysis[];
  regionAnalysis: readonly RegionAnalysis[];
  stackAnalysis: readonly StackAnalysis[];
  isLoading: boolean;
  error: string | null;
  pricingConfig: PricingConfig;
  analysisResults: InstanceAnalysis[] | null;
  instanceQuantities: InstanceQuantityConfig[];
}

const spotService = SpotService.getInstance();

export const spotStore = proxy<SpotStore>({
  instanceTypes: [],
  selectedRegions: [],
  selectedInstances: [],
  availableRegions: [],
  analysis: [],
  regionAnalysis: [],
  stackAnalysis: [],
  isLoading: false,
  error: null,
  pricingConfig: {
    region: 'us-east-1',
    operatingSystem: 'Linux',
  },
  analysisResults: null,
  instanceQuantities: [],
});

export const actions = {
  async initialize() {
    try {
      spotStore.isLoading = true;
      spotStore.error = null;
      await spotService.fetchSpotData();
      // Update available regions after data is loaded
      const regions = spotService.getAvailableRegions();
      console.log('Available regions:', regions);
      spotStore.availableRegions = regions;
      spotStore.instanceTypes = spotService.getAvailableInstanceTypes();
    } catch (error) {
      console.error('Error initializing store:', error);
      spotStore.error = error instanceof Error ? error.message : 'Failed to initialize spot data';
    } finally {
      spotStore.isLoading = false;
    }
  },

  setSelectedRegions(regions: RegionCode[]) {
    console.log('Setting selected regions:', regions);
    spotStore.selectedRegions = regions;
  },

  setSelectedInstances(instances: string[]) {
    console.log('Setting selected instances:', instances);
    spotStore.selectedInstances = instances;
  },

  setPricingConfig(config: Partial<PricingConfig>) {
    spotStore.pricingConfig = { ...spotStore.pricingConfig, ...config };
  },

  async analyzeInstances() {
    if (spotStore.selectedInstances.length === 0 || spotStore.selectedRegions.length === 0) {
      spotStore.error = 'Please select at least one instance type and region';
      return;
    }

    try {
      spotStore.isLoading = true;
      spotStore.error = null;
      console.log('Analyzing instances:', {
        selectedInstances: spotStore.selectedInstances,
        selectedRegions: spotStore.selectedRegions,
        pricingConfig: spotStore.pricingConfig,
        instanceQuantities: spotStore.instanceQuantities
      });

      const analysis = await spotService.analyzeInstances(
        spotStore.selectedInstances,
        spotStore.selectedRegions,
        spotStore.pricingConfig
      );

      // Check if we have any analysis results
      if (analysis.length > 0) {
        console.log('Analysis results received:', analysis);
        
        // Force UI update by setting initial values
        spotStore.analysis = [];
        spotStore.regionAnalysis = [];
        spotStore.stackAnalysis = [];
        
        // Small timeout to ensure the UI updates
        setTimeout(() => {
          try {
            // Make sure the store updates are properly applied 
            // Need to create new arrays to ensure reactivity
            const copyOfAnalysis = [...analysis];
            spotStore.analysis = copyOfAnalysis;
            
            // Process and set other analysis data
            spotStore.regionAnalysis = spotService.analyzeRegions(copyOfAnalysis);
            spotStore.stackAnalysis = spotService.analyzeStacks(copyOfAnalysis);
            spotStore.analysisResults = copyOfAnalysis;
            
            console.log('Store updated with analysis:', copyOfAnalysis.length);
          
            // Check for unavailable regions
            const unavailableRegions = new Set<string>();
            copyOfAnalysis.forEach(instanceAnalysis => {
              const unavailableRegionsForInstance = instanceAnalysis.spotMetrics
                .filter(metric => metric.spotUnavailable)
                .map(metric => metric.region);
              
              unavailableRegionsForInstance.forEach(region => unavailableRegions.add(region));
            });

            if (unavailableRegions.size > 0) {
              const regionList = Array.from(unavailableRegions).join(', ');
              spotStore.error = `Some regions have missing or incomplete pricing data (${regionList}). Showing available information for other regions.`;
            }
          } catch (error) {
            console.error('Error updating store with analysis:', error);
          }
        }, 50);
      } else {
        spotStore.error = 'No analysis data available for the selected configuration';
      }
    } catch (error) {
      console.error('Error analyzing instances:', error);
      if (error instanceof Error && error.message.includes('No pricing data available for any selected region')) {
        spotStore.error = 'No pricing data available for any of the selected regions. Please try different regions.';
      } else {
        spotStore.error = error instanceof Error ? error.message : 'Failed to analyze instances';
      }
    } finally {
      spotStore.isLoading = false;
    }
  },

  setIsLoading(loading: boolean) {
    spotStore.isLoading = loading;
  },

  setError(error: string | null) {
    spotStore.error = error;
  },

  setAnalysisResults(results: InstanceAnalysis[] | null) {
    spotStore.analysisResults = results;
  },

  updateInstanceQuantity(instanceType: string, region: RegionCode, operatingSystem: 'Linux' | 'Windows', quantity: number) {
    console.log(`UPDATE QUANTITY: ${instanceType} in ${region} (${operatingSystem}) = ${quantity}`);
    
    // Find if configuration already exists
    const existingIndex = spotStore.instanceQuantities.findIndex(
      item => item.instanceType === instanceType && 
              item.region === region && 
              item.operatingSystem === operatingSystem
    );

    console.log(`Found existing config: ${existingIndex >= 0 ? 'YES' : 'NO'}`);
    
    // Update existing or add new configuration
    if (existingIndex >= 0) {
      // Create a new array to trigger reactivity
      const newQuantities = [...spotStore.instanceQuantities];
      newQuantities[existingIndex] = {
        ...newQuantities[existingIndex],
        quantity
      };
      console.log(`Updating existing quantity: ${JSON.stringify(newQuantities[existingIndex])}`);
      spotStore.instanceQuantities = newQuantities;
    } else {
      const newConfig = {
        instanceType,
        region,
        operatingSystem,
        quantity
      };
      console.log(`Adding new quantity config: ${JSON.stringify(newConfig)}`);
      spotStore.instanceQuantities.push(newConfig);
      
      // Force reactivity by setting the entire array
      spotStore.instanceQuantities = [...spotStore.instanceQuantities];
    }
    
    // Force reactivity in Valtio
    setTimeout(() => {
      console.log(`Current quantities after update: ${spotStore.instanceQuantities.length} configs`);
    }, 50);
  },

  clearInstanceQuantities() {
    console.log('Clearing all instance quantities');
    spotStore.instanceQuantities = [];
  },
}; 