import cv2
import numpy as np
from typing import List, Tuple, Dict, Any
from src.correspondence.base import CorrespondenceMethod
from src.utils.logging import logger

class SIFTMatcher(CorrespondenceMethod):
    """
    Optional SIFT Baseline implementation.
    Per project restrictions, this is NOT hard-coded into the pipeline
    and is only loaded via local.yaml configuration.
    """
    def __init__(self, nfeatures=10000, ratio_thresh=0.75):
        self.detector = cv2.SIFT_create(nfeatures=nfeatures)
        self.matcher = cv2.BFMatcher(cv2.NORM_L2)
        self.ratio_thresh = ratio_thresh

    def detect(self, image: np.ndarray, metadata: Dict[str, Any] = None) -> Any:
        return self.detector.detect(image, None)

    def describe(self, image: np.ndarray, keypoints: Any) -> Tuple[Any, Any]:
        return self.detector.compute(image, keypoints)

    def match(self, 
              source_image: np.ndarray, 
              reference_image: np.ndarray,
              source_metadata: Dict[str, Any] = None,
              reference_metadata: Dict[str, Any] = None) -> List[Tuple[float, float, float, float, float]]:
        
        logger.info("Detecting SIFT keypoints and extracting descriptors...")
        kp1, des1 = self.detector.detectAndCompute(source_image, None)
        kp2, des2 = self.detector.detectAndCompute(reference_image, None)
        
        if des1 is None or des2 is None or len(kp1) < 2 or len(kp2) < 2:
            logger.warning("Not enough features detected to perform matching.")
            return []

        logger.info(f"Matching {len(kp1)} source features to {len(kp2)} reference features...")
        raw_matches = self.matcher.knnMatch(des1, des2, k=2)
        
        good_matches = []
        for m, n in raw_matches:
            if m.distance < self.ratio_thresh * n.distance:
                pt1 = kp1[m.queryIdx].pt
                pt2 = kp2[m.trainIdx].pt
                score = 1.0 / (1.0 + m.distance)
                good_matches.append((pt1[0], pt1[1], pt2[0], pt2[1], score))
                
        logger.info(f"Retained {len(good_matches)} matches after Lowe's ratio test.")
        return good_matches
