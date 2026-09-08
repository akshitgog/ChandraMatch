class PipelineError(Exception):
    """Base exception for all pipeline errors."""
    pass

class DatasetUnavailableError(PipelineError):
    """Raised when the dataset cannot be loaded from any configured source."""
    pass

class ConfigError(PipelineError):
    """Raised when configuration is invalid or missing."""
    pass

class NoGeographicOverlapError(PipelineError):
    """Raised when spatial footprints indicate zero common coverage."""
    pass

class ImageLoadError(PipelineError):
    """Raised when an image file cannot be read or is corrupted."""
    pass

class TransformationError(PipelineError):
    """Raised when geometric verification or transformation estimation fails."""
    pass
