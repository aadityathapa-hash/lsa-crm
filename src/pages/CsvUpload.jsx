import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

// Market mapping from account_id to market name
const ACCOUNT_TO_MARKET = {
  "5099597743": "Atlanta", "1173922082": "Austin", "8729022296": "Boise",
  "6686647760": "Boulder", "3393574684": "Cleveland", "5221982684": "Connecticut",
  "1547890835": "Dallas", "8892747564": "Denver", "2521447943": "Des Moines",
  "8596366995": "Detroit", "8074202217": "GR", "2120358391": "Indy",
  "9146891317": "Jacksonville", "5038071501": "KC", "6872633925": "Naples",
  "4303868344": "Oakland County", "5105976493": "OKC", "3800988292": "Omaha",
  "6096100360": "Philly N", "7917827748": "Phoenix", "2090589547": "Pinellas",
  "5587310711": "Reno", "4841055547": "Rhode Island", "6272845927": "Richmond",
  "9026770511": "Sacramento", "7114241495": "Salt Lake", "3223412060": "Tucson",
  "6400282498": "Twin Cities", "3908498508": "Vancouver", "4459697498": "Virginia Beach",
  "2780547174": "West Palm", "4756879965": "Westchester", "2477621364": "Twin Cities SW",
  "8055326825": "Washington DC", "9896174572": "Virginia North", "7057970484": "Twin Cities 2",
};

function parseCSV(text) {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  return lines.slice(1).map(line => {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes; }
      else if (line[i] === ',' && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += line[i]; }
    }
    values.push(current.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ""; });
    return obj;
  });
}

function cleanStr(val) {
  if (!val) return null;
  const s = val.trim().replace(/"/g, "");
  return s && !["none", "n/a", "null", "not provided"].includes(s.toLowerCase()) ? s : null;
}

function cleanPhone(val) {
  if (!val) return null;
  const digits = val.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits || null;
}

function parseTimestamp(val) {
  if (!val) return null;
  const s = val.trim().replace(/"/g, "");
  if (!s) return null;
  const fmts = [
    [/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/, (m) => {
      const yr = m[3].length === 2 ? "20" + m[3] : m[3];
      return `${yr}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}T${m[4].padStart(2,"0")}:${m[5]}:${(m[6]||"00")}`;
    }],
    [/^(\d{4})-(\d{2})-(\d{2})/, (m) => s],
  ];
  for (const [re, fn] of fmts) {
    const m = s.match(re);
    if (m) return fn(m);
  }
  return null;
}

function csvRowToLead(row, monthNum, year) {
  const accountId = cleanStr(row["Account ID"] || row["account_id"]);
  const externalId = cleanStr(row["External Lead Id"] || row["external_lead_id"]);
  const timestamp = parseTimestamp(row["Lead Creation Timestamp"] || row["original_timestamp"]);
  
  if (!accountId || !externalId || !timestamp) return null;

  const chargedRaw = (row["Charged"] || row["charged"] || "").toLowerCase();
  const charged = ["true", "1", "yes", "charged"].includes(chargedRaw);
  const duration = parseInt(row["Charged Connected Call Duration Seconds"] || row["duration"] || "0") || null;

  return {
    external_lead_id: externalId,
    account_id: accountId.replace(".0", ""),
    business_name: cleanStr(row["Business Name"] || row["business_name"]),
    lead_creation_timestamp: timestamp,
    google_ads_lead_id: cleanStr(row["Google Ads Lead Id"] || row["google_ads_lead_id"]),
    customer_name: cleanStr(row["Customer Name"] || row["customer_name"]),
    phone: cleanPhone(row["Customer Phone Number"] || row["customer_phone"]),
    email: cleanStr(row["Customer Email"] || row["customer_email"]),
    booking_timestamp: parseTimestamp(row["Booking Appointment Timestamp"] || row["booking_timestamp"]),
    job_type: cleanStr(row["Job Type"] || row["job_type"]),
    zipcode: cleanStr(row["Zipcode"] || row["zipcode"]),
    geo: cleanStr(row["Geo"] || row["geo"]),
    lead_category: cleanStr(row["Lead Category"] || row["lead_category"]),
    charged_call_timestamp: parseTimestamp(row["Charged Call Timestamp"] || row["charged_call_timestamp"]),
    duration_seconds: duration,
    lead_type: cleanStr(row["Lead Type"] || row["lead_type"]),
    charged: charged,
    dispute_status: cleanStr(row["Dispute Status"] || row["dispute_status"]),
    month: monthNum,
    year: year,
  };
}

export default function CsvUpload() {
  const { isAdmin } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(2026);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  async function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);

    const text = await f.text();
    const rows = parseCSV(text);
    
    // Auto-detect month from first timestamp
    if (rows.length > 0) {
      const ts = rows[0]["Lead Creation Timestamp"] || rows[0]["original_timestamp"];
      if (ts) {
        const m = ts.match(/^(\d{1,2})\//);
        if (m) setMonth(parseInt(m[1]));
      }
    }

    const leads = rows.map(r => csvRowToLead(r, month, year)).filter(Boolean);
    
    // Summary by market
    const marketCounts = {};
    leads.forEach(l => {
      const market = ACCOUNT_TO_MARKET[l.account_id] || "Unknown";
      marketCounts[market] = (marketCounts[market] || 0) + 1;
    });

    const charged = leads.filter(l => l.charged).length;
    const withDuration = leads.filter(l => l.duration_seconds && l.duration_seconds > 0).length;

    setPreview({
      totalRows: rows.length,
      validLeads: leads.length,
      charged,
      withDuration,
      markets: Object.entries(marketCounts).sort((a,b) => b[1] - a[1]),
      leads,
    });
  }

  async function handleUpload() {
    if (!preview?.leads?.length) return;
    setUploading(true);
    setError(null);
    setResult(null);

    const leads = preview.leads.map(l => ({ ...l, month, year }));
    let inserted = 0;
    let errors = [];

    for (let i = 0; i < leads.length; i += 500) {
      const chunk = leads.slice(i, i + 500);
      try {
        const { error: upsertError } = await supabase
          .from("leads")
          .upsert(chunk, { onConflict: "external_lead_id" });
        if (upsertError) {
          errors.push(`Chunk ${i}: ${upsertError.message}`);
        } else {
          inserted += chunk.length;
        }
      } catch (e) {
        errors.push(`Chunk ${i}: ${e.message}`);
      }
    }

    if (errors.length > 0) {
      setError(`${inserted} inserted, ${errors.length} errors: ${errors[0]}`);
    } else {
      setResult({ inserted, month: months[month - 1], year });
    }
    setUploading(false);
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-20 text-slate-400">
        Admin access required for CSV upload.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Import LSA Data</h1>
      <p className="text-sm text-slate-400 mb-6">Upload a Google Ads LSA detailed report CSV to import leads into the CRM.</p>

      {/* Upload area */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Month</label>
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
              className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white">
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
            <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))}
              className="border border-slate-200 rounded-md px-3 py-2 text-sm w-24" />
          </div>
        </div>

        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600">
              {file ? file.name : "Click to select CSV file"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {file ? `${(file.size / 1024).toFixed(1)} KB` : "Google Ads LSA Detailed Report export"}
            </p>
          </div>
          <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </label>
      </div>

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Preview</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400">Total Rows</p>
              <p className="text-xl font-bold text-slate-900">{preview.totalRows}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400">Valid Leads</p>
              <p className="text-xl font-bold text-green-600">{preview.validLeads}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400">Charged</p>
              <p className="text-xl font-bold text-slate-900">{preview.charged}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400">With Duration</p>
              <p className="text-xl font-bold text-slate-900">{preview.withDuration}</p>
            </div>
          </div>

          <h3 className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Market Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mb-4">
            {preview.markets.map(([market, count]) => (
              <div key={market} className="flex justify-between text-sm px-2 py-1 bg-slate-50 rounded">
                <span className="text-slate-600">{market}</span>
                <span className="font-medium text-slate-800">{count}</span>
              </div>
            ))}
          </div>

          <button onClick={handleUpload} disabled={uploading}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
            {uploading ? "Importing..." : `Import ${preview.validLeads} leads for ${months[month - 1]} ${year}`}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
          ✅ Successfully imported {result.inserted} leads for {result.month} {result.year}. Dashboard will reflect the new data immediately.
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          ❌ {error}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">How to export from Google Ads</h3>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>Go to Google Ads → Local Services Ads → Leads</li>
          <li>Set the date range to the month you want to import</li>
          <li>Click the download icon → "Detailed report" → CSV</li>
          <li>Upload the CSV file here</li>
          <li>Verify the preview, then click Import</li>
        </ol>
      </div>
    </div>
  );
}
