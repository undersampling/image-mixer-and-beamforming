from ImageMixer.services.mixer import Mixer
from ImageMixer.services.custom_image import CustomImage
from ImageMixer.services.modes_enum import RegionMode
import numpy as np
import cv2
import logging


class Controller:
    """
    Controller class manages image processing workflow.
    Implements OOP principles with composition and coordination.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.current_region_mode = RegionMode.FULL
        self.list_of_images = [CustomImage(), CustomImage(), CustomImage(), CustomImage()]
        self.Mixer = Mixer()
        self.result_image_1 = None
        self.result_image_2 = None
        self.min_height = 50000
        self.min_width = 50000
        self.image_weights = [0, 0, 0, 0]
        self.rect = []
    
    def add_image(self, image_data, image_index):
        """
        Add an image to the list at specified index.
        
        Args:
            image_data: numpy array of image
            image_index: Index where to add image (0-3)
        """
        if 0 <= image_index < 4:
            new_image = CustomImage(image_data)
            new_image.loaded = True
            self.list_of_images[image_index] = new_image
            self.logger.info(f"Image added at index {image_index}")
    
    def get_min_image_size(self):
        """Get the minimum width and height of all loaded images."""
        self.min_height = 50000
        self.min_width = 50000
        for image in self.list_of_images:
            if image.loaded:
                self.min_height = min(self.min_height, image.original_image[2].shape[0])
                self.min_width = min(self.min_width, image.original_image[2].shape[1])
    
    def update_image_processing(self):
        """Update all images to have consistent size and compute transforms."""
        self.get_min_image_size()
        
        for i, image in enumerate(self.list_of_images):
            if image.loaded:
                image_height, image_width = image.original_image[2].shape[:2]
                if image_width != self.min_width or image_height != self.min_height:
                    image.handle_image_size(self.min_height, self.min_width)
                    # After resizing, we must recompute the transform
                    image.transform()
                else:
                    # Check if transform needs to be recomputed
                    if not np.array_equal(image.modified_image[2], image.original_image[2]):
                        image.transform()
                    # Ensure transform exists
                    if not hasattr(image, 'modified_image_fourier_components') or image.modified_image_fourier_components is None:
                        image.transform()
    
    def set_roi_boundaries(self, boundaries):
        """Set ROI boundaries for region selection."""
        self.rect = boundaries
        self.logger.info(f"ROI boundaries set to {self.rect}")
    
    def adjust_brightness_contrast(self, image_index, brightness, contrast):
        """Adjust brightness and contrast for a specific image."""
        if 0 <= image_index < 4 and self.list_of_images[image_index].loaded:
            self.list_of_images[image_index].adjust_brightness_contrast(brightness, contrast)
            self.logger.info(f"Adjusted brightness/contrast for image {image_index}")
    
    def reset_brightness_contrast(self, image_index):
        """Reset brightness and contrast for a specific image."""
        if 0 <= image_index < 4 and self.list_of_images[image_index].loaded:
            self.list_of_images[image_index].reset_brightness_contrast()
            self.update_image_processing()
            self.logger.info(f"Reset brightness/contrast for image {image_index}")
    
    def mix_all(self, output_viewer_number, region_mode):
        """
        Mix all images and return the result.
        
        Args:
            output_viewer_number: Which output viewer (0 or 1)
            region_mode: RegionMode enum
        
        Returns:
            numpy array of mixed image
        """
        try:
            # Ensure all images are processed and same size before mixing
            self.update_image_processing()
            
            self.current_region_mode = region_mode
            self.Mixer.images_list = self.list_of_images
            
            # Normalize weights to 0-1 range
            temp_weights = self.image_weights.copy()
            normalized_weights = [weight / 100.0 for weight in self.image_weights]
            
            mixer_result = self.Mixer.mix(normalized_weights, self.rect, region_mode)
            mixer_result_normalized = cv2.normalize(
                mixer_result, None, 0, 255, cv2.NORM_MINMAX
            ).astype(np.uint8)
            
            result_image = CustomImage(mixer_result_normalized)
            result_image.loaded = True
            
            if output_viewer_number == 0:
                self.result_image_1 = result_image
            else:
                self.result_image_2 = result_image
            
            return mixer_result_normalized
            
        except Exception as e:
            self.logger.error(f"Error occurred in mix_all function: {e}", exc_info=True)
            raise

