import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { apiService } from "../services/api";
import { useDebounce } from "../hooks/useDebounce";

const SimulatorContext = createContext(null);

export function SimulatorProvider({ children }) {
  const [scenarios, setScenarios] = useState([]);
  const [currentScenario, setCurrentScenario] = useState(null);
  const [config, setConfig] = useState(null);
  const [results, setResults] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const hasInitialized = useRef(false);

  // Debounce config changes for real-time updates
  const debouncedConfig = useDebounce(config, 400);

  // Load scenarios list
  const loadScenarios = useCallback(async () => {
    try {
      const data = await apiService.getScenarios();
      setScenarios(data);
      return data;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  // Load media list
  const loadMedia = useCallback(async () => {
    try {
      const data = await apiService.getMedia();
      setMedia(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Load a scenario
  const loadScenario = useCallback(async (scenarioId) => {
    try {
      setLoading(true);
      const data = await apiService.getScenario(scenarioId);
      setCurrentScenario(scenarioId);
      setConfig(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save current scenario
  const saveScenario = useCallback(
    async (scenarioId) => {
      if (!config) return;
      try {
        await apiService.saveScenario(scenarioId, config);
      } catch (err) {
        setError(err.message);
      }
    },
    [config]
  );

  // Reset scenario to default
  const resetScenario = useCallback(async (scenarioId) => {
    try {
      setLoading(true);
      const data = await apiService.resetScenario(scenarioId);
      setConfig(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update config
  const updateConfig = useCallback((updates) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
  }, []);

  // Update array in config
  const updateArray = useCallback((arrayId, updates) => {
    setConfig((prev) => {
      if (!prev || !prev.arrays) return prev;
      const arrays = prev.arrays.map((arr) =>
        arr.id === arrayId ? { ...arr, ...updates } : arr
      );
      return { ...prev, arrays };
    });
  }, []);

  // Add array
  const addArray = useCallback((arrayConfig) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const arrays = [...(prev.arrays || []), arrayConfig];
      return { ...prev, arrays };
    });
  }, []);

  // Remove array
  const removeArray = useCallback((arrayId) => {
    setConfig((prev) => {
      if (!prev || !prev.arrays) return prev;
      const arrays = prev.arrays.filter((arr) => arr.id !== arrayId);
      return { ...prev, arrays };
    });
  }, []);

  // Calculate results
  const calculate = useCallback(async () => {
    if (!debouncedConfig) return;
    try {
      setLoading(true);
      const data = await apiService.calculate(debouncedConfig);
      setResults(data);
      setError(null);
    } catch (err) {
      console.error("Calculation error:", err);
      setError(err.message);
      // If we're initializing and calculation fails, still mark as done to avoid stuck state
      if (initializing) {
        setInitializing(false);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedConfig, initializing]);

  // Calculate when config changes (debounced)
  useEffect(() => {
    if (
      debouncedConfig &&
      debouncedConfig.arrays &&
      debouncedConfig.arrays.length > 0
    ) {
      calculate();
    }
  }, [debouncedConfig, calculate]);

  // Mark initialization as complete when we have results for the first time
  useEffect(() => {
    if (initializing && results && config) {
      setInitializing(false);
    }
  }, [initializing, results, config]);

  // Fallback: if initializing takes too long, set it to false (safety timeout)
  useEffect(() => {
    if (initializing) {
      const timeout = setTimeout(() => {
        console.warn("Initialization timeout - setting initializing to false");
        setInitializing(false);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [initializing]);

  // Load initial data and auto-load first scenario
  useEffect(() => {
    if (hasInitialized.current) return;

    const initialize = async () => {
      hasInitialized.current = true;
      setInitializing(true);
      
      try {
        await loadMedia();
        const scenariosData = await loadScenarios();

        // Auto-load first scenario if available
        if (scenariosData && scenariosData.length > 0) {
          const firstScenarioId = scenariosData[0].id;
          try {
            const data = await apiService.getScenario(firstScenarioId);
            setCurrentScenario(firstScenarioId);
            setConfig(data);
            setError(null);
            
            // Trigger immediate calculation for initial load (don't wait for debounce)
            try {
              setLoading(true);
              const resultsData = await apiService.calculate(data);
              setResults(resultsData);
              setInitializing(false);
              setLoading(false);
            } catch (calcErr) {
              console.error("Initial calculation error:", calcErr);
              setError(calcErr.message);
              setInitializing(false);
              setLoading(false);
            }
          } catch (scenarioErr) {
            setError(scenarioErr.message);
            setInitializing(false);
          }
        } else {
          setInitializing(false);
        }
      } catch (err) {
        setError(err.message);
        setInitializing(false);
      }
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const value = {
    scenarios,
    currentScenario,
    config,
    results,
    media,
    loading,
    initializing,
    error,
    loadScenario,
    saveScenario,
    resetScenario,
    updateConfig,
    updateArray,
    addArray,
    removeArray,
    calculate,
  };

  return (
    <SimulatorContext.Provider value={value}>
      {children}
    </SimulatorContext.Provider>
  );
}

export function useSimulator() {
  const context = useContext(SimulatorContext);
  if (!context) {
    throw new Error("useSimulator must be used within SimulatorProvider");
  }
  return context;
}

