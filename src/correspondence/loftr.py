import torch
import kornia as K
import cv2
import numpy as np
from typing import Any, Dict, List, Tuple
from src.correspondence.base import CorrespondenceMethod
from src.utils.logging import logger
from kornia.feature import LoFTR

class LoFTRMatcher(CorrespondenceMethod):
    def __init__(self, pretrained="indoor"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.matcher = LoFTR(pretrained=pretrained).to(self.device)
        self.matcher.eval()

    def detect(self, image: np.ndarray, metadata: Dict[str, Any] = None) -> Any:
        return None

    def describe(self, image: np.ndarray, keypoints: Any) -> Tuple[Any, Any]:
        return None, None

    def match(self,
              source_image: np.ndarray,
              reference_image: np.ndarray,
              source_metadata: Dict[str, Any] = None,
              reference_metadata: Dict[str, Any] = None) -> List[Tuple[float, float, float, float, float]]:
        h1, w1 = source_image.shape[:2]
        h2, w2 = reference_image.shape[:2]

        max_dim = 840
        scale1 = min(1.0, max_dim / max(h1, w1))
        scale2 = min(1.0, max_dim / max(h2, w2))

        sh1, sw1 = int(h1 * scale1), int(w1 * scale1)
        sh2, sw2 = int(h2 * scale2), int(w2 * scale2)

        nh1, nw1 = max(8, (sh1 // 8) * 8), max(8, (sw1 // 8) * 8)
        nh2, nw2 = max(8, (sh2 // 8) * 8), max(8, (sw2 // 8) * 8)

        i1_resized = cv2.resize(source_image, (nw1, nh1), interpolation=cv2.INTER_AREA)
        i2_resized = cv2.resize(reference_image, (nw2, nh2), interpolation=cv2.INTER_AREA)

        t1 = K.image_to_tensor(i1_resized, False).float() / 255.0
        t2 = K.image_to_tensor(i2_resized, False).float() / 255.0
        t1 = t1.to(self.device)
        t2 = t2.to(self.device)

        input_dict = {"image0": t1, "image1": t2}

        with torch.no_grad():
            correspondences = self.matcher(input_dict)

        mkpts0 = correspondences["keypoints0"].cpu().numpy()
        mkpts1 = correspondences["keypoints1"].cpu().numpy()
        confidence = correspondences["confidence"].cpu().numpy()

        logger.info(f"LoFTR found {len(mkpts0)} correspondences.")

        matches = []
        for i in range(len(mkpts0)):
            x1 = mkpts0[i][0] * (w1 / nw1)
            y1 = mkpts0[i][1] * (h1 / nh1)
            x2 = mkpts1[i][0] * (w2 / nw2)
            y2 = mkpts1[i][1] * (h2 / nh2)
            matches.append((float(x1), float(y1), float(x2), float(y2), float(confidence[i])))

        return matches

