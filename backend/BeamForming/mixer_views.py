"""
Mixer API Views with async processing and progress tracking
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import base64
import numpy as np
from PIL import Image
import io
import threading
import uuid
import time
from typing import Dict, Optional
from .engine.image_processor import MixerManager


# Global storage for mixer sessions and operations
_mixer_sessions: Dict[str, MixerManager] = {}
_mixing_operations: Dict[str, Dict] = {}
_operation_lock = threading.Lock()


def _array_to_base64(array: np.ndarray) -> str:
    """Convert numpy array to base64 encoded PNG."""
    if array is None:
        return None

    # Ensure uint8
    if array.dtype != np.uint8:
        array = np.clip(array, 0, 255).astype(np.uint8)

    # Convert to PIL Image
    image = Image.fromarray(array)

    # Save to bytes
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    buffer.seek(0)

    # Encode to base64
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


def _get_or_create_session(session_id: Optional[str] = None) -> tuple:
    """Get existing session or create new one."""
    if session_id and session_id in _mixer_sessions:
        return session_id, _mixer_sessions[session_id]

    new_session_id = str(uuid.uuid4())
    _mixer_sessions[new_session_id] = MixerManager()
    return new_session_id, _mixer_sessions[new_session_id]


@csrf_exempt
@require_http_methods(["POST"])
def upload_image(request):
    """Upload and process an image."""
    try:
        # Parse request body
        data = json.loads(request.body)
        session_id = data.get('session_id')
        image_data = data.get('image_data')  # base64 encoded

        print(f"\n=== IMAGE UPLOAD REQUEST ===")
        print(f"Session ID: {session_id}")
        print(f"Image data length: {len(image_data) if image_data else 0}")

        if not image_data:
            return JsonResponse({'error': 'No image data provided'}, status=400)

        # Remove data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
            print(f"Removed data URL prefix, new length: {len(image_data)}")

        # Decode base64
        try:
            image_bytes = base64.b64decode(image_data)
            print(f"Decoded image bytes: {len(image_bytes)} bytes")
        except Exception as e:
            print(f"Base64 decode error: {e}")
            return JsonResponse({'error': f'Invalid base64 data: {str(e)}'}, status=400)

        # Get or create session
        session_id, manager = _get_or_create_session(session_id)
        print(f"Using session: {session_id}")

        # Add image
        try:
            image_id = manager.add_image(image_bytes)
            print(f"Image added with ID: {image_id}")
        except Exception as e:
            print(f"Error adding image: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': f'Failed to process image: {str(e)}'}, status=500)

        # Get image info
        info = manager.get_image_info(image_id)
        print(f"Image info: {info}")
        print(f"=== UPLOAD SUCCESSFUL ===\n")

        return JsonResponse({
            'session_id': session_id,
            'image_id': image_id,
            'info': info
        })

    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        return JsonResponse({'error': 'Invalid JSON in request body'}, status=400)

    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def get_image_component(request):
    """Get specific component of an image."""
    try:
        session_id = request.GET.get('session_id')
        image_id = int(request.GET.get('image_id'))
        component = request.GET.get('component', 'original')

        if not session_id or session_id not in _mixer_sessions:
            return JsonResponse({'error': 'Invalid session'}, status=400)

        manager = _mixer_sessions[session_id]

        # Get component
        array = manager.get_image_component(image_id, component)

        if array is None:
            return JsonResponse({'error': 'Image or component not found'}, status=404)

        # Convert to base64
        image_base64 = _array_to_base64(array)

        return JsonResponse({
            'image_data': image_base64,
            'component': component
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def adjust_image(request):
    """Adjust brightness and contrast of an image."""
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        image_id = data.get('image_id')
        brightness = data.get('brightness', 0.0)
        contrast = data.get('contrast', 1.0)

        if not session_id or session_id not in _mixer_sessions:
            return JsonResponse({'error': 'Invalid session'}, status=400)

        manager = _mixer_sessions[session_id]

        success = manager.adjust_brightness_contrast(image_id, brightness, contrast)

        if not success:
            return JsonResponse({'error': 'Image not found'}, status=404)

        return JsonResponse({'success': True})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def remove_image(request):
    """Remove an image from the session."""
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        image_id = data.get('image_id')

        if not session_id or session_id not in _mixer_sessions:
            return JsonResponse({'error': 'Invalid session'}, status=400)

        manager = _mixer_sessions[session_id]
        success = manager.remove_image(image_id)

        if not success:
            return JsonResponse({'error': 'Image not found'}, status=404)

        return JsonResponse({'success': True})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def list_images(request):
    """List all images in session."""
    try:
        session_id = request.GET.get('session_id')

        if not session_id or session_id not in _mixer_sessions:
            return JsonResponse({'error': 'Invalid session'}, status=400)

        manager = _mixer_sessions[session_id]
        images = manager.list_images()

        return JsonResponse({'images': images})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def _perform_mixing_async(operation_id: str, manager: MixerManager, mix_configs: list, region_type: str, region_size: float):
    """Perform mixing in background thread."""
    try:
        # Update progress
        with _operation_lock:
            _mixing_operations[operation_id]['status'] = 'processing'
            _mixing_operations[operation_id]['progress'] = 0.2

        # Set configuration
        manager.set_mix_config(mix_configs)
        manager.set_region(region_type, region_size)

        with _operation_lock:
            _mixing_operations[operation_id]['progress'] = 0.5

        # Perform mix
        result = manager.perform_mix()

        with _operation_lock:
            _mixing_operations[operation_id]['progress'] = 0.9

        # Convert to base64
        result_base64 = _array_to_base64(result)

        # Get region mask
        mask = manager.get_region_mask()
        mask_base64 = _array_to_base64(mask)

        # Store result
        with _operation_lock:
            _mixing_operations[operation_id].update({
                'status': 'completed',
                'progress': 1.0,
                'result': result_base64,
                'mask': mask_base64,
                'completed_at': time.time()
            })

    except Exception as e:
        with _operation_lock:
            _mixing_operations[operation_id].update({
                'status': 'failed',
                'error': str(e),
                'completed_at': time.time()
            })


@csrf_exempt
@require_http_methods(["POST"])
def start_mixing(request):
    """Start mixing operation (async)."""
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        mix_configs = data.get('mix_configs', [])
        region_type = data.get('region_type', 'all')
        region_size = data.get('region_size', 0.3)

        if not session_id or session_id not in _mixer_sessions:
            return JsonResponse({'error': 'Invalid session'}, status=400)

        manager = _mixer_sessions[session_id]

        # Create operation ID
        operation_id = str(uuid.uuid4())

        # Initialize operation
        with _operation_lock:
            _mixing_operations[operation_id] = {
                'status': 'starting',
                'progress': 0.0,
                'started_at': time.time()
            }

        # Start background thread
        thread = threading.Thread(
            target=_perform_mixing_async,
            args=(operation_id, manager, mix_configs, region_type, region_size)
        )
        thread.daemon = True
        thread.start()

        return JsonResponse({
            'operation_id': operation_id,
            'status': 'started'
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def get_mixing_progress(request):
    """Get progress of mixing operation."""
    try:
        operation_id = request.GET.get('operation_id')

        if not operation_id:
            return JsonResponse({'error': 'No operation_id provided'}, status=400)

        with _operation_lock:
            if operation_id not in _mixing_operations:
                return JsonResponse({'error': 'Operation not found'}, status=404)

            operation = _mixing_operations[operation_id].copy()

        return JsonResponse(operation)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def cancel_mixing(request):
    """Cancel mixing operation."""
    try:
        data = json.loads(request.body)
        operation_id = data.get('operation_id')

        if not operation_id:
            return JsonResponse({'error': 'No operation_id provided'}, status=400)

        with _operation_lock:
            if operation_id in _mixing_operations:
                _mixing_operations[operation_id].update({
                    'status': 'cancelled',
                    'completed_at': time.time()
                })
                return JsonResponse({'success': True})
            else:
                return JsonResponse({'error': 'Operation not found'}, status=404)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def clear_session(request):
    """Clear a session."""
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')

        if session_id and session_id in _mixer_sessions:
            del _mixer_sessions[session_id]

        return JsonResponse({'success': True})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)