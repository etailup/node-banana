"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CsvUploader } from "@/components/campaigns/CsvUploader"
import { VariableMapper } from "@/components/campaigns/VariableMapper"

interface Workflow {
  id: string
  name: string
  variables: Record<string, { type: string; description?: string }>
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [csvData, setCsvData] = useState<Record<string, unknown>[]>([])
  const [csvColumns, setCsvColumns] = useState<string[]>([])
  const [variableMap, setVariableMap] = useState<Record<string, string>>({})
  const [campaignName, setCampaignName] = useState("")
  const [concurrency, setConcurrency] = useState(5)
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available workflows
  useEffect(() => {
    async function fetchWorkflows() {
      try {
        const res = await fetch("/api/headless/workflows")
        if (res.ok) {
          const data = await res.json()
          setWorkflows(data.workflows || [])
        }
      } catch (err) {
        console.error("Failed to fetch workflows:", err)
      }
    }
    fetchWorkflows()
  }, [])

  const handleSelectWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow)
    setCampaignName(`${workflow.name} Batch`)
  }

  const handleCsvLoaded = (data: Record<string, unknown>[], columns: string[]) => {
    setCsvData(data)
    setCsvColumns(columns)
  }

  const handleLaunch = async () => {
    if (!selectedWorkflow || csvData.length === 0) return

    setLaunching(true)
    setError(null)

    try {
      const res = await fetch("/api/agents/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          workflowId: selectedWorkflow.id,
          data: csvData,
          variableMap,
          concurrency,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || "Failed to create campaign")
        return
      }

      const result = await res.json()
      router.push(`/dashboard/campaigns/${result.campaignId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign")
    } finally {
      setLaunching(false)
    }
  }

  const variables = selectedWorkflow
    ? Object.keys(selectedWorkflow.variables || {})
    : []

  const canProceedStep2 = selectedWorkflow !== null
  const canProceedStep3 = csvData.length > 0 && variables.every(v => variableMap[v])
  const canLaunch = campaignName.trim() && canProceedStep3

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">New Batch Campaign</h1>

        {/* Step indicators */}
        <div className="flex items-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step ? "bg-blue-600 text-white" :
                s < step ? "bg-green-600 text-white" :
                "bg-neutral-700 text-neutral-400"
              }`}>
                {s < step ? "\u2713" : s}
              </div>
              <span className="text-sm text-neutral-400">
                {s === 1 ? "Template" : s === 2 ? "Data" : "Launch"}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-200 mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Select Template */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Select Workflow Template</h2>
            {workflows.length === 0 ? (
              <p className="text-neutral-500 text-sm">No published workflows found. Create one first.</p>
            ) : (
              <div className="space-y-2">
                {workflows.map((wf) => (
                  <button
                    key={wf.id}
                    onClick={() => handleSelectWorkflow(wf)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedWorkflow?.id === wf.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-neutral-700 bg-neutral-800 hover:border-neutral-600"
                    }`}
                  >
                    <div className="text-sm font-medium">{wf.name}</div>
                    {Object.keys(wf.variables || {}).length > 0 && (
                      <div className="text-xs text-neutral-400 mt-1">
                        Variables: {Object.keys(wf.variables).join(", ")}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep2}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-6 py-2 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Upload Data + Map Variables */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium">Upload Data & Map Variables</h2>
            <CsvUploader onDataLoaded={handleCsvLoaded} />
            {csvColumns.length > 0 && variables.length > 0 && (
              <VariableMapper
                variables={variables}
                csvColumns={csvColumns}
                mapping={variableMap}
                onChange={setVariableMap}
                sampleRow={csvData[0]}
              />
            )}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-neutral-400 hover:text-neutral-200 text-sm"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canProceedStep3}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-6 py-2 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Configure + Launch */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium">Configure & Launch</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Concurrency</label>
                <select
                  value={concurrency}
                  onChange={(e) => setConcurrency(parseInt(e.target.value))}
                  className="bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-sm"
                >
                  {[1, 2, 3, 5, 10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="bg-neutral-700/30 border border-neutral-600 rounded-lg p-4">
                <div className="text-sm text-neutral-300">
                  <span className="font-medium">{csvData.length}</span> items &middot;{" "}
                  Template: <span className="font-medium">{selectedWorkflow?.name}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="text-neutral-400 hover:text-neutral-200 text-sm"
              >
                Back
              </button>
              <button
                onClick={handleLaunch}
                disabled={!canLaunch || launching}
                className="bg-green-600 hover:bg-green-500 text-white rounded-lg px-6 py-2 text-sm font-medium disabled:opacity-50"
              >
                {launching ? "Launching..." : "Launch Campaign"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
