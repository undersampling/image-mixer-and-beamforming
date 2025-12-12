"""
Image Processor with OPTIMIZED FFT Implementation - OOP Encapsulated
Performance: Uses NumPy's optimized FFT instead of custom implementation
"""
import numpy as np
from typing import Tuple, Optional, Dict, Any
from PIL import Image
import io
import base64


class FourierTransform:
    """FFT/IFFT wrapper using NumPy's optimized implementation."""

    @staticmethod
    def fft2d(image: np.ndarray) -> np.ndarray:
        """Optimized 2D FFT using NumPy."""
        return np.fft.fft2(image)

    @staticmethod
    def ifft2d(fft_data: np.ndarray) -> np.ndarray:
        """Optimized 2D IFFT using NumPy."""
        return np.fft.ifft2(fft_data)

    @staticmethod
    def shift(fft_data: np.ndarray) -> np.ndarray:
        """Shift zero frequency to center."""
        return np.fft.fftshift(fft_data)

    @staticmethod
    def unshift(fft_data: np.ndarray) -> np.ndarray:
        """Reverse the shift."""
        return np.fft.ifftshift(fft_data)


class ImageData:
    """Encapsulated image with all Fourier domain representations."""

    def __init__(self, image_array: np.ndarray, image_id: int):
        """
        Initialize image data.
        Args:
            image_array: 2D numpy array (grayscale)
            image_id: Unique identifier for this image
        """
        self._id = image_id
        self._original = image_array.astype(np.float64)
        self._height, self._width = self._original.shape

        # Brightness and contrast adjustments
        self._brightness = 0.0
        self._contrast = 1.0

        # Compute FFT (optimized)
        self._compute_fft()

    def _compute_fft(self) -> None:
        """Compute and store all FFT representations."""
        # Use NumPy's optimized FFT (much faster!)
        self._fft_complex = FourierTransform.fft2d(self._original)
        self._fft_shifted = FourierTransform.shift(self._fft_complex)

        # Store components
        self._magnitude = np.abs(self._fft_shifted)
        self._phase = np.angle(self._fft_shifted)
        self._real = np.real(self._fft_shifted)
        self._imaginary = np.imag(self._fft_shifted)

    def _apply_adjustments(self, image: np.ndarray) -> np.ndarray:
        """Apply brightness and contrast to image."""
        adjusted = image * self._contrast + self._brightness
        return np.clip(adjusted, 0, 255)

    def get_spatial_image(self) -> np.ndarray:
        """Get the spatial domain image with adjustments."""
        return self._apply_adjustments(self._original)

    def get_magnitude(self) -> np.ndarray:
        """Get magnitude spectrum with adjustments."""
        # Log scale for better visualization
        mag_log = np.log1p(self._magnitude)
        normalized = (mag_log - mag_log.min()) / (mag_log.max() - mag_log.min() + 1e-10) * 255
        return self._apply_adjustments(normalized)

    def get_phase(self) -> np.ndarray:
        """Get phase spectrum with adjustments."""
        # Normalize phase to 0-255
        normalized = ((self._phase + np.pi) / (2 * np.pi)) * 255
        return self._apply_adjustments(normalized)

    def get_real(self) -> np.ndarray:
        """Get real component with adjustments."""
        real_range = self._real.max() - self._real.min()
        if real_range < 1e-10:
            normalized = np.zeros_like(self._real)
        else:
            normalized = (self._real - self._real.min()) / real_range * 255
        return self._apply_adjustments(normalized)

    def get_imaginary(self) -> np.ndarray:
        """Get imaginary component with adjustments."""
        imag_range = self._imaginary.max() - self._imaginary.min()
        if imag_range < 1e-10:
            normalized = np.zeros_like(self._imaginary)
        else:
            normalized = (self._imaginary - self._imaginary.min()) / imag_range * 255
        return self._apply_adjustments(normalized)

    def get_fft_component(self, component_type: str) -> np.ndarray:
        """Get raw FFT component for mixing (no visualization adjustments)."""
        components = {
            'magnitude': self._magnitude,
            'phase': self._phase,
            'real': self._real,
            'imaginary': self._imaginary
        }
        return components.get(component_type, self._magnitude)

    def set_brightness(self, value: float) -> None:
        """Set brightness adjustment."""
        self._brightness = value

    def set_contrast(self, value: float) -> None:
        """Set contrast adjustment."""
        self._contrast = max(0.1, value)

    @property
    def id(self) -> int:
        return self._id

    @property
    def shape(self) -> Tuple[int, int]:
        return (self._height, self._width)

    @property
    def width(self) -> int:
        return self._width

    @property
    def height(self) -> int:
        return self._height


class FrequencyRegion:
    """
    Represents a frequency region selection (inner/outer).

    PURPOSE:
    - Inner region (Low frequencies): Smooth shapes, overall structure, gradual changes
    - Outer region (High frequencies): Edges, details, textures, sharp transitions
    """

    def __init__(self, width: int, height: int):
        self._width = width
        self._height = height
        self._mask = np.ones((height, width), dtype=bool)
        self._region_type = 'all'  # 'inner', 'outer', 'all'
        self._region_size = 0.3  # Fraction of image (0.0 to 0.5)

    def set_inner_region(self, size: float) -> None:
        """
        Set inner (low frequency) region.

        Args:
            size: Radius as fraction of image (0.1 to 0.5)
                 0.1 = very small center (only lowest frequencies)
                 0.3 = medium center (good default)
                 0.5 = half the image (most frequencies)
        """
        self._region_type = 'inner'
        self._region_size = np.clip(size, 0.0, 0.5)
        self._create_mask()

    def set_outer_region(self, size: float) -> None:
        """
        Set outer (high frequency) region.

        Args:
            size: Inner radius to exclude (0.1 to 0.5)
                 0.1 = exclude small center (keep most frequencies)
                 0.3 = exclude medium center (good default)
                 0.5 = exclude half (only highest frequencies)
        """
        self._region_type = 'outer'
        self._region_size = np.clip(size, 0.0, 0.5)
        self._create_mask()

    def set_all_region(self) -> None:
        """Select all frequencies."""
        self._region_type = 'all'
        self._mask = np.ones((self._height, self._width), dtype=bool)

    def _create_mask(self) -> None:
        """Create circular mask for frequency region."""
        center_y, center_x = self._height // 2, self._width // 2
        radius = min(self._height, self._width) * self._region_size / 2

        # Create coordinate grids
        y, x = np.ogrid[:self._height, :self._width]
        distance = np.sqrt((x - center_x)**2 + (y - center_y)**2)

        if self._region_type == 'inner':
            # Low frequencies (center circle)
            self._mask = distance <= radius
        else:  # outer
            # High frequencies (outside circle)
            self._mask = distance > radius

    def apply_mask(self, fft_data: np.ndarray) -> np.ndarray:
        """Apply region mask to FFT data."""
        return fft_data * self._mask

    def get_mask(self) -> np.ndarray:
        """Get the mask for visualization."""
        return self._mask.astype(np.uint8) * 255


class ImageMixer:
    """
    Mixes Fourier components from multiple images.

    WEIGHT EXPLANATION:
    - Weight controls how much each image contributes to the final result
    - Range: 0.0 to 1.0
    - Example: If Image1 magnitude weight = 0.7 and Image2 magnitude weight = 0.3:
              Final magnitude = 70% from Image1 + 30% from Image2
    - You can mix different components from different images:
              - Magnitude from Image1 (shape/structure)
              - Phase from Image2 (position/location of features)
    """

    def __init__(self, images: list):
        """
        Initialize mixer with images.
        Args:
            images: List of ImageData objects
        """
        self._images = images
        self._validate_images()

        # Common size (smallest)
        self._target_height = min(img.height for img in images)
        self._target_width = min(img.width for img in images)

        # Region selector (shared across all images)
        self._region = FrequencyRegion(self._target_width, self._target_height)

        # Mix weights for each image and component
        self._mix_config = []
        for img in images:
            self._mix_config.append({
                'image_id': img.id,
                'component': 'magnitude',  # or 'phase', 'real', 'imaginary'
                'weight': 0.0
            })

    def _validate_images(self) -> None:
        """Ensure all images are valid."""
        if not self._images:
            raise ValueError("No images provided for mixing")

    def set_mix_weight(self, image_id: int, component: str, weight: float) -> None:
        """
        Set mixing weight for a specific image component.

        Args:
            image_id: ID of the image
            component: 'magnitude', 'phase', 'real', or 'imaginary'
            weight: 0.0 to 1.0 (how much this image contributes)
        """
        for config in self._mix_config:
            if config['image_id'] == image_id:
                config['component'] = component
                config['weight'] = np.clip(weight, 0.0, 1.0)
                break

    def set_region(self, region_type: str, size: float) -> None:
        """
        Set frequency region selection.

        Args:
            region_type: 'inner' (low freq), 'outer' (high freq), or 'all'
            size: Region size as fraction (0.1 to 0.5)
        """
        if region_type == 'inner':
            self._region.set_inner_region(size)
        elif region_type == 'outer':
            self._region.set_outer_region(size)
        else:
            self._region.set_all_region()

    def _resize_if_needed(self, image: ImageData) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Resize FFT components to target size."""
        if image.height == self._target_height and image.width == self._target_width:
            return (
                image.get_fft_component('magnitude'),
                image.get_fft_component('phase'),
                image.get_fft_component('real'),
                image.get_fft_component('imaginary')
            )

        # Crop/pad to center
        mag = self._resize_array(image.get_fft_component('magnitude'))
        phase = self._resize_array(image.get_fft_component('phase'))
        real = self._resize_array(image.get_fft_component('real'))
        imag = self._resize_array(image.get_fft_component('imaginary'))

        return mag, phase, real, imag

    def _resize_array(self, array: np.ndarray) -> np.ndarray:
        """Resize array by cropping or padding (center-aligned)."""
        h, w = array.shape
        th, tw = self._target_height, self._target_width

        # Create target array
        result = np.zeros((th, tw), dtype=array.dtype)

        # Calculate crop/pad regions
        h_start = max(0, (h - th) // 2)
        w_start = max(0, (w - tw) // 2)
        h_end = h_start + min(h, th)
        w_end = w_start + min(w, tw)

        r_h_start = max(0, (th - h) // 2)
        r_w_start = max(0, (tw - w) // 2)
        r_h_end = r_h_start + (h_end - h_start)
        r_w_end = r_w_start + (w_end - w_start)

        result[r_h_start:r_h_end, r_w_start:r_w_end] = array[h_start:h_end, w_start:w_end]

        return result

    def mix(self) -> np.ndarray:
        """
        Perform the mixing operation.

        PROCESS:
        1. Collect weighted magnitude and phase components from all images
        2. Apply frequency region mask (inner/outer/all)
        3. Combine: mixed_fft = magnitude * e^(i*phase)
        4. Inverse FFT to get spatial image
        5. Normalize and return

        Returns: Mixed spatial domain image (uint8)
        """
        # Initialize mixed FFT components
        mixed_magnitude = np.zeros((self._target_height, self._target_width), dtype=np.float64)
        mixed_phase = np.zeros((self._target_height, self._target_width), dtype=np.float64)

        total_mag_weight = 0.0
        total_phase_weight = 0.0

        # Accumulate weighted components
        for config in self._mix_config:
            if config['weight'] == 0.0:
                continue

            # Find corresponding image
            image = next((img for img in self._images if img.id == config['image_id']), None)
            if image is None:
                continue

            # Get resized components
            mag, phase, real, imag = self._resize_if_needed(image)

            # Apply region mask and accumulate
            if config['component'] == 'magnitude':
                masked = self._region.apply_mask(mag)
                mixed_magnitude += masked * config['weight']
                total_mag_weight += config['weight']

            elif config['component'] == 'phase':
                masked = self._region.apply_mask(phase)
                mixed_phase += masked * config['weight']
                total_phase_weight += config['weight']

        # Normalize by total weights
        if total_mag_weight > 0:
            mixed_magnitude /= total_mag_weight
        else:
            # If no magnitude specified, use uniform
            mixed_magnitude = np.ones_like(mixed_magnitude)

        if total_phase_weight > 0:
            mixed_phase /= total_phase_weight
        else:
            # If no phase specified, use zero phase
            mixed_phase = np.zeros_like(mixed_phase)

        # Reconstruct complex FFT: magnitude * e^(i*phase)
        mixed_fft = mixed_magnitude * np.exp(1j * mixed_phase)

        # Unshift and IFFT (OPTIMIZED with NumPy)
        unshifted = FourierTransform.unshift(mixed_fft)
        spatial = FourierTransform.ifft2d(unshifted)

        # Take real part and normalize
        result = np.real(spatial)

        # Normalize to 0-255
        result_min, result_max = result.min(), result.max()
        if result_max - result_min > 1e-10:
            result = (result - result_min) / (result_max - result_min) * 255
        else:
            result = np.zeros_like(result)

        return np.clip(result, 0, 255).astype(np.uint8)

    def get_region_mask(self) -> np.ndarray:
        """Get current region mask for visualization."""
        return self._region.get_mask()


class MixerManager:
    """High-level manager for the entire mixing system."""

    def __init__(self):
        self._images: Dict[int, ImageData] = {}
        self._next_id = 1
        self._mixer: Optional[ImageMixer] = None

    def add_image(self, image_bytes: bytes) -> int:
        """
        Add image from bytes.
        Returns: Image ID
        """
        # Load and convert to grayscale
        pil_image = Image.open(io.BytesIO(image_bytes)).convert('L')

        # Resize if too large (for performance)
        max_size = 512
        if max(pil_image.size) > max_size:
            pil_image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

        image_array = np.array(pil_image)

        # Create ImageData
        image_id = self._next_id
        self._next_id += 1

        self._images[image_id] = ImageData(image_array, image_id)

        # Recreate mixer with new images
        self._recreate_mixer()

        return image_id

    def remove_image(self, image_id: int) -> bool:
        """Remove an image."""
        if image_id in self._images:
            del self._images[image_id]
            self._recreate_mixer()
            return True
        return False

    def _recreate_mixer(self) -> None:
        """Recreate mixer with current images."""
        if self._images:
            self._mixer = ImageMixer(list(self._images.values()))

    def get_image_component(self, image_id: int, component: str) -> Optional[np.ndarray]:
        """Get specific component of an image."""
        if image_id not in self._images:
            return None

        image = self._images[image_id]

        component_methods = {
            'original': image.get_spatial_image,
            'magnitude': image.get_magnitude,
            'phase': image.get_phase,
            'real': image.get_real,
            'imaginary': image.get_imaginary
        }

        method = component_methods.get(component)
        if method:
            return method()
        return None

    def adjust_brightness_contrast(self, image_id: int, brightness: float, contrast: float) -> bool:
        """Adjust brightness and contrast for an image."""
        if image_id not in self._images:
            return False

        image = self._images[image_id]
        image.set_brightness(brightness)
        image.set_contrast(contrast)
        return True

    def set_mix_config(self, mix_configs: list) -> None:
        """Set mixing configuration."""
        if self._mixer is None:
            return

        for config in mix_configs:
            self._mixer.set_mix_weight(
                config['image_id'],
                config['component'],
                config['weight']
            )

    def set_region(self, region_type: str, size: float) -> None:
        """Set frequency region."""
        if self._mixer:
            self._mixer.set_region(region_type, size)

    def perform_mix(self) -> Optional[np.ndarray]:
        """Perform mixing operation."""
        if self._mixer is None:
            return None

        return self._mixer.mix()

    def get_region_mask(self) -> Optional[np.ndarray]:
        """Get region mask."""
        if self._mixer:
            return self._mixer.get_region_mask()
        return None

    def get_image_info(self, image_id: int) -> Optional[Dict[str, Any]]:
        """Get image information."""
        if image_id not in self._images:
            return None

        image = self._images[image_id]
        return {
            'id': image.id,
            'width': image.width,
            'height': image.height
        }

    def list_images(self) -> list:
        """List all loaded images."""
        return [
            {'id': img.id, 'width': img.width, 'height': img.height}
            for img in self._images.values()
        ]