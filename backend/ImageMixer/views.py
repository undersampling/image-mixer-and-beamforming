from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import numpy as np
import cv2
import logging

from ImageMixer.services.controller import Controller
from ImageMixer.services.modes_enum import Mode, RegionMode
from ImageMixer.serializers import (
    ImageUploadSerializer,
    MixRequestSerializer,
    BrightnessContrastSerializer,
    ImageModeSerializer,
    numpy_to_base64
)

# Global controller instance (in production, use session-based or user-based controllers)
controller = Controller()

logger = logging.getLogger(__name__)


def image_to_numpy(image_file):
    """Convert uploaded image file to numpy array."""
    image_bytes = image_file.read()
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return image


@api_view(['POST'])
def upload_image(request):
    """Upload and process an image."""
    serializer = ImageUploadSerializer(data=request.data)
    
    if serializer.is_valid():
        image_file = serializer.validated_data['image']
        image_index = serializer.validated_data['image_index']
        
        try:
            image_data = image_to_numpy(image_file)
            controller.add_image(image_data, image_index)
            controller.update_image_processing()
            
            # Return the processed image
            image = controller.list_of_images[image_index]
            image_base64 = numpy_to_base64(image.modified_image[2])
            
            return Response({
                'success': True,
                'image_index': image_index,
                'image_data': image_base64,
                'message': 'Image uploaded and processed successfully'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error processing image: {e}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def get_image_component(request, image_index, component_type):
    """Get a specific component (magnitude, phase, real, imaginary) of an image."""
    try:
        image_index = int(image_index)
        if not (0 <= image_index < 4):
            return Response({
                'error': 'Invalid image index'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        image = controller.list_of_images[image_index]
        if not image.loaded:
            return Response({
                'error': 'Image not loaded'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        controller.update_image_processing()
        
        if component_type == 'magnitude':
            component = image.modified_image_fourier_components_mag.T
            processed_image = np.log1p(component)
        elif component_type == 'phase':
            component = image.modified_image_fourier_components_phase.T
            processed_image = (component + np.pi) * (255.0 / (2 * np.pi))
        elif component_type == 'real':
            component = image.modified_image_fourier_components_real
            processed_image = np.log1p(np.clip(component, 1e-10, None))
        elif component_type == 'imaginary':
            component = image.modified_image_fourier_components_imag
            processed_image = np.log1p(np.clip(component, 1e-10, None))
        else:
            return Response({
                'error': 'Invalid component type'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Normalize
        normalized = (processed_image - np.min(processed_image)) * (255.0 / (np.max(processed_image) - np.min(processed_image)))
        normalized = normalized.astype(np.uint8)
        
        image_base64 = numpy_to_base64(normalized)
        
        return Response({
            'success': True,
            'image_index': image_index,
            'component_type': component_type,
            'image_data': image_base64
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting component: {e}", exc_info=True)
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def mix_images(request):
    """Mix images based on weights and region mode."""
    serializer = MixRequestSerializer(data=request.data)
    
    if serializer.is_valid():
        weights = serializer.validated_data['weights']
        boundaries = serializer.validated_data['boundaries']
        region_mode_str = serializer.validated_data['region_mode']
        output_viewer = serializer.validated_data['output_viewer']
        current_mode_str = serializer.validated_data.get('current_mode', 'MAGNITUDE_PHASE')
        
        try:
            # Convert string to enum
            region_mode = RegionMode[region_mode_str.upper()]
            current_mode = Mode[current_mode_str.upper()]
            
            controller.Mixer.current_mode = current_mode
            controller.image_weights = weights
            controller.set_roi_boundaries(boundaries)
            controller.update_image_processing()
            
            result = controller.mix_all(output_viewer, region_mode)
            image_base64 = numpy_to_base64(result)
            
            return Response({
                'success': True,
                'output_viewer': output_viewer,
                'image_data': image_base64
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error mixing images: {e}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def adjust_brightness_contrast(request):
    """Adjust brightness and contrast of an image."""
    serializer = BrightnessContrastSerializer(data=request.data)
    
    if serializer.is_valid():
        image_index = serializer.validated_data['image_index']
        brightness = serializer.validated_data['brightness']
        contrast = serializer.validated_data['contrast']
        
        try:
            controller.adjust_brightness_contrast(image_index, brightness, contrast)
            controller.update_image_processing()
            
            image = controller.list_of_images[image_index]
            image_base64 = numpy_to_base64(image.modified_image[2])
            
            return Response({
                'success': True,
                'image_index': image_index,
                'image_data': image_base64
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error adjusting brightness/contrast: {e}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def reset_brightness_contrast(request):
    """Reset brightness and contrast of an image to original."""
    image_index = request.data.get('image_index')
    
    if image_index is None:
        return Response({
            'success': False,
            'error': 'image_index is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        image_index = int(image_index)
        if not (0 <= image_index < 4):
            return Response({
                'success': False,
                'error': 'Invalid image index'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        controller.reset_brightness_contrast(image_index)
        
        image = controller.list_of_images[image_index]
        image_base64 = numpy_to_base64(image.modified_image[2])
        
        return Response({
            'success': True,
            'image_index': image_index,
            'image_data': image_base64
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error resetting brightness/contrast: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def set_image_mode(request):
    """Set the mode (magnitude/phase/real/imaginary) for an image."""
    serializer = ImageModeSerializer(data=request.data)
    
    if serializer.is_valid():
        image_index = serializer.validated_data['image_index']
        mode_str = serializer.validated_data['mode']
        
        try:
            mode = Mode[mode_str.upper()]
            controller.Mixer.images_modes[image_index] = mode
            
            return Response({
                'success': True,
                'image_index': image_index,
                'mode': mode_str
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error setting image mode: {e}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def set_mixing_mode(request):
    """Set the overall mixing mode (MAGNITUDE_PHASE or REAL_IMAGINARY)."""
    mode_str = request.data.get('mode', 'MAGNITUDE_PHASE')
    
    try:
        mode = Mode[mode_str.upper()]
        controller.Mixer.current_mode = mode
        
        return Response({
            'success': True,
            'mode': mode_str
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error setting mixing mode: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_image(request, image_index):
    """Get the current state of an image."""
    try:
        image_index = int(image_index)
        if not (0 <= image_index < 4):
            return Response({
                'error': 'Invalid image index'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        image = controller.list_of_images[image_index]
        if not image.loaded:
            return Response({
                'error': 'Image not loaded'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        image_base64 = numpy_to_base64(image.modified_image[2])
        
        return Response({
            'success': True,
            'image_index': image_index,
            'image_data': image_base64
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting image: {e}", exc_info=True)
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

