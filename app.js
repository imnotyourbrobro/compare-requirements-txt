import { useState, useCallback } from "react";

function parseReqs(text) {
  const pkgs = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z0-9_\-\.]+)\s*([=<>!~]+.*)?$/);
    if (match) {
      pkgs[match[1].toLowerCase()] = { name: match[1], version: match[2]?.trim() || null };
    }
  }
  return pkgs;
}

function compare(a, b) {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const results = { added: [], removed: [], changed: [], same: [] };
  for (const k of allKeys) {
    if (!a[k]) results.added.push(b[k]);
    else if (!b[k]) results.removed.push(a[k]);
    else if (a[k].version !== b[k].version) results.changed.push({ name: a[k].name, from: a[k].version, to: b[k].version });
    else results.same.push(a[k]);
  }
  results.added.sort((x,y) => x.name.localeCompare(y.name));
  results.removed.sort((x,y) => x.name.localeCompare(y.name));
  results.changed.sort((x,y) => x.name.localeCompare(y.name));
  return results;
}

const BADGE = {
  added:   { bg: "#dcfce7", color: "#166534", label: "Added" },
  removed: { bg: "#fee2e2", color: "#991b1b", label: "Removed" },
  changed: { bg: "#fef9c3", color: "#854d0e", label: "Changed" },
  same:    { bg: "#f1f5f9", color: "#475569", label: "Unchanged" },
};

function Badge({ type }) {
  const s = BADGE[type];
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

function FileDropZone({ label, value, onChange }) {
  const [drag, setDrag] = useState(false);
  const onDrop = useCallback(e => {
    e.preventDefault(); setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) { const r = new FileReader(); r.onload = ev => onChange(ev.target.result); r.readAsText(file); }
  }, [onChange]);
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: "#334155" }}>{label}</div>
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        style={{ border: `2px dashed ${drag ? "#6366f1" : "#cbd5e1"}`, borderRadius: 8, padding: "10px", background: drag ? "#eef2ff" : "#f8fafc", transition: "all .2s" }}
      >
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Paste requirements.txt content or drop a file here…"
          style={{ width: "100%", minHeight: 160, border: "none", background: "transparent", resize: "vertical", fontFamily: "monospace", fontSize: 13, outline: "none", color: "#1e293b", boxSizing: "border-box" }}
        />
      </div>
    </div>
  );
}

export default function App() {
  const [file1, setFile1] = useState("");
  const [file2, setFile2] = useState("");
  const [filter, setFilter] = useState("all");

  const a = parseReqs(file1), b = parseReqs(file2);
  const diff = compare(a, b);
  const total = diff.added.length + diff.removed.length + diff.changed.length + diff.same.length;

  const rows = [];
  if (filter === "all" || filter === "added")   diff.added.forEach(p => rows.push({ type: "added", name: p.name, from: "—", to: p.version || "any" }));
  if (filter === "all" || filter === "removed") diff.removed.forEach(p => rows.push({ type: "removed", name: p.name, from: p.version || "any", to: "—" }));
  if (filter === "all" || filter === "changed") diff.changed.forEach(p => rows.push({ type: "changed", name: p.name, from: p.from || "any", to: p.to || "any" }));
  if (filter === "all" || filter === "same")    diff.same.forEach(p => rows.push({ type: "same", name: p.name, from: p.version || "any", to: p.version || "any" }));
  rows.sort((a,b) => a.name.localeCompare(b.name));

  const hasInput = file1.trim() || file2.trim();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: "24px 16px", color: "#1e293b" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>requirements.txt Diff Tool</h1>
      <p style={{ color: "#64748b", margin: "0 0 20px", fontSize: 14 }}>Compare two requirements files to see version and package differences.</p>

      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <FileDropZone label="File A (original)" value={file1} onChange={setFile1} />
        <FileDropZone label="File B (updated)" value={file2} onChange={setFile2} />
      </div>

      {hasInput && total > 0 && (
        <>
          {/* Summary */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { key: "all", label: `All (${total})`, bg: "#e2e8f0", color: "#334155" },
              { key: "added", label: `Added (${diff.added.length})`, bg: BADGE.added.bg, color: BADGE.added.color },
              { key: "removed", label: `Removed (${diff.removed.length})`, bg: BADGE.removed.bg, color: BADGE.removed.color },
              { key: "changed", label: `Changed (${diff.changed.length})`, bg: BADGE.changed.bg, color: BADGE.changed.color },
              { key: "same", label: `Unchanged (${diff.same.length})`, bg: BADGE.same.bg, color: BADGE.same.color },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ padding: "6px 14px", borderRadius: 999, border: filter === f.key ? "2px solid #6366f1" : "2px solid transparent",
                  background: f.bg, color: f.color, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {["Package", "Status", "File A version", "File B version"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "9px 14px", fontFamily: "monospace", fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: "9px 14px" }}><Badge type={r.type} /></td>
                    <td style={{ padding: "9px 14px", fontFamily: "monospace", color: r.type === "removed" ? "#991b1b" : "#475569" }}>{r.from}</td>
                    <td style={{ padding: "9px 14px", fontFamily: "monospace", color: r.type === "added" ? "#166534" : r.type === "changed" ? "#854d0e" : "#475569" }}>{r.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {hasInput && total === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No packages found. Check that the content is valid requirements.txt format.</div>
      )}
      {!hasInput && (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Paste or drop your requirements files above to get started.</div>
      )}
    </div>
  );
}
