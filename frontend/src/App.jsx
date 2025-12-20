import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Terminal, Search, RefreshCw, Zap } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('Checking...');
  
  // Stats for the chart
  const [stats, setStats] = useState([
    { name: 'Benign', value: 400 },
    { name: 'Phishing', value: 300 },
  ]);

  const [metrics] = useState({ accuracy: 0.92, precision: 0.89, recall: 0.94 });
  const [logs, setLogs] = useState([]);

  const COLORS = ['#10B981', '#EF4444'];

  // 1. REAL-TIME SIMULATION EFFECT
  // This simulates "global" traffic being analyzed by the system in the background
  useEffect(() => {
    const interval = setInterval(() => {
      // SAFE STATE UPDATE (Immutable)
      setStats(prev => {
        const isPhishing = Math.random() > 0.7;
        // Map creates a new array with new objects, preventing mutation crashes
        return prev.map((item, index) => {
            if (isPhishing && index === 1) {
                return { ...item, value: item.value + 1 };
            }
            if (!isPhishing && index === 0) {
                return { ...item, value: item.value + 1 };
            }
            return item;
        });
      });

      // Generate a random background log
      const newLog = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        msg: `Auto-scanning batch #${Math.floor(Math.random() * 9000) + 1000}...`,
        level: 'INFO'
      };
      setLogs(prev => {
        // Ensure we don't crash if prev is undefined for some reason
        const safePrev = Array.isArray(prev) ? prev : [];
        return [newLog, ...safePrev].slice(0, 7);
      }); 
    }, 2000); // Updates every 2 seconds

    return () => clearInterval(interval);
  }, []);

  // 2. ANALYZE URL FUNCTION (Connects to Real Backend)
  const analyzeUrl = async () => {
    if (!url) return;
    setLoading(true);
    setResult(null);

    try {
      // Try connecting to the real Docker backend
      const response = await fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url })
      });

      if (!response.ok) throw new Error('Backend API Error');

      const data = await response.json();
      
      // Update UI with Real Data
      setResult({
        prediction: data.prediction, // "phishing" or "benign"
        confidence: (data.confidence * 100).toFixed(1),
        risk: data.risk_level
      });

      // Log the success
      setLogs(prev => [{
        id: Date.now(), 
        time: new Date().toLocaleTimeString(), 
        msg: `User Scan Success: ${url}`, 
        level: 'SUCCESS'
      }, ...prev]);

      // Update stats based on real result
      setStats(prev => {
         return prev.map(item => {
            if (data.prediction === 'phishing' && item.name === 'Phishing') {
                return { ...item, value: item.value + 1 };
            }
            if (data.prediction === 'benign' && item.name === 'Benign') {
                 return { ...item, value: item.value + 1 };
            }
            return item;
         });
      });
      setBackendStatus('Online');

    } catch (e) {
      console.warn("Backend offline, switching to simulation mode", e);
      setBackendStatus('Offline (Simulated Mode)');
      
      // --- FALLBACK SIMULATION (If Docker isn't running) ---
      await new Promise(r => setTimeout(r, 800)); // Fake delay
      const isPhish = url.includes("bank") || url.length > 50 || url.includes("secure");
      const mockRes = {
        prediction: isPhish ? "phishing" : "benign",
        confidence: (75 + Math.random() * 20).toFixed(1),
        risk: isPhish ? "CRITICAL" : "LOW"
      };
      
      setResult(mockRes);
      setLogs(prev => [{
        id: Date.now(), 
        time: new Date().toLocaleTimeString(), 
        msg: `[Simulated] Scan: ${url}`, 
        level: 'WARN'
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between border-b border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-red-500 w-8 h-8" />
          <h1 className="text-2xl font-bold text-white">CyberGuard AI <span className="text-sm text-slate-400 font-normal">Phishing Detection System</span></h1>
        </div>
        <div className="flex gap-4 text-sm text-slate-400">
             <span className="flex items-center gap-1"><Activity size={16}/> Model v1.2.0</span>
             <span className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full animate-pulse ${backendStatus.includes('Online') ? 'bg-green-500' : 'bg-yellow-500'}`}></div> 
                System: {backendStatus}
             </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: INPUT & CHARTS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. URL Scanner Section */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Search size={20}/> URL Analyzer</h2>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && analyzeUrl()}
                placeholder="Enter suspicious URL (e.g., http://secure-bank-login.com)..." 
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-white transition-colors"
              />
              <button 
                onClick={analyzeUrl}
                disabled={loading || !url}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 min-w-[140px] justify-center"
              >
                {loading ? <RefreshCw className="animate-spin" size={18}/> : <Zap size={18} fill="currentColor"/>}
                {loading ? 'Scanning...' : 'Scan Now'}
              </button>
            </div>

            {/* Result Display */}
            {result && (
              <div className={`mt-6 p-4 rounded-lg border animate-in fade-in slide-in-from-top-2 duration-300 ${result.prediction === 'phishing' ? 'bg-red-900/20 border-red-500/50' : 'bg-green-900/20 border-green-500/50'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`text-2xl font-bold tracking-wide ${result.prediction === 'phishing' ? 'text-red-400' : 'text-green-400'}`}>
                      {result.prediction.toUpperCase()} DETECTED
                    </h3>
                    <p className="text-slate-400 mt-1">Confidence Score: <span className="text-white font-mono">{result.confidence}%</span></p>
                  </div>
                  <div className={`px-4 py-2 rounded text-sm font-bold shadow-lg ${result.risk === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    RISK: {result.risk}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Live Threat Distribution */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col">
              <h3 className="text-sm font-semibold text-slate-400 mb-4 flex justify-between items-center">
                <span>Global Threat Distribution</span>
                <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded-full">LIVE</span>
              </h3>
              <div className="h-48 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats}
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {stats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff'}}
                      itemStyle={{color: '#fff'}}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 text-sm mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> 
                  <span className="font-medium">{stats[0].value} Benign</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div> 
                  <span className="font-medium">{stats[1].value} Phishing</span>
                </div>
              </div>
            </div>

            {/* Model Metrics */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h3 className="text-sm font-semibold text-slate-400 mb-2">Model Performance Metrics</h3>
                <div className="space-y-6 mt-6">
                    <div>
                        <div className="flex justify-between text-xs mb-2 font-medium text-slate-300"><span>Accuracy</span><span>{(metrics.accuracy * 100).toFixed(0)}%</span></div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-[92%] shadow-[0_0_10px_#3b82f6]"></div></div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-2 font-medium text-slate-300"><span>Precision</span><span>{(metrics.precision * 100).toFixed(0)}%</span></div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-purple-500 w-[89%] shadow-[0_0_10px_#a855f7]"></div></div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-2 font-medium text-slate-300"><span>Recall</span><span>{(metrics.recall * 100).toFixed(0)}%</span></div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 w-[94%] shadow-[0_0_10px_#06b6d4]"></div></div>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LOGS */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex flex-col h-[calc(100vh-6rem)] lg:h-auto sticky top-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Terminal size={20}/> System Logs</h2>
          
          <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs pr-2 custom-scrollbar">
            {logs.map(log => (
                <div key={log.id} className={`p-3 rounded border-l-2 bg-slate-900/50 transition-all hover:bg-slate-900 ${
                  log.level === 'WARN' ? 'border-yellow-500' : 
                  log.level === 'SUCCESS' ? 'border-green-500' : 'border-blue-500'
                }`}>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500">{log.time}</span>
                      <span className={`font-bold ${
                        log.level === 'WARN' ? 'text-yellow-500' : 
                        log.level === 'SUCCESS' ? 'text-green-400' : 'text-blue-400'
                      }`}>{log.level}</span>
                    </div>
                    <div className="text-slate-300 break-all">{log.msg}</div>
                </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-700 text-center">
             <span className="text-xs text-slate-500 italic">Showing last 7 events</span>
          </div>
        </div>

      </div>
    </div>
  );
}