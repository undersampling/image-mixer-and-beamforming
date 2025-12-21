from copy import deepcopy
import numpy as np
import cv2
import logging


class CustomImage:
    """
    CustomImage class handles image processing including Fourier transforms.

    KEY PRINCIPLE: Brightness/contrast adjustments are DISPLAY-ONLY.
    - Mixing always uses original_sized_image (unaffected by brightness/contrast)
    - Component viewers show FFT of DISPLAY image (affected by brightness/contrast)

    This allows users to visually inspect adjusted images and their FFT components
    without affecting the mixing output.
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

            # === MIXING FFT (Always from original image) ===
            self.__mixing_fourier_components = np.fft.fft2(self.__modified_image[2])
            self.__mixing_fourier_components = np.fft.fftshift(self.__mixing_fourier_components)

            # These are used by the Mixer for combining images
            self.modified_image_fourier_components = self.__mixing_fourier_components
            self.modified_image_fourier_components_mag = np.abs(self.__mixing_fourier_components)
            self.modified_image_fourier_components_phase = np.angle(self.__mixing_fourier_components)
            self.modified_image_fourier_components_real = np.real(self.__mixing_fourier_components)
            self.modified_image_fourier_components_imag = np.imag(self.__mixing_fourier_components)

            # === DISPLAY FFT (Recomputed when brightness/contrast changes) ===
            self.__display_fourier_components = None
            self.__display_fourier_components_mag = None
            self.__display_fourier_components_phase = None
            self.__display_fourier_components_real = None
            self.__display_fourier_components_imag = None

            # Handle image sizing and contrast
            self.original_sized_image = deepcopy(self.__original_image)

            # Display adjustments (brightness/contrast) - separate from mixing data
            self.__display_brightness = 0.0
            self.__display_contrast = 0.0
            self.__display_image = None  # Will be computed when needed

            self.image__mag_weight = 25
            self.image__phase_weight = 25
            self.image_mag_taken = False
            self.image_phase_taken = False

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
        """Original FFT (for reference, not used in mixing)"""
        return self.__mixing_fourier_components

    @original_image_fourier_components.setter
    def original_image_fourier_components(self, new_original_image_fourier_components):
        self.__mixing_fourier_components = new_original_image_fourier_components

    @property
    def modified_image_fourier_components(self):
        """FFT used for MIXING (never affected by brightness/contrast)"""
        return self.__mixing_fourier_components

    @modified_image_fourier_components.setter
    def modified_image_fourier_components(self, new_modified_image_fourier_components):
        self.__mixing_fourier_components = new_modified_image_fourier_components
        # Update components
        self.modified_image_fourier_components_mag = np.abs(self.__mixing_fourier_components)
        self.modified_image_fourier_components_phase = np.angle(self.__mixing_fourier_components)
        self.modified_image_fourier_components_real = np.real(self.__mixing_fourier_components)
        self.modified_image_fourier_components_imag = np.imag(self.__mixing_fourier_components)

    # === DISPLAY FFT PROPERTIES ===
    @property
    def display_fourier_components_mag(self):
        """Magnitude component for DISPLAY (affected by brightness/contrast)"""
        if self.__display_fourier_components_mag is None:
            self._compute_display_fft()
        return self.__display_fourier_components_mag

    @property
    def display_fourier_components_phase(self):
        """Phase component for DISPLAY (affected by brightness/contrast)"""
        if self.__display_fourier_components_phase is None:
            self._compute_display_fft()
        return self.__display_fourier_components_phase

    @property
    def display_fourier_components_real(self):
        """Real component for DISPLAY (affected by brightness/contrast)"""
        if self.__display_fourier_components_real is None:
            self._compute_display_fft()
        return self.__display_fourier_components_real

    @property
    def display_fourier_components_imag(self):
        """Imaginary component for DISPLAY (affected by brightness/contrast)"""
        if self.__display_fourier_components_imag is None:
            self._compute_display_fft()
        return self.__display_fourier_components_imag

    def _compute_display_fft(self):
        """Compute FFT from the display-adjusted image"""
        display_img = self.get_display_image()

        # Compute FFT
        fft = np.fft.fft2(display_img)
        fft_shifted = np.fft.fftshift(fft)

        # Store components
        self.__display_fourier_components = fft_shifted
        self.__display_fourier_components_mag = np.abs(fft_shifted)
        self.__display_fourier_components_phase = np.angle(fft_shifted)
        self.__display_fourier_components_real = np.real(fft_shifted)
        self.__display_fourier_components_imag = np.imag(fft_shifted)

    def transform(self):
        """
        Compute Fourier transform of the image used for MIXING.
        Uses original_sized_image (without display adjustments).
        This is called after resizing or other operations that affect the base image.
        """
        # Use the image for mixing, not the display-adjusted version
        mixing_image = self.get_image_for_mixing()

        # Update MIXING FFT
        self.__mixing_fourier_components = np.fft.fftshift(np.fft.fft2(mixing_image))
        self.modified_image_fourier_components = self.__mixing_fourier_components
        self.modified_image_fourier_components_mag = np.abs(self.__mixing_fourier_components)
        self.modified_image_fourier_components_phase = np.angle(self.__mixing_fourier_components)
        self.modified_image_fourier_components_real = np.real(self.__mixing_fourier_components)
        self.modified_image_fourier_components_imag = np.imag(self.__mixing_fourier_components)

        # Invalidate display FFT cache so it gets recomputed
        self.__display_fourier_components = None
        self.__display_fourier_components_mag = None
        self.__display_fourier_components_phase = None
        self.__display_fourier_components_real = None
        self.__display_fourier_components_imag = None

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

    @property
    def display_brightness(self):
        """Get current display brightness adjustment."""
        return self.__display_brightness

    @property
    def display_contrast(self):
        """Get current display contrast adjustment."""
        return self.__display_contrast

    def get_display_image(self):
        """
        Get the image with brightness/contrast adjustments applied for DISPLAY only.
        This does NOT affect the mixing data.
        """
        # If no adjustments, return original sized image directly
        if self.__display_brightness == 0.0 and self.__display_contrast == 0.0:
            if hasattr(self, 'original_sized_image') and self.original_sized_image is not None:
                return self.original_sized_image[2]
            return self.__original_image[2]

        # If adjustments exist, compute display image
        if self.__display_image is None:
            if hasattr(self, 'original_sized_image') and self.original_sized_image is not None:
                base_image = self.original_sized_image[2]
            else:
                base_image = self.__original_image[2]

            self.__display_image = cv2.convertScaleAbs(
                base_image,
                alpha=1.0 + self.__display_contrast,
                beta=self.__display_brightness
            )
        return self.__display_image

    def adjust_brightness_contrast(self, brightness, contrast):
        """
        Adjust brightness and contrast for DISPLAY ONLY.
        This does NOT affect the mixing data - mixing uses original_sized_image.
        BUT it DOES affect the FFT components shown in ComponentViewer.
        """
        self.__display_brightness = brightness
        self.__display_contrast = contrast

        # Invalidate display image cache so it gets recomputed
        self.__display_image = None

        # Invalidate display FFT cache so it gets recomputed from adjusted image
        self.__display_fourier_components = None
        self.__display_fourier_components_mag = None
        self.__display_fourier_components_phase = None
        self.__display_fourier_components_real = None
        self.__display_fourier_components_imag = None

    def reset_brightness_contrast(self):
        """Reset brightness and contrast display adjustments to zero."""
        self.__display_brightness = 0.0
        self.__display_contrast = 0.0

        # Clear caches so next call returns original image
        self.__display_image = None
        self.__display_fourier_components = None
        self.__display_fourier_components_mag = None
        self.__display_fourier_components_phase = None
        self.__display_fourier_components_real = None
        self.__display_fourier_components_imag = None

        # Ensure modified_image matches original_sized_image
        if hasattr(self, 'original_sized_image') and self.original_sized_image is not None:
            self.modified_image[0] = self.original_sized_image[0].copy()
            self.modified_image[1] = self.original_sized_image[1].copy()
            self.modified_image[2] = self.original_sized_image[2].copy()

    def get_image_for_mixing(self):
        """
        Get the image data to use for MIXING (without display adjustments).
        This ensures brightness/contrast adjustments don't affect the mixed output.
        """
        # Always use original_sized_image for mixing, never the display-adjusted version
        if hasattr(self, 'original_sized_image') and self.original_sized_image is not None:
            return self.original_sized_image[2]
        return self.__original_image[2]