"use client"

interface VariableMapperProps {
  variables: string[]
  csvColumns: string[]
  mapping: Record<string, string>
  onChange: (mapping: Record<string, string>) => void
  sampleRow?: Record<string, unknown>
}

export function VariableMapper({
  variables,
  csvColumns,
  mapping,
  onChange,
  sampleRow,
}: VariableMapperProps) {
  const handleChange = (variable: string, column: string) => {
    onChange({ ...mapping, [variable]: column })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-neutral-200">Variable Mapping</h3>
      <div className="space-y-3">
        {variables.map((variable) => (
          <div key={variable} className="flex items-center gap-3">
            <code className="text-sm text-yellow-400 bg-neutral-700/50 px-2 py-1 rounded min-w-[140px]">
              {`{{${variable}}}`}
            </code>
            <span className="text-neutral-500">&rarr;</span>
            <select
              value={mapping[variable] || ""}
              onChange={(e) => handleChange(variable, e.target.value)}
              className="flex-1 bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-sm text-neutral-200"
            >
              <option value="">Select column...</option>
              {csvColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {sampleRow && Object.keys(mapping).length > 0 && (
        <div className="bg-neutral-700/30 border border-neutral-600 rounded-lg p-3">
          <div className="text-xs text-neutral-400 mb-2">Preview (row 1):</div>
          {Object.entries(mapping).map(([variable, column]) => (
            <div key={variable} className="text-sm text-neutral-300">
              <span className="text-yellow-400">{variable}</span> ={" "}
              <span className="text-green-400">
                &quot;{String(sampleRow[column] ?? "")}&quot;
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
