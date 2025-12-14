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

// LocalStorage keys
const STORAGE_KEYS = {
  CONFIG: "simulator_config",
  CURRENT_SCENARIO: "simulator_current_scenario",
  LAST_SAVE: "simulator_last_save_time",
};

export function SimulatorProvider({ children }) {
  const [scenarios, setScenarios] = useState([]);
  const [currentScenario, setCurrentScenario] = useState(null);
  const [config, setConfig] = useState(null);
  const [results, setResults] = useState(null);
  const [lastSaveTime, setLastSaveTime] = useState(
    localStorage.getItem(STORAGE_KEYS.LAST_SAVE) || null
  );
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const hasInitialized = useRef(false);

  // Debounce config changes for real-time updates and auto-saving
  const debouncedConfig = useDebounce(config, 400);

  // Keep track of last saved config string to detect unsaved changes
  const lastSavedRef = useRef(null);
  const isDirtyRef = useRef(false);

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

  // Save current scenario (auto-save to backend)
  const saveScenario = useCallback(
    async (scenarioId) => {
      if (!config || !scenarioId) return;
      try {
        await apiService.saveScenario(scenarioId, config);
        // Update last save time and mark saved
        const now = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.LAST_SAVE, now);
        setLastSaveTime(now);
        lastSavedRef.current = JSON.stringify(config);
        isDirtyRef.current = false;
      } catch (err) {
        console.error("Auto-save error:", err);
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

  // Save config to localStorage whenever it changes
  useEffect(() => {
    if (config) {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    }
  }, [config]);

  // Track dirty state by comparing current config to last saved copy
  useEffect(() => {
    if (!config) return;
    try {
      const str = JSON.stringify(config);
      isDirtyRef.current = lastSavedRef.current !== str;
    } catch (e) {
      isDirtyRef.current = true;
    }
  }, [config]);

  // Save current scenario to localStorage
  useEffect(() => {
    if (currentScenario) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SCENARIO, currentScenario);
    }
  }, [currentScenario]);

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

  // Auto-save to backend when config changes (debounced)
  useEffect(() => {
    if (debouncedConfig && currentScenario) {
      // Delay the auto-save slightly to avoid too many concurrent requests
      const timer = setTimeout(() => {
        saveScenario(currentScenario);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [debouncedConfig, currentScenario, saveScenario]);

  // Ensure a final save attempt when the user refreshes/closes the page.
  // Uses `fetch` with `keepalive: true` and falls back to `navigator.sendBeacon`.
  useEffect(() => {
    const handler = () => {
      try {
        if (!currentScenario || !config) return;
        const currentJson = JSON.stringify(config);
        if (lastSavedRef.current === currentJson) return; // nothing to do

        const url = `/api/scenarios/${currentScenario}/`;

        // Try fetch with keepalive (preferred for PUT)
        try {
          // Fire-and-forget; browsers will attempt to complete keepalive requests
          fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: currentJson,
            keepalive: true,
          });
        } catch (e) {
          // Fallback to sendBeacon (POST may be accepted by server)
          try {
            const blob = new Blob([currentJson], { type: "application/json" });
            if (navigator.sendBeacon) navigator.sendBeacon(url, blob);
          } catch (e2) {
            // swallow
          }
        }

        // Always persist locally as a final fallback
        localStorage.setItem(STORAGE_KEYS.CONFIG, currentJson);
        const now = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.LAST_SAVE, now);
        setLastSaveTime(now);
      } catch (e) {
        // ignore unload errors
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [currentScenario, config]);

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

        // Check if we have saved state in localStorage
        const savedScenarioId = localStorage.getItem(
          STORAGE_KEYS.CURRENT_SCENARIO
        );
        const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);

        let scenarioIdToLoad = savedScenarioId;
        let shouldUseLocalStorage = false;

        // If we have saved state and the scenario still exists in loaded scenarios, use it
        if (
          savedScenarioId &&
          savedConfig &&
          scenariosData.some((s) => s.id === savedScenarioId)
        ) {
          scenarioIdToLoad = savedScenarioId;
          shouldUseLocalStorage = true;
        } else {
          // Otherwise use first scenario
          scenarioIdToLoad =
            scenariosData && scenariosData.length > 0
              ? scenariosData[0].id
              : null;
        }

        // Load and set the scenario
        if (scenarioIdToLoad && scenariosData.length > 0) {
          try {
            let data;
            if (shouldUseLocalStorage) {
              // Use saved config from localStorage
              data = JSON.parse(savedConfig);
            } else {
              // Fetch fresh from backend
              data = await apiService.getScenario(scenarioIdToLoad);
            }

            // --- Loaded scenario data ---

            setCurrentScenario(scenarioIdToLoad);
            setConfig(data);
            setError(null);
            // If we loaded from backend, treat that as already-saved state
            if (!shouldUseLocalStorage) {
              try {
                lastSavedRef.current = JSON.stringify(data);
                const last = localStorage.getItem(STORAGE_KEYS.LAST_SAVE);
                if (last) setLastSaveTime(last);
              } catch (e) {
                lastSavedRef.current = null;
              }
            }
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
    lastSaveTime,
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