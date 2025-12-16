from ImageMixer.services.modes_enum import Mode, RegionMode
import numpy as np
import logging


class Mixer:
    """
    Mixer class handles mixing of images in frequency domain.
    Implements OOP principles with encapsulation and single responsibility.
    This implementation matches the original PyQt5 desktop application logic.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.progress_value = 0
        self.images_list = []
        self.__current_mode = Mode.MAGNITUDE_PHASE
        self.images_modes = [Mode.MAGNITUDE, Mode.MAGNITUDE, Mode.MAGNITUDE, Mode.MAGNITUDE]
    
    @property
    def current_mode(self):
        return self.__current_mode
    
    @current_mode.setter
    def current_mode(self, new_mode):
        self.logger.info(f"Changing mode from {self.__current_mode} to {new_mode}.")
        self.__current_mode = new_mode
    
    def get_region_image(self, image_number, region_mode, boundaries):
        """
        Extract region from image based on region mode and boundaries.
        
        Args:
            image_number: Index of image in images_list
            region_mode: RegionMode enum (FULL, INNER, OUTER)
            boundaries: List of [left, top, right, bottom] coordinates
        
        Returns:
            numpy array of the region image
        """
        region_image = self.images_list[image_number].modified_image_fourier_components
        
        if region_mode == RegionMode.FULL:
            return region_image
        
        # Get boundaries and ensure they're within image bounds
        left, top, right, bottom = boundaries
        height, width = region_image.shape
        
        # Clamp boundaries to image dimensions
        left = max(0, min(int(left), width - 1))
        top = max(0, min(int(top), height - 1))
        right = max(left + 1, min(int(right), width - 1))
        bottom = max(top + 1, min(int(bottom), height - 1))
        
        if region_mode == RegionMode.INNER:
            # Create mask for inner region
            mask = np.zeros(region_image.shape, dtype=complex)
            mask[top:bottom+1, left:right+1] = 1
            region_image = region_image * mask
        elif region_mode == RegionMode.OUTER:
            # Create mask for outer region
            mask = np.ones(region_image.shape, dtype=complex)
            mask[top:bottom+1, left:right+1] = 0
            region_image = region_image * mask
        
        return region_image
    
    def mix(self, weights, boundaries, region_mode, image_region_modes=None):
        """
        Mix images based on weights, boundaries, and region mode.
        
        This matches the original PyQt5 implementation logic:
        - Images in MAGNITUDE mode contribute only their magnitude (weighted)
        - Images in PHASE mode contribute only their phase (weighted)
        - Images in REAL mode contribute only their real part (weighted)
        - Images in IMAGINARY mode contribute only their imaginary part (weighted)
        - Components are summed separately, then combined
        
        Args:
            weights: List of weights for each image (0-1 range, normalized from 0-100)
            boundaries: List of [left, top, right, bottom] coordinates
            region_mode: RegionMode enum
            image_region_modes: List of per-image RegionMode enums (used when region_mode is INNER_OUTER)
        
        Returns:
            numpy array of the mixed image
        """
        # Default image region modes if not provided
        if image_region_modes is None:
            image_region_modes = [RegionMode.INNER, RegionMode.INNER, RegionMode.INNER, RegionMode.INNER]
        
        # Initialize result variables (matching original implementation)
        resulted_mix_magnitude = 0
        resulted_mix_phase = 0
        resulted_mix_real = 0
        resulted_mix_imag = 0
        
        if self.current_mode == Mode.MAGNITUDE_PHASE:
            weighted_images_magnitudes = []
            weighted_images_phases = []
            
            for image_number in range(len(self.images_list)):
                if not self.images_list[image_number].loaded:
                    continue
                
                # Determine which region mode to use for this image
                if region_mode == RegionMode.INNER_OUTER:
                    # Use per-image region mode
                    effective_region_mode = image_region_modes[image_number]
                else:
                    # Use global region mode (FULL, INNER, or OUTER)
                    effective_region_mode = region_mode
                
                region_image = self.get_region_image(image_number, effective_region_mode, boundaries)
                image_magnitude = np.abs(region_image)
                image_phase = np.angle(region_image)
                
                # Check mode and contribute accordingly (using 'if' like original, not 'elif')
                if self.images_modes[image_number] == Mode.MAGNITUDE:
                    weighted_image_magnitude = image_magnitude * weights[image_number]
                    weighted_images_magnitudes.append(weighted_image_magnitude)
                
                if self.images_modes[image_number] == Mode.PHASE:
                    weighted_image_phase = image_phase * weights[image_number]
                    weighted_images_phases.append(weighted_image_phase)
            
            # Sum all magnitude contributions
            for weighted_mag in weighted_images_magnitudes:
                resulted_mix_magnitude += weighted_mag
                
            # FIX: If we have phase but no magnitude (or magnitude is 0), set magnitude to 1
            if len(weighted_images_phases) > 0:
                # Check if magnitude is effectively zero
                is_magnitude_zero = False
                if isinstance(resulted_mix_magnitude, int) and resulted_mix_magnitude == 0:
                    is_magnitude_zero = True
                elif isinstance(resulted_mix_magnitude, np.ndarray) and np.max(np.abs(resulted_mix_magnitude)) < 1e-10:
                    is_magnitude_zero = True
                    
                if is_magnitude_zero:
                    resulted_mix_magnitude = 1
            
            # Sum all phase contributions
            for weighted_phase in weighted_images_phases:
                resulted_mix_phase += weighted_phase
            
            # Combine magnitude and phase (matching original: magnitude * exp(1j * phase))
            resulted_mix_complex = resulted_mix_magnitude * np.exp(1j * resulted_mix_phase)
            
        elif self.current_mode == Mode.REAL_IMAGINARY:
            weighted_images_real_parts = []
            weighted_images_imaginary_parts = []
            
            for image_number in range(len(self.images_list)):
                if not self.images_list[image_number].loaded:
                    continue
                
                # Determine which region mode to use for this image
                if region_mode == RegionMode.INNER_OUTER:
                    # Use per-image region mode
                    effective_region_mode = image_region_modes[image_number]
                else:
                    # Use global region mode (FULL, INNER, or OUTER)
                    effective_region_mode = region_mode
                
                region_image = self.get_region_image(image_number, effective_region_mode, boundaries)
                image_real = np.real(region_image)
                image_imag = np.imag(region_image)
                
                # Check mode and contribute accordingly
                if self.images_modes[image_number] == Mode.REAL:
                    weighted_image_real = image_real * weights[image_number]
                    weighted_images_real_parts.append(weighted_image_real)
                
                elif self.images_modes[image_number] == Mode.IMAGINARY:
                    weighted_image_imag = image_imag * weights[image_number]
                    weighted_images_imaginary_parts.append(weighted_image_imag)
            
            # Sum all real contributions
            for weighted_real in weighted_images_real_parts:
                resulted_mix_real += weighted_real
            
            # Sum all imaginary contributions
            for weighted_imag in weighted_images_imaginary_parts:
                resulted_mix_imag += weighted_imag
            
            # Combine real and imaginary parts
            resulted_mix_complex = resulted_mix_real + 1j * resulted_mix_imag
        
        # Perform inverse FFT (matching original implementation)
        resulted_inversed_image = np.fft.ifft2(np.fft.ifftshift(resulted_mix_complex))
        resulted_image_real = resulted_inversed_image.real
        
        return resulted_image_real

