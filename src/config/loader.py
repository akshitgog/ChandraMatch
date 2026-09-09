import os
import yaml
from pathlib import Path
from src.utils.exceptions import ConfigError
from src.utils.logging import logger

def load_config(config_path: str = "config/local.yaml") -> dict:
    """Loads YAML configuration and validates basic keys."""
    path = Path(config_path)
    if not path.exists():
        logger.error(f"Configuration file missing: {config_path}")
        raise ConfigError(f"Configuration file missing: {config_path}")
        
    try:
        with open(path, 'r') as f:
            config = yaml.safe_load(f)
    except yaml.YAMLError as e:
        logger.error(f"Malformed YAML in {config_path}: {e}")
        raise ConfigError(f"Malformed YAML in {config_path}: {e}")
        
    # Check for ORB constraint
    if config.get("matching", {}).get("use_orb", False):
        raise ConfigError("CRITICAL EXCEPTION: use_orb is explicitly banned by project requirements.")
        
    logger.info(f"Loaded configuration from {config_path}")
    return config

def get_hf_token(config: dict) -> str | None:
    """Retrieves Hugging Face token from environment, not from YAML content directly."""
    token_env = config.get("dataset", {}).get("huggingface", {}).get("token_env", "HF_TOKEN")
    token = os.getenv(token_env)
    
    if token:
        logger.info("Found Hugging Face token in environment.")
    else:
        logger.warning(f"Hugging Face token not found in environment variable: {token_env}")
        
    return token
