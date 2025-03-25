import { proxy } from 'valtio';
import { InstanceAnalysis, RegionAnalysis, StackAnalysis, PricingConfig, RegionCode } from '../types/spot';
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
        pricingConfig: spotStore.pricingConfig
      });

      const analysis = await spotService.analyzeInstances(
        spotStore.selectedInstances,
        spotStore.selectedRegions,
        spotStore.pricingConfig
      );

      // Check if we have any analysis results
      if (analysis.length > 0) {
        spotStore.analysis = analysis;
        spotStore.regionAnalysis = spotService.analyzeRegions(analysis);
        spotStore.stackAnalysis = spotService.analyzeStacks(analysis);
        spotStore.analysisResults = analysis;

        // Check for unavailable regions
        const unavailableRegions = new Set<string>();
        analysis.forEach(instanceAnalysis => {
          if (instanceAnalysis.unavailableRegions) {
            instanceAnalysis.unavailableRegions.forEach(region => unavailableRegions.add(region));
          }
        });

        if (unavailableRegions.size > 0) {
          const regionList = Array.from(unavailableRegions).join(', ');
          spotStore.error = `Some regions have missing or incomplete pricing data (${regionList}). Showing available information for other regions.`;
        }
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
}; 