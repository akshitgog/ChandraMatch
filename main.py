import sys
from src.config.loader import load_config, get_hf_token
from src.utils.logging import logger
from src.data.dataset_loader import get_dataset
from src.pipeline import ChandraMatchPipeline
from src.utils.exceptions import PipelineError

def main():
    logger.info("Initializing Chandrayaan-2 TMC-2/OHRC Correspondence Pipeline")
    
    try:
        # 1. Load config
        config = load_config()
        
        # 2. Extract Token
        token = get_hf_token(config)
        
        # 3. Load Dataset with Fallback
        dataset = get_dataset(config, token)
        logger.info(f"Loaded {len(dataset)} pairs successfully.")
        
        # 4. Initialize Pipeline
        pipeline = ChandraMatchPipeline(config)
        
        # 5. Process Pairs
        print("\n" + "="*60)
        print("Chandrayaan-2 TMC2/OHRC Correspondence")
        print("="*60)
        
        for pair in dataset:
            metrics = pipeline.process_pair(pair)
            
            # Print Summary matching prompt request
            print(f"\nPair {pair.pair_id}")
            print(f"TMC2 shape     : {pair.tmc2_native_shape}")
            print(f"OHRC shape     : {pair.ohrc_native_shape}")
            print(f"Raw matches    : {metrics['candidate_match_count']}")
            print(f"Inliers        : {metrics['inlier_count']}")
            print(f"Final matches  : {metrics['final_correspondence_count']}")
            print(f"Inlier ratio   : {metrics['inlier_ratio']:.2f}")
            print(f"RMSE           : {metrics['rmse_pixels']} source pixels")
            print(f"Coverage       : {metrics['spatial_coverage_ratio']*100:.1f} %")
            
        print(f"\nOutputs:\n{config['output']['root_dir']}")
        print("="*60 + "\n")
            
    except PipelineError as e:
        logger.error(f"Pipeline failed: {e}")
        sys.exit(1)
    except Exception as e:
        logger.exception(f"Unexpected error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
