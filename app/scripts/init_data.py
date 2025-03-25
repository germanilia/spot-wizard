import asyncio
import logging
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
    
    # Download pricing data
    logger.info("Downloading EC2 pricing data...")
    pricing_data = await download_all_pricing_data()
    if pricing_data:
        logger.info("Successfully downloaded EC2 pricing data")
    else:
        logger.error("Failed to download EC2 pricing data")
    
    logger.info("Data initialization complete")

if __name__ == "__main__":
    asyncio.run(init_data()) 