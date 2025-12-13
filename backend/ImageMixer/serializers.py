from rest_framework import serializers
import base64
import numpy as np
import cv2


class ImageUploadSerializer(serializers.Serializer):
    """Serializer for image upload."""
    image = serializers.ImageField()
    image_index = serializers.IntegerField(min_value=0, max_value=3)


class ImageComponentSerializer(serializers.Serializer):
    """Serializer for image component data."""
    image_data = serializers.CharField()
    component_type = serializers.CharField()
    image_index = serializers.IntegerField()


class MixRequestSerializer(serializers.Serializer):
    """Serializer for mixing request."""
    weights = serializers.ListField(
        child=serializers.FloatField(min_value=0, max_value=100),
        min_length=4,
        max_length=4
    )
    boundaries = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=4,
        max_length=4
    )
    region_mode = serializers.CharField()
    output_viewer = serializers.IntegerField(min_value=0, max_value=1)
    current_mode = serializers.CharField()


class BrightnessContrastSerializer(serializers.Serializer):
    """Serializer for brightness/contrast adjustment."""
    image_index = serializers.IntegerField(min_value=0, max_value=3)
    brightness = serializers.FloatField()
    contrast = serializers.FloatField()


class ImageModeSerializer(serializers.Serializer):
    """Serializer for setting image mode."""
    image_index = serializers.IntegerField(min_value=0, max_value=3)
    mode = serializers.CharField()


def numpy_to_base64(image_array):
    """Convert numpy array to base64 encoded string."""
    if image_array.dtype != np.uint8:
        image_array = cv2.normalize(image_array, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    
    _, buffer = cv2.imencode('.png', image_array)
    image_base64 = base64.b64encode(buffer).decode('utf-8')
    return image_base64


def base64_to_numpy(image_base64):
    """Convert base64 encoded string to numpy array."""
    image_bytes = base64.b64decode(image_base64)
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        # Try grayscale if color fails
        image = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    return image

