import asyncio
import httpx
import json
from pathlib import Path
import logging
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the regions and operating systems we want to fetch
REGIONS = {
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
    'sa-east-1': 'South America (Sao Paulo)',
}

OPERATING_SYSTEMS = ['Linux', 'Windows']

def format_region_name(region: str) -> str:
    """Format region name to match AWS pricing API format."""
    return region.replace(" ", "%20").replace("(", "%28").replace(")", "%29")

async def download_pricing_data(region_code: str, region_name: str, os_name: str) -> Optional[Dict[str, Any]]:
    """Download pricing data for a specific region and OS."""
    formatted_region = format_region_name(region_name)
    url = f"https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/ec2/USD/current/ec2-ondemand-without-sec-sel/{formatted_region}/{os_name}/index.json"
    
    try:
        async with httpx.AsyncClient() as client:
            logger.info(f"Downloading pricing data for {region_code} ({os_name})")
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to download pricing data for {region_code} ({os_name}): {str(e)}")
        return None

async def download_all_pricing_data():
    """Download pricing data for all regions and operating systems."""
    # Create the data directory if it doesn't exist
    data_dir = Path(__file__).parent.parent / "data"
    data_dir.mkdir(exist_ok=True)
    
    pricing_data = {}
    
    # Download data for each region and OS combination
    for region_code, region_name in REGIONS.items():
        pricing_data[region_code] = {}
        for os_name in OPERATING_SYSTEMS:
            data = await download_pricing_data(region_code, region_name, os_name)
            if data:
                pricing_data[region_code][os_name] = data
    
    # Save the combined data
    output_file = data_dir / "ec2_pricing.json"
    with open(output_file, 'w') as f:
        json.dump(pricing_data, f)
    
    logger.info(f"Pricing data saved to {output_file}")
    return pricing_data

if __name__ == "__main__":
    asyncio.run(download_all_pricing_data()) 