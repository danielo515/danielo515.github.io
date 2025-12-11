import { Calculator, Plus, Trash2, Undo } from "lucide-react";
import { useEffect, useState } from "react";

type Pricing = {
  id: number;
  name: string;
  inputCost: number;
  outputCost: number;
  deleted: boolean;
};

export default function TokenCostCalculator() {
  const [pricings, setPricings] = useState<Pricing[]>(() => {
    const saved = localStorage.getItem("tokenCalcPricings");
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            name: "Claude Sonnet 4",
            inputCost: 3,
            outputCost: 15,
            deleted: false,
          },
        ];
  });
  const [inputTokens, setInputTokens] = useState(() => {
    return localStorage.getItem("tokenCalcInput") || "";
  });
  const [outputTokens, setOutputTokens] = useState(() => {
    return localStorage.getItem("tokenCalcOutput") || "";
  });
  const [inputUnit, setInputUnit] = useState(() => {
    return localStorage.getItem("tokenCalcInputUnit") || "thousands";
  });
  const [outputUnit, setOutputUnit] = useState(() => {
    return localStorage.getItem("tokenCalcOutputUnit") || "thousands";
  });
  const [nextId, setNextId] = useState(() => {
    const saved = localStorage.getItem("tokenCalcNextId");
    return saved ? parseInt(saved) : 2;
  });
  const [deleteMode, setDeleteMode] = useState(false);
  const [recentlyDeleted, setRecentlyDeleted] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem("tokenCalcPricings", JSON.stringify(pricings));
  }, [pricings]);

  useEffect(() => {
    localStorage.setItem("tokenCalcInput", inputTokens);
  }, [inputTokens]);

  useEffect(() => {
    localStorage.setItem("tokenCalcOutput", outputTokens);
  }, [outputTokens]);

  useEffect(() => {
    localStorage.setItem("tokenCalcInputUnit", inputUnit);
  }, [inputUnit]);

  useEffect(() => {
    localStorage.setItem("tokenCalcOutputUnit", outputUnit);
  }, [outputUnit]);

  useEffect(() => {
    localStorage.setItem("tokenCalcNextId", nextId.toString());
  }, [nextId]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N to add model
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        addPricing();
      }
      // Ctrl/Cmd + D to toggle delete mode
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        setDeleteMode((prev) => !prev);
      }
      // Escape to exit delete mode
      if (e.key === "Escape" && deleteMode) {
        setDeleteMode(false);
      }
      // Letter keys in delete mode
      if (deleteMode && e.key.match(/^[a-z]$/i)) {
        const index = e.key.toLowerCase().charCodeAt(0) - 97;
        const visiblePricings = pricings.filter((p) => !p.deleted);
        if (index < visiblePricings.length && visiblePricings.length > 1) {
          markAsDeleted(visiblePricings[index]?.id ?? null);
          setDeleteMode(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteMode, pricings]);

  const addPricing = () => {
    // Check if a model with this ID exists in localStorage
    const existing = pricings.find((p) => p.id === nextId);

    if (existing) {
      // Restore existing model
      setPricings(
        pricings.map((p) => (p.id === nextId ? { ...p, deleted: false } : p))
      );
    } else {
      // Create new model
      setPricings([
        ...pricings,
        {
          id: nextId,
          name: `Model ${nextId}`,
          inputCost: 0,
          outputCost: 0,
          deleted: false,
        },
      ]);
    }
    setNextId(nextId + 1);
  };

  const markAsDeleted = (id: number | null) => {
    if (id === null) return;
    setPricings(
      pricings.map((p) => (p.id === id ? { ...p, deleted: true } : p))
    );
    setRecentlyDeleted(id);

    // Set 5 second timer to clear undo option
    setTimeout(() => {
      setRecentlyDeleted((prev) => (prev === id ? null : prev));
    }, 5000);
  };

  const undoDelete = () => {
    if (recentlyDeleted) {
      setPricings(
        pricings.map((p) =>
          p.id === recentlyDeleted ? { ...p, deleted: false } : p
        )
      );
      setRecentlyDeleted(null);
    }
  };

  const updatePricing = (id: number, field: string, value: string | number) => {
    setPricings(
      pricings.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const calculateCost = (pricing: Pricing) => {
    const tokens = parseFloat(inputTokens) || 0;
    const outputTokensVal = parseFloat(outputTokens) || 0;

    const inputInThousands = inputUnit === "millions" ? tokens * 1000 : tokens;
    const outputInThousands =
      outputUnit === "millions" ? outputTokensVal * 1000 : outputTokensVal;

    const inputCost = (pricing.inputCost * inputInThousands) / 1000;
    const outputCost = (pricing.outputCost * outputInThousands) / 1000;
    const totalCost = inputCost + outputCost;
    return { inputCost, outputCost, totalCost };
  };

  const toggleInputUnit = () => {
    setInputUnit((prev) => (prev === "thousands" ? "millions" : "thousands"));
  };

  const toggleOutputUnit = () => {
    setOutputUnit((prev) => (prev === "thousands" ? "millions" : "thousands"));
  };

  const visiblePricings = pricings.filter((p) => !p.deleted);
  const getDeleteKey = (index: number) =>
    String.fromCharCode(97 + index).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-800">
                Token Cost Calculator
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {recentlyDeleted && (
                <button
                  onClick={undoDelete}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  <Undo className="w-4 h-4" />
                  Undo Delete
                </button>
              )}
              <button
                onClick={addPricing}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                title="Add Model (Ctrl+N)"
              >
                <Plus className="w-4 h-4" />
                Add (Ctrl+N)
              </button>
              <button
                onClick={() => setDeleteMode(!deleteMode)}
                className={`flex items-center gap-1 px-3 py-1 text-sm rounded ${
                  deleteMode
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                title="Delete Mode (Ctrl+D)"
              >
                <Trash2 className="w-4 h-4" />
                {deleteMode ? "Cancel (Esc)" : "Delete (Ctrl+D)"}
              </button>
            </div>
          </div>

          {/* Usage Section */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-green-50 rounded">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Input ({inputUnit === "thousands" ? "K" : "M"})
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.001"
                  value={inputTokens}
                  onChange={(e) => setInputTokens(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "u" && e.ctrlKey) {
                      e.preventDefault();
                      toggleInputUnit();
                    }
                  }}
                  placeholder={inputUnit === "thousands" ? "10" : "0.01"}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-transparent"
                  title="Ctrl+U to toggle unit"
                />
                <button
                  onClick={toggleInputUnit}
                  className="px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50"
                  title="Toggle unit (Ctrl+U)"
                >
                  {inputUnit === "thousands" ? "K" : "M"}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Output ({outputUnit === "thousands" ? "K" : "M"})
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.001"
                  value={outputTokens}
                  onChange={(e) => setOutputTokens(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "u" && e.ctrlKey) {
                      e.preventDefault();
                      toggleOutputUnit();
                    }
                  }}
                  placeholder={outputUnit === "thousands" ? "5" : "0.005"}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-transparent"
                  title="Ctrl+U to toggle unit"
                />
                <button
                  onClick={toggleOutputUnit}
                  className="px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50"
                  title="Toggle unit (Ctrl+U)"
                >
                  {outputUnit === "thousands" ? "K" : "M"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Models */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visiblePricings.map((pricing, index) => {
            const costs = calculateCost(pricing);
            const deleteKey = getDeleteKey(index);
            return (
              <div
                key={pricing.id}
                className="bg-white rounded-lg shadow p-3 relative"
              >
                {deleteMode && visiblePricings.length > 1 && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10">
                    {deleteKey}
                  </div>
                )}

                <div className="flex items-start justify-between mb-2">
                  <input
                    type="text"
                    value={pricing.name}
                    onChange={(e) =>
                      updatePricing(pricing.id, "name", e.target.value)
                    }
                    className="text-sm font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:outline-none flex-1"
                  />
                  {!deleteMode && visiblePricings.length > 1 && (
                    <button
                      onClick={() => markAsDeleted(pricing.id)}
                      className="text-red-500 hover:text-red-700 ml-2"
                      title="Delete model"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 mb-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Input ($/M)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricing.inputCost}
                      onChange={(e) =>
                        updatePricing(
                          pricing.id,
                          "inputCost",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Output ($/M)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricing.outputCost}
                      onChange={(e) =>
                        updatePricing(
                          pricing.id,
                          "outputCost",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="bg-indigo-50 rounded p-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Input:</span>
                    <span className="font-semibold">
                      ${costs.inputCost.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Output:</span>
                    <span className="font-semibold">
                      ${costs.outputCost.toFixed(4)}
                    </span>
                  </div>
                  <div className="border-t border-indigo-200 pt-1">
                    <div className="flex justify-between">
                      <span className="text-xs font-semibold text-gray-700">
                        Total:
                      </span>
                      <span className="text-sm font-bold text-indigo-600">
                        ${costs.totalCost.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison */}
        {visiblePricings.length > 1 && (
          <div className="bg-indigo-600 text-white rounded-lg shadow p-3 mt-4">
            <h2 className="text-sm font-semibold mb-2">Comparison</h2>
            <div className="space-y-1">
              {visiblePricings
                .map((p) => ({ ...p, total: calculateCost(p).totalCost }))
                .sort((a, b) => a.total - b.total)
                .map((pricing, index) => (
                  <div
                    key={pricing.id}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="flex items-center gap-2">
                      {index === 0 && (
                        <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded font-bold">
                          BEST
                        </span>
                      )}
                      {pricing.name}
                    </span>
                    <span className="font-bold">
                      ${pricing.total.toFixed(4)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
