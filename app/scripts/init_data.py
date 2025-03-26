import asyncio
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
from .download_pricing import download_all_pricing_data

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_data():
    """Initialize all required data files."""
    logger.info("Starting data initialization...")
    
    # Create data directory if it doesn't exist
    data_dir = Path(__file__).parent.parent / "data"
    data_dir.mkdir(exist_ok=True)
    
    # Check if pricing data file exists and when it was last modified
    pricing_file = data_dir / "ec2_pricing.json"
    should_download = True
    
    if pricing_file.exists():
        # Get the file's last modification time
        file_mod_time = datetime.fromtimestamp(pricing_file.stat().st_mtime)
        current_time = datetime.now()
        
        # If file is less than 24 hours old, don't download
        if current_time - file_mod_time < timedelta(hours=24):
            logger.info("EC2 pricing data is less than 24 hours old. Skipping download.")
            should_download = False
        else:
            logger.info("EC2 pricing data is more than 24 hours old. Downloading fresh data.")
    else:
        logger.info("EC2 pricing data file not found. Downloading data.")
    
    # Download pricing data if needed
    if should_download:
        logger.info("Downloading EC2 pricing data...")
        pricing_data = await download_all_pricing_data()
        if pricing_data:
            logger.info("Successfully downloaded EC2 pricing data")
        else:
            logger.error("Failed to download EC2 pricing data")
    
    logger.info("Data initialization complete")

if __name__ == "__main__":
    asyncio.run(init_data()) 