import logging
import sys
from pathlib import Path

def setup_logging(log_dir: str = "./logs", log_file: str = "pipeline.log", level: int = logging.INFO) -> logging.Logger:
    """
    Configures and returns a logger that logs to both terminal and file.
    Does not log sensitive environment variables or tokens.
    """
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)
    
    logger = logging.getLogger("ChandraMatch")
    logger.setLevel(level)
    
    if logger.hasHandlers():
        logger.handlers.clear()
        
    formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(module)s:%(lineno)d | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # File Handler
    fh = logging.FileHandler(log_path / log_file)
    fh.setLevel(level)
    fh.setFormatter(formatter)
    
    # Console Handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(level)
    ch.setFormatter(formatter)
    
    logger.addHandler(fh)
    logger.addHandler(ch)
    
    return logger

logger = setup_logging()
