from copy import deepcopy
import numpy as np
import cv2
import logging


class CustomImage:
    """
    CustomImage class handles image processing including Fourier transforms.
    Maintains OOP principles with encapsulation and properties.
    """
    
    def __init__(self, image=None, loaded=False):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.loaded = False
        
        if image is not None and len(image) != 0:
            self.loaded = True
            if len(image.shape) == 3:
                imported_image_gray_scale = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                imported_image_gray_scale = image
            
            # Height
            image_x_components = np.arange(0, imported_image_gray_scale.shape[0] + 1)
            # Width
            image_y_components = np.arange(0, imported_image_gray_scale.shape[1] + 1)
            
            self.__original_image = np.empty((3,), dtype=object)
            self.__original_image[0] = image_x_components
            self.__original_image[1] = image_y_components
            self.__original_image[2] = np.array(imported_image_gray_scale, dtype=np.uint8)
            self.__modified_image = deepcopy(self.__original_image)
            
            # Compute Fourier transform
            self.__original_image_fourier_components = np.fft.fft2(self.modified_image[2])
            self.__original_image_fourier_components = np.fft.fftshift(self.__original_image_fourier_components)
            self.__modified_image_fourier_components = deepcopy(self.__original_image_fourier_components)
            
            # Handle image sizing and contrast
            self.original_sized_image = deepcopy(self.__original_image)
            
            self.image__mag_weight = 25
            self.image__phase_weight = 25
            self.image_mag_taken = False
            self.image_phase_taken = False
            self.modified_image_fourier_components_mag = np.abs(self.__modified_image_fourier_components)
            self.modified_image_fourier_components_phase = np.angle(self.__modified_image_fourier_components)
            self.modified_image_fourier_components_real = np.real(self.__modified_image_fourier_components)
            self.modified_image_fourier_components_imag = np.imag(self.__modified_image_fourier_components)
    
    @property
    def original_image(self):
        return self.__original_image
    
    @original_image.setter
    def original_image(self, new_image):
        self.__original_image = new_image
    
    @property
    def modified_image(self):
        return self.__modified_image
    
    @modified_image.setter
    def modified_image(self, new_modified_image):
        self.__modified_image = new_modified_image
    
    @property
    def original_image_fourier_components(self):
        return self.__original_image_fourier_components
    
    @original_image_fourier_components.setter
    def original_image_fourier_components(self, new_original_image_fourier_components):
        self.__original_image_fourier_components = new_original_image_fourier_components
    
    @property
    def modified_image_fourier_components(self):
        return self.__modified_image_fourier_components
    
    @modified_image_fourier_components.setter
    def modified_image_fourier_components(self, new_modified_image_fourier_components):
        self.__modified_image_fourier_components = new_modified_image_fourier_components
    
    def transform(self):
        """Compute Fourier transform of the modified image."""
        self.modified_image_fourier_components = np.fft.fftshift(np.fft.fft2(self.modified_image[2]))
        self.modified_image_fourier_components_mag = np.abs(self.__modified_image_fourier_components)
        self.modified_image_fourier_components_phase = np.angle(self.__modified_image_fourier_components)
        self.modified_image_fourier_components_real = np.real(self.__modified_image_fourier_components)
        self.modified_image_fourier_components_imag = np.imag(self.__modified_image_fourier_components)
    
    def inverse_transform(self):
        """Compute inverse Fourier transform."""
        self.modified_image[2] = np.fft.ifft2(np.fft.ifftshift(self.modified_image_fourier_components))
    
    def handle_image_size(self, height, width):
        """Resize image to specified dimensions."""
        current_image_height, current_image_width = self.original_image[2].shape[:2]
        if width == current_image_width and height == current_image_height:
            # Even if size matches, ensure transform is computed
            if not hasattr(self, 'modified_image_fourier_components') or self.modified_image_fourier_components is None:
                self.transform()
            return
        else:
            self.modified_image[0] = np.arange(1, height + 1)
            self.modified_image[1] = np.arange(1, width + 1)
            self.modified_image[2] = cv2.resize(self.original_image[2], (width, height))
            self.original_sized_image[0] = np.arange(1, height + 1)
            self.original_sized_image[1] = np.arange(1, width + 1)
            self.original_sized_image[2] = cv2.resize(self.original_image[2], (width, height))
            # After resizing, transform will be computed by update_image_processing
    
    def adjust_brightness_contrast(self, brightness, contrast):
        """Adjust brightness and contrast of the image."""
        self.modified_image[2] = cv2.convertScaleAbs(
            self.original_sized_image[2], 
            alpha=1 + contrast, 
            beta=brightness
        )
        self.transform()
    
    def reset_brightness_contrast(self):
        """Reset image to original (no brightness/contrast adjustments)."""
        # Reset to original sized image (which is already resized to match other images)
        if hasattr(self, 'original_sized_image') and self.original_sized_image is not None:
            self.modified_image[0] = self.original_sized_image[0].copy()
            self.modified_image[1] = self.original_sized_image[1].copy()
            self.modified_image[2] = self.original_sized_image[2].copy()
        else:
            # Fallback to original if original_sized_image doesn't exist
            self.modified_image = deepcopy(self.original_image)
        self.transform()

