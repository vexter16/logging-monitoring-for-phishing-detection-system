import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Activity, Terminal, Search, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({ accuracy: 0.92, precision: 0.89, recall: 0.94 });
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState([
    { name: 'Benign', value: 400 },
    { name: 'Phishing', value: 300 },
  ]);

  // Simulate fetching logs and real-time stats
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate live log feed
      const newLog = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        msg: `Analyzed URL batch #${Math.floor(Math.random() * 1000)}`,
        level: Math.random() > 0.9 ? 'WARN' : 'INFO'
      };
      setLogs(prev => [newLog, ...prev].slice(0, 5));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const analyzeUrl = async () => {
    setLoading(true);
    try {
        // Simulation of API call for demo purposes in preview
        // In production: const res = await fetch('http://localhost:8000/predict', ...)
        await new Promise(r => setTimeout(r, 1000)); 
        
        const isPhish = url.includes("bank") || url.length > 30;
        const mockRes = {
            prediction: isPhish ? "Phishing" : "Benign",
            confidence: (0.7 + Math.random() * 0.29).toFixed(2),
            risk: isPhish ? "CRITICAL" : "LOW"
        };
        
        setResult(mockRes);
        setLogs(prev => [{
            id: Date.now(), 
            time: new Date().toLocaleTimeString(), 
            msg: `Prediction served: ${url} -> ${mockRes.prediction}`, 
            level: 'INFO'
        }, ...prev]);

        // Update charts
        setStats(prev => {
            const newStats = [...prev];
            if(isPhish) newStats[1].value++;
            else newStats[0].value++;
            return newStats;
        });

    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const COLORS = ['#10B981', '#EF4444'];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6">
      <header className="mb-8 flex items-center justify-between border-b border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-red-500 w-8 h-8" />
          <h1 className="text-2xl font-bold text-white">CyberGuard AI <span className="text-sm text-slate-400 font-normal">Phishing Detection System</span></h1>
        </div>
        <div className="flex gap-4 text-sm text-slate-400">
             <span className="flex items-center gap-1"><Activity size={16}/> Model v1.2.0</span>
             <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> System Online</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Input Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Search size={20}/> URL Analyzer</h2>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter suspicious URL (e.g., http://verify-bank-login.com)..." 
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-white"
              />
              <button 
                onClick={analyzeUrl}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <RefreshCw className="animate-spin" size={18}/>}
                Scan Now
              </button>
            </div>

            {result && (
              <div className={`mt-6 p-4 rounded-lg border ${result.prediction === 'Phishing' ? 'bg-red-900/20 border-red-500/50' : 'bg-green-900/20 border-green-500/50'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`text-xl font-bold ${result.prediction === 'Phishing' ? 'text-red-400' : 'text-green-400'}`}>
                      {result.prediction.toUpperCase()} DETECTED
                    </h3>
                    <p className="text-slate-400 mt-1">Confidence Score: {result.confidence * 100}%</p>
                  </div>
                  <div className={`px-3 py-1 rounded text-sm font-bold ${result.risk === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-slate-600'}`}>
                    RISK: {result.risk}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Metrics Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-400 mb-4">Threat Distribution</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats}
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 text-sm">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-full"></div> Benign</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div> Phishing</div>
              </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h3 className="text-sm font-semibold text-slate-400 mb-2">Performance Metrics</h3>
                <div className="space-y-4 mt-4">
                    <div>
                        <div className="flex justify-between text-xs mb-1"><span>Accuracy</span><span>{(metrics.accuracy * 100).toFixed(0)}%</span></div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-[92%]"></div></div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1"><span>Precision</span><span>{(metrics.precision * 100).toFixed(0)}%</span></div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-purple-500 w-[89%]"></div></div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1"><span>Recall</span><span>{(metrics.recall * 100).toFixed(0)}%</span></div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 w-[94%]"></div></div>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Logs & Operations */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex flex-col h-full">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Terminal size={20}/> System Logs</h2>
          <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs">
            {logs.map(log => (
                <div key={log.id} className="p-2 bg-slate-900 rounded border border-slate-700 border-l-2 border-l-blue-500">
                    <span className="text-slate-500">[{log.time}]</span> <span className={log.level === 'WARN' ? 'text-yellow-500' : 'text-blue-400'}>{log.level}</span>
                    <div className="text-slate-300 mt-1">{log.msg}</div>
                </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700">
            <button className="w-full py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded text-slate-300">View All Logs in Kibana</button>
          </div>
        </div>
      </div>
    </div>
  );
}