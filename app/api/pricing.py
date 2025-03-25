from typing import Optional, Dict
from fastapi import APIRouter, HTTPException
import httpx
from pydantic import BaseModel
import urllib.parse
from pathlib import Path
import json
import logging
import sys

# Configure logging to print to stdout
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

router = APIRouter()

class EC2PricingRate(BaseModel):
    price: str
    unit: str = "Hrs"
    description: Optional[str] = None

class PricingResponse(BaseModel):
    regions: Dict[str, Dict[str, EC2PricingRate]]

def get_region_pricing(data_file: Path, region_name: str, os: str) -> Optional[Dict[str, EC2PricingRate]]:
    """Get pricing data for a specific region and OS using streaming JSON parsing."""
    logger.debug(f"Starting to get pricing data for {region_name} ({os})")
    try:
        logger.debug(f"Opening file: {data_file}")
        with open(data_file, 'r') as f:
            logger.debug("Loading JSON data...")
            data = json.load(f)
            logger.debug(f"JSON data loaded, found {len(data)} region codes")
            
        # The data is organized by region code first
        for region_code, region_data in data.items():
            logger.debug(f"Processing region code: {region_code}")
            if os not in region_data:
                logger.debug(f"OS {os} not found in region {region_code}")
                continue
                
            # Check if this region has our target region name
            regions = region_data[os].get('regions', {})
            logger.debug(f"Found regions for {os}: {list(regions.keys())}")
            
            # Map the region name to the format used in the data
            region_mapping = {
                'us-east-1': 'US East (N. Virginia)',
                'us-east-2': 'US East (Ohio)',
                'us-west-1': 'US West (N. California)',
                'us-west-2': 'US West (Oregon)',
                'ap-south-1': 'Asia Pacific (Mumbai)',
                'ap-south-2': 'Asia Pacific (Hyderabad)',
                'ap-northeast-2': 'Asia Pacific (Seoul)',
                'ap-northeast-3': 'Asia Pacific (Osaka)',
                'ap-southeast-1': 'Asia Pacific (Singapore)',
                'ap-southeast-2': 'Asia Pacific (Sydney)',
                'ap-southeast-3': 'Asia Pacific (Jakarta)',
                'ap-southeast-4': 'Asia Pacific (Melbourne)',
                'ap-southeast-7': 'Asia Pacific (Jakarta)',
                'ap-east-1': 'Asia Pacific (Hong Kong)',
                'ap-northeast-1': 'Asia Pacific (Tokyo)',
                'ca-central-1': 'Canada (Central)',
                'ca-west-1': 'Canada (West)',
                'eu-central-1': 'EU (Frankfurt)',
                'eu-central-2': 'EU (Zurich)',
                'eu-west-1': 'EU (Ireland)',
                'eu-west-2': 'EU (London)',
                'eu-west-3': 'EU (Paris)',
                'eu-north-1': 'EU (Stockholm)',
                'eu-south-1': 'EU (Milan)',
                'eu-south-2': 'EU (Spain)',
                'sa-east-1': 'South America (Sao Paulo)',
                'af-south-1': 'Africa (Cape Town)',
                'me-central-1': 'Middle East (UAE)',
                'me-south-1': 'Middle East (Bahrain)',
                'il-central-1': 'Israel (Tel Aviv)',
                'mx-central-1': 'Mexico (Central)'
            }
            
            mapped_region = region_mapping.get(region_name, region_name)
            logger.debug(f"Mapped region name '{region_name}' to '{mapped_region}'")
            
            if mapped_region in regions:
                logger.debug(f"Found matching region: {mapped_region}")
                instance_data = regions[mapped_region]
                pricing_data = {}
                
                # Process each instance
                logger.debug(f"Processing {len(instance_data)} instances")
                for instance_key, instance_info in instance_data.items():
                    logger.debug(f"Processing instance: {instance_key}")
                    # Extract instance type from the full instance type string
                    instance_type = instance_info.get('Instance Type')
                    if instance_type:
                        logger.debug(f"Found instance type: {instance_type}")
                        pricing_data[instance_type] = EC2PricingRate(
                            price=instance_info['price'],
                            unit="Hrs",
                            description=f"On-demand price for {instance_type}"
                        )
                
                logger.debug(f"Returning pricing data for {len(pricing_data)} instances")
                return pricing_data
                
        logger.debug("No matching region found")
        return None
    except Exception as e:
        logger.exception(f"Error getting region pricing: {str(e)}")
        return None

@router.get("/pricing", response_model=PricingResponse)
async def get_pricing(region: str, os: str):
    """
    Get pricing data for a specific region and OS from the downloaded data.
    """
    logger.info("=" * 80)
    logger.info(f"Received pricing request - Region: {region}, OS: {os}")
    
    try:
        data_file = Path(__file__).parent.parent / "data" / "ec2_pricing.json"
        logger.info(f"Looking for pricing data in: {data_file}")
        logger.debug(f"Full path: {data_file.absolute()}")
        
        if not data_file.exists():
            logger.error(f"Pricing data file not found at {data_file}")
            raise HTTPException(
                status_code=500,
                detail="Pricing data not available. Please ensure the data has been downloaded."
            )
        
        # Get pricing data for the region
        logger.info(f"Getting pricing data for region {region} and OS {os}...")
        pricing_data = get_region_pricing(data_file, region, os)
        
        if not pricing_data:
            logger.error(f"No pricing data found for region: {region}, OS: {os}")
            raise HTTPException(
                status_code=404,
                detail=f"No pricing data found for region: {region}, OS: {os}"
            )
        
        logger.info(f"Successfully found pricing data with {len(pricing_data)} instances")
        response = PricingResponse(regions={region: pricing_data})
        logger.debug(f"Returning response: {response.dict()}")
        return response
            
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/pricing/test")
async def test_pricing():
    """Test endpoint to verify the pricing router is working."""
    logger.info("Test endpoint called")
    return {"status": "ok", "message": "Pricing router is working"} 