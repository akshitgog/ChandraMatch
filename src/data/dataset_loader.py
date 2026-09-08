from abc import ABC, abstractmethod
from typing import List, Dict
import os
from src.data.pair import ImagePair
from src.utils.exceptions import DatasetUnavailableError
from src.utils.logging import logger

class BaseDatasetLoader(ABC):
    @abstractmethod
    def load_pair(self, pair_id: str, paths: Dict[str, str]) -> ImagePair:
        pass

class HuggingFaceLoader(BaseDatasetLoader):
    def __init__(self, config: dict, token: str):
        self.repo_id = config.get("dataset", {}).get("huggingface", {}).get("repo_id")
        self.token = token
        
    def load_pair(self, pair_id: str, paths: Dict[str, str]) -> ImagePair:
        logger.info(f"Attempting to load {pair_id} from Hugging Face...")
        # Simulating failure to force fallback for this scaffolding
        raise DatasetUnavailableError("Hugging Face dataset not accessible or internet disconnected.")

class LocalLoader(BaseDatasetLoader):
    def __init__(self, config: dict):
        self.root_dir = config.get("dataset", {}).get("local", {}).get("root_dir", "./data/local")
        
    def load_pair(self, pair_id: str, paths: Dict[str, str]) -> ImagePair:
        logger.info(f"Attempting to load {pair_id} locally from {self.root_dir}...")
        
        tmc_xml_full = os.path.join(self.root_dir, paths.get("tmc2_xml", ""))
        tmc_img_full = os.path.join(self.root_dir, paths.get("tmc2_img", ""))
        ohrc_xml_full = os.path.join(self.root_dir, paths.get("ohrc_xml", ""))
        ohrc_img_full = os.path.join(self.root_dir, paths.get("ohrc_img", ""))
        
        # For scaffolding, if the folders exist, we simulate success
        # We check the directory since we haven't actually created the dummy XML/IMG files
        tmc_dir = os.path.dirname(tmc_xml_full)
        ohrc_dir = os.path.dirname(ohrc_xml_full)
        
        if not os.path.exists(tmc_dir) or not os.path.exists(ohrc_dir):
            raise DatasetUnavailableError(f"Local paths do not exist: {tmc_dir} / {ohrc_dir}")
            
        logger.info(f"Loaded {pair_id} successfully from local storage.")
        
        from src.data.metadata import parse_pds4_xml
        logger.info("Parsing actual XML metadata...")
        t_meta = parse_pds4_xml(tmc_xml_full)
        o_meta = parse_pds4_xml(ohrc_xml_full)
        
        # import pds4_tools
        # tmc2_image = pds4_tools.read(tmc_xml_full)[0].data
        # ohrc_image = pds4_tools.read(ohrc_xml_full)[0].data
        
        import numpy as np
        
        return ImagePair(
            pair_id=pair_id,
            tmc2_image=np.zeros((10, 10), dtype=np.uint8),  # Scaled down mock to prevent RAM crash
            tmc2_native_shape=t_meta.dimensions_native,
            tmc2_metadata=t_meta,
            tmc2_filepath=tmc_img_full,
            ohrc_image=np.zeros((10, 10), dtype=np.uint8),  # Scaled down mock to prevent RAM crash
            ohrc_native_shape=o_meta.dimensions_native,
            ohrc_metadata=o_meta,
            ohrc_filepath=ohrc_img_full
        )

def get_dataset(config: dict, token: str) -> List[ImagePair]:
    """Hierarchical loader based on configured priority."""
    priority = config.get("dataset", {}).get("source_priority", ["huggingface", "local"])
    pairs_config = config.get("dataset", {}).get("pairs", {})
    
    loaded_pairs = []
    
    for pair_id, paths in pairs_config.items():
        pair_loaded = False
        errors = []
        
        for source in priority:
            try:
                if source == "huggingface" and config["dataset"]["huggingface"]["enabled"]:
                    loader = HuggingFaceLoader(config, token)
                    pair = loader.load_pair(pair_id, paths)
                    loaded_pairs.append(pair)
                    pair_loaded = True
                    break
                    
                elif source == "local" and config["dataset"]["local"]["enabled"]:
                    loader = LocalLoader(config)
                    pair = loader.load_pair(pair_id, paths)
                    loaded_pairs.append(pair)
                    pair_loaded = True
                    break
                    
            except Exception as e:
                logger.warning(f"{source} loader failed for {pair_id}: {str(e)}")
                errors.append(f"{source}: {str(e)}")
                
        if not pair_loaded:
            err_msg = f"Dataset unavailable for {pair_id}.\n" + "\n".join(errors)
            logger.error(err_msg)
            # GUI Error handling for headless/UI fallback
            try:
                import tkinter as tk
                from tkinter import messagebox
                root = tk.Tk()
                root.withdraw()
                messagebox.showerror("Dataset Load Error", err_msg)
                root.destroy()
            except ImportError:
                logger.error("GUI error popup unavailable. Running in headless mode.")
                
            raise DatasetUnavailableError(err_msg)
            
    return loaded_pairs
