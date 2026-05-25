import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, Search, Eye, EyeOff } from 'lucide-react';

const PasswordCell = ({ value }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs max-w-[200px] truncate" title={show ? value : ''}>
        {show ? value : '••••••••••••••••••••'}
      </span>
      <button 
        onClick={() => setShow(!show)} 
        className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        title="Reveal Hash"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

export default function DatabaseViewer() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch available tables
    axios.get('http://localhost:5000/api/v1/admin/tables', { withCredentials: true })
      .then(res => {
        if (res.data.tables) {
          setTables(res.data.tables);
          if (res.data.tables.length > 0) {
            setSelectedTable(res.data.tables[0]);
          }
        }
      })
      .catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedTable) return;
    setLoading(true);
    axios.get(`http://localhost:5000/api/v1/admin/db/${selectedTable}`, { withCredentials: true })
      .then(res => {
        setRecords(res.data.records || []);
        setError(null);
      })
      .catch(err => {
        setError(err.message);
        setRecords([]);
      })
      .finally(() => setLoading(false));
  }, [selectedTable]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-full flex flex-col font-rajdhani">
      <div className="flex items-center justify-between mb-6 border-b pb-4">
        <div className="flex items-center gap-3 text-navy">
          <Database className="w-6 h-6 text-saffron" />
          <h2 className="text-xl font-bold m-0">Database Viewer</h2>
        </div>
        
        <select 
          className="border border-slate-200 rounded-lg px-4 py-2 bg-slate-50 text-navy font-semibold outline-none focus:ring-2 focus:ring-saffron"
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
        >
          {tables.map(table => (
            <option key={table} value={table}>{table}</option>
          ))}
        </select>
      </div>

      {error && <div className="text-red-500 mb-4 font-bold">{error}</div>}

      <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-saffron border-t-transparent rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Search className="w-12 h-12 mb-2 opacity-50" />
            <p className="font-semibold text-lg">No records found in {selectedTable}</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-200 sticky top-0 z-10 text-slate-600">
              <tr>
                {Object.keys(records[0]).map(key => (
                  <th key={key} className="px-4 py-3 font-bold uppercase tracking-wider">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {records.map((record, i) => (
                <tr key={i} className="hover:bg-white transition-colors text-slate-800">
                  {Object.entries(record).map(([key, val], idx) => (
                    <td key={idx} className="px-4 py-3 font-medium max-w-xs truncate">
                      {key === 'password' ? (
                        <PasswordCell value={val} />
                      ) : typeof val === 'object' ? (
                        JSON.stringify(val)
                      ) : (
                        String(val)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
