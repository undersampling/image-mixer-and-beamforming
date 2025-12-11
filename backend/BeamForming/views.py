"""
API views for beamforming simulator.
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import traceback # IMPORTED FOR DEBUGGING
from .engine.simulator import BeamformingSimulator
from .engine.scenario_manager import ScenarioManager


@csrf_exempt
@require_http_methods(["POST"])
def calculate(request):
    """Calculate beamforming results."""
    try:
        data = json.loads(request.body)
        
        # Create simulator from request data
        simulator = BeamformingSimulator(data)
        
        # Calculate results
        results = simulator.calculate()
        
        return JsonResponse(results)
    
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)

    except Exception as e:
        # --- DEBUG LOGGING ---
        print("\n\n!!! CALCULATION ERROR !!!")
        print(f"Error Message: {str(e)}")
        print("Traceback:")
        traceback.print_exc()
        print("!!! END ERROR !!!\n\n")
        # ---------------------
        
        # Return 500 for internal errors so the frontend knows it crashed
        # Return 400 only if it's a known validation error (e.g. ValueError)
        status_code = 400 if isinstance(e, ValueError) else 500
        return JsonResponse({'error': str(e)}, status=status_code)


@require_http_methods(["GET"])
def scenario_list(request):
    """Get list of available scenarios."""
    try:
        manager = ScenarioManager()
        scenarios = manager.get_scenario_list()
        return JsonResponse(scenarios, safe=False)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET", "PUT"])
def scenario_detail(request, scenario_id):
    """Get or update a scenario."""
    manager = ScenarioManager()
    
    if request.method == 'GET':
        try:
            scenario = manager.load_scenario(scenario_id)
            return JsonResponse(scenario)
        except FileNotFoundError:
            return JsonResponse({'error': 'Scenario not found'}, status=404)
        except Exception as e:
            traceback.print_exc()
            return JsonResponse({'error': str(e)}, status=500)
    
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            success = manager.save_scenario(scenario_id, data)
            if success:
                return JsonResponse({'success': True})
            else:
                return JsonResponse({'error': 'Invalid scenario data'}, status=400)
        except Exception as e:
            traceback.print_exc()
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def reset_scenario(request, scenario_id):
    """Reset scenario to default."""
    manager = ScenarioManager()
    try:
        scenario = manager.reset_scenario(scenario_id)
        return JsonResponse(scenario)
    except FileNotFoundError:
        return JsonResponse({'error': 'Scenario not found'}, status=404)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def reset_all_scenarios(request):
    """Reset all scenarios to defaults."""
    manager = ScenarioManager()
    try:
        success = manager.reset_all_scenarios()
        if success:
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'error': 'Failed to reset scenarios'}, status=500)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def media_list(request):
    """Get list of available media."""
    media = [
        {'name': 'air', 'speed': 343},
        {'name': 'water', 'speed': 1480},
        {'name': 'soft_tissue', 'speed': 1540},
        {'name': 'muscle', 'speed': 1580},
        {'name': 'fat', 'speed': 1450},
        {'name': 'bone', 'speed': 3500},
    ]
    return JsonResponse(media, safe=False)