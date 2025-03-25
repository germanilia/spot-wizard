import { EC2PricingData, EC2PricingRate, PricingConfig } from '../types/spot';

export class PricingService {
  private static instance: PricingService;
  private pricingData: Record<string, EC2PricingData> = {};
  private fetchPromises: Record<string, Promise<EC2PricingData>> = {};

  private constructor() {}

  public static getInstance(): PricingService {
    if (!PricingService.instance) {
      PricingService.instance = new PricingService();
    }
    return PricingService.instance;
  }

  private getRegionCode(region: string): string {
    const regionMap: Record<string, string> = {
      'us-east-1': 'US East (N. Virginia)',
      'us-east-2': 'US East (Ohio)',
      'us-west-1': 'US West (N. California)',
      'us-west-2': 'US West (Oregon)',
      'ap-south-1': 'Asia Pacific (Mumbai)',
      'ap-northeast-2': 'Asia Pacific (Seoul)',
      'ap-southeast-1': 'Asia Pacific (Singapore)',
      'ap-southeast-2': 'Asia Pacific (Sydney)',
      'ap-northeast-1': 'Asia Pacific (Tokyo)',
      'ca-central-1': 'Canada (Central)',
      'eu-central-1': 'EU (Frankfurt)',
      'eu-central-2': 'EU (Zurich)',
      'eu-west-1': 'EU (Ireland)',
      'eu-west-2': 'EU (London)',
      'eu-west-3': 'EU (Paris)',
      'eu-north-1': 'EU (Stockholm)',
      'eu-south-1': 'EU (Milan)',
      'eu-south-2': 'EU (Spain)',
      'sa-east-1': 'South America (Sao Paulo)',
    };
    return regionMap[region] || region;
  }

  private getPricingUrl(config: PricingConfig): string {
    // During development, use the FastAPI server URL
    const baseUrl = 'http://localhost:8000/api/pricing';
    const params = new URLSearchParams({
      region: config.region,
      os: config.operatingSystem
    });
    return `${baseUrl}?${params.toString()}`;
  }

  private getCacheKey(config: PricingConfig): string {
    return `${config.region}-${config.operatingSystem}`;
  }

  public async fetchPricing(config: PricingConfig): Promise<EC2PricingData> {
    const cacheKey = this.getCacheKey(config);
    
    if (this.pricingData[cacheKey]) {
      return this.pricingData[cacheKey];
    }

    if (this.fetchPromises[cacheKey]) {
      return this.fetchPromises[cacheKey];
    }

    try {
      const url = this.getPricingUrl(config);
      // Only log fetch attempts in development
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Fetching pricing data from: ${url}`);
      }
      
      this.fetchPromises[cacheKey] = fetch(url)
        .then(async response => {
          if (!response.ok) {
            const errorText = await response.text();
            // Check if this is a "no data available" error
            if (response.status === 404 && errorText.includes('No pricing data found for region')) {
              throw new Error(`NO_PRICING_DATA:${config.region}`);
            }
            throw new Error(`Failed to fetch pricing data: ${response.statusText} - ${errorText}`);
          }
          return response.json();
        })
        .then((data: EC2PricingData) => {
          // Only log successful fetches in development
          if (process.env.NODE_ENV === 'development') {
            console.debug('Received pricing data:', {
              region: config.region,
              os: config.operatingSystem,
              instanceCount: Object.keys(data.regions[this.getRegionCode(config.region)] || {}).length
            });
          }
          
          this.pricingData[cacheKey] = data;
          delete this.fetchPromises[cacheKey];
          return data;
        })
        .catch(error => {
          // Only log actual errors, not expected missing data
          if (!error.message.startsWith('NO_PRICING_DATA:')) {
            console.error('Pricing service error:', error);
          }
          delete this.fetchPromises[cacheKey];
          throw error;
        });

      return await this.fetchPromises[cacheKey];
    } catch (error) {
      // Only log actual errors, not expected missing data
      if (!error.message?.startsWith('NO_PRICING_DATA:')) {
        console.error('Error in fetchPricing:', error);
      }
      delete this.fetchPromises[cacheKey];
      throw error;
    }
  }

  private getRegionDisplayName(region: string): string {
    const regionMap: Record<string, string> = {
      'us-east-1': 'US East (N. Virginia)',
      'us-east-2': 'US East (Ohio)',
      'us-west-1': 'US West (N. California)',
      'us-west-2': 'US West (Oregon)',
      'ap-south-1': 'Asia Pacific (Mumbai)',
      'ap-northeast-2': 'Asia Pacific (Seoul)',
      'ap-southeast-1': 'Asia Pacific (Singapore)',
      'ap-southeast-2': 'Asia Pacific (Sydney)',
      'ap-northeast-1': 'Asia Pacific (Tokyo)',
      'ca-central-1': 'Canada (Central)',
      'eu-central-1': 'EU (Frankfurt)',
      'eu-central-2': 'EU (Zurich)',
      'eu-west-1': 'EU (Ireland)',
      'eu-west-2': 'EU (London)',
      'eu-west-3': 'EU (Paris)',
      'eu-north-1': 'EU (Stockholm)',
      'eu-south-1': 'EU (Milan)',
      'eu-south-2': 'EU (Spain)',
      'sa-east-1': 'South America (Sao Paulo)',
    };
    return regionMap[region] || region;
  }

  public getInstancePrice(instanceType: string, config: PricingConfig): EC2PricingRate | undefined {
    const cacheKey = this.getCacheKey(config);
    const data = this.pricingData[cacheKey];
    if (!data) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.debug(`No pricing data found for ${cacheKey}`);
      }
      return undefined;
    }
    
    const regionData = data.regions[config.region];
    if (!regionData) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.debug(`No region data found for ${config.region}`);
      }
      return undefined;
    }

    const price = regionData[instanceType];
    if (!price && process.env.NODE_ENV === 'development') {
      console.debug(`No price found for instance type ${instanceType} in region ${config.region}`);
    }
    return price;
  }
} 