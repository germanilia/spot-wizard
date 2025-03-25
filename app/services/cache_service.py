import json
import os
from datetime import datetime, timedelta
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class CacheService:
    CACHE_DIR = Path("app/data")
    CACHE_DURATION = timedelta(hours=24)

    @classmethod
    def ensure_cache_dir(cls):
        """Ensure the cache directory exists."""
        cls.CACHE_DIR.mkdir(parents=True, exist_ok=True)

    @classmethod
    def get_cached_data(cls, filename: str) -> dict | None:
        """Get cached data if it exists and is not expired."""
        try:
            file_path = cls.CACHE_DIR / filename
            if not file_path.exists():
                return None

            # Check if file is older than 24 hours
            file_age = datetime.now() - datetime.fromtimestamp(file_path.stat().st_mtime)
            if file_age > cls.CACHE_DURATION:
                logger.info(f"Cache expired for {filename}")
                return None

            with open(file_path, 'r') as f:
                logger.info(f"Reading cached data from {filename}")
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading cache file {filename}: {e}")
            return None

    @classmethod
    def save_cached_data(cls, filename: str, data: dict) -> None:
        """Save data to cache file."""
        try:
            cls.ensure_cache_dir()
            file_path = cls.CACHE_DIR / filename
            with open(file_path, 'w') as f:
                logger.info(f"Saving data to cache file {filename}")
                json.dump(data, f)
        except Exception as e:
            logger.error(f"Error saving cache file {filename}: {e}") 