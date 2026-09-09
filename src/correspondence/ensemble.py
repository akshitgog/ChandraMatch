from typing import Any, Tuple, List
import numpy as np
from src.correspondence.base import CorrespondenceMethod
from src.utils.logging import logger

class EnsembleMatcher(CorrespondenceMethod):
    def __init__(self, matchers: List[CorrespondenceMethod]):
        self.matchers = matchers

    def detect(self, image: np.ndarray, metadata: dict = None) -> Any:
        return None

    def describe(self, image: np.ndarray, keypoints: Any) -> Tuple[Any, Any]:
        return None, None

    def match(self, 
              source_image: np.ndarray, 
              reference_image: np.ndarray,
              source_metadata: dict = None,
              reference_metadata: dict = None) -> List[Tuple[float, float, float, float, float]]:
        
        all_matches = []
        for m in self.matchers:
            logger.info(f"Running ensemble component: {m.__class__.__name__}")
            matches = m.match(source_image, reference_image, source_metadata, reference_metadata)
            all_matches.extend(matches)
            
        logger.info(f"Ensemble aggregated {len(all_matches)} total raw matches.")
        return all_matches

