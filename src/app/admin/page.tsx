"use client";

import { Suspense, useState, useEffect } from "react";
import { fetchAccountsAction, fetchCampaignsAction, createPublicCanvasAction } from "@/actions/meta-actions";
import { Copy, Activity, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";

function AdminContent() {
  const searchParams = useSearchParams();
  
  const [clientName, setClientName] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['spend', 'results', 'reach', 'cpr', 'impressions', 'clicks', 'cpc', 'conversations', 'cpc_conversations', 'roas']);
  const availableMetrics = [
    { id: 'spend', label: 'Importe Gastado' },
    { id: 'results', label: 'Resultados' },
    { id: 'cpr', label: 'Costo por Resultado' },
    { id: 'reach', label: 'Alcance' },
    { id: 'conversations', label: 'Conversaciones' },
    { id: 'cpc_conversations', label: 'Costo por Conversación' },
    { id: 'impressions', label: 'Impresiones' },
    { id: 'clicks', label: 'Clics' },
    { id: 'cpc', label: 'CPC' },
    { id: 'roas', label: 'ROAS' },
  ];
  const [selectedAccountId, setSelectedAccountId] = useState("");
  
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const handleFetchAccounts = async () => {
    setLoading(true); setError("");
    const res = await fetchAccountsAction();
    if (res.success) {
      setAccounts(res.data);
      setIsConnected(true);
    } else {
      if (res.error?.includes("sesión activa")) {
         setIsConnected(false); // Necesita inicar sesion
      } else {
         setError(res.error || "Error al obtener cuentas");
      }
    }
    setLoading(false);
  };

  useEffect(() => {
     // Si regresamos desde OAuth con error en la URL
     const urlErr = searchParams.get("error");
     if (urlErr) {
        setError(`Error de autenticación: ${urlErr}`);
     }
     handleFetchAccounts();
  }, [searchParams]);

  const loginWithFacebook = () => {
      window.location.href = "/api/auth/meta";
  };

  const handleFetchCampaigns = async (accountId: string) => {
    setSelectedAccountId(accountId);
    setLoading(true); setError("");
    
    const res = await fetchCampaignsAction(accountId);
    if (res.success) {
      setCampaigns(res.data);
    } else {
      setError(res.error || "Error al obtener campañas");
    }
    setLoading(false);
  };

  const handleCreateCanvas = async () => {
    if (!selectedAccountId || selectedCampaigns.length === 0 || !clientName) {
      return setError("Falta el nombre del cliente o seleccionar campañas.");
    }
    setLoading(true); setError("");

    const res = await createPublicCanvasAction(selectedAccountId, selectedCampaigns, clientName, selectedMetrics);
    
    if (res.success) {
      setPublicUrl(`${window.location.origin}/c/${res.publicId}`);
    } else {
      setError(res.error || "Error al crear tu canvas.");
    }
    setLoading(false);
  };

  const toggleCampaign = (id: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  if (loading && !isConnected && !error) {
     return <div className="min-h-screen bg-[#fafafa] flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 font-sans selection:bg-black selection:text-white pb-20">
      <div className="max-w-4xl mx-auto pt-20 px-6">
        
        <header className="mb-12">
          <div className="flex justify-between items-end">
              <div>
                  <h1 className="text-3xl font-medium tracking-tight mb-2">Meta Ads Canvas Manager</h1>
                  <p className="text-zinc-500">Crea visualizaciones elegantes de tus campañas para tus clientes.</p>
              </div>
              {isConnected && (
                  <button onClick={loginWithFacebook} className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                     <RefreshCw className="w-3 h-3" /> Reconectar Meta
                  </button>
              )}
          </div>
        </header>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-8 border border-red-100 flex justify-between items-center">
            {error}
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-600 font-medium">x</button>
          </div>
        )}

        <div className="space-y-6">
          
          {/* Step 1: Conexión OAuth */}
          {!isConnected && !loading && (
            <section className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100 flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
               </div>
               <h2 className="text-xl font-medium mb-2">Conecta tu cuenta de Meta</h2>
               <p className="text-zinc-500 text-sm max-w-md mb-6">Inicia sesión de forma segura a través de Facebook para acceder a tus cuentas publicitarias y de negocios.</p>
               <button 
                  onClick={loginWithFacebook}
                  className="px-8 py-3 bg-[#1877F2] text-white text-sm font-medium rounded-xl hover:bg-[#0c63d4] transition-colors shadow-sm"
               >
                  Continuar con Facebook
               </button>
            </section>
          )}

          {/* Step 2: Cuentas */}
          {isConnected && accounts.length > 0 && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-100 text-xs">1</span>
                Selecciona la Ad Account
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {accounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => handleFetchCampaigns(acc.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      selectedAccountId === acc.id 
                        ? "border-black ring-1 ring-black bg-zinc-50/50" 
                        : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <div className="font-medium text-sm">{acc.name}</div>
                    <div className="text-xs text-zinc-500 mt-1 flex items-center justify-between">
                       <span className="uppercase tracking-wider font-mono">{acc.id}</span>
                       {acc.account_status === 1 && <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold">ACTIVA</span>}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Step 3: Campañas */}
          {campaigns.length > 0 && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 animate-in slide-in-from-bottom-4 fade-in duration-500">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-100 text-xs">2</span>
                Selecciona las Campañas a publicar
              </h2>
              <div className="space-y-2 mb-6">
                {campaigns.map(camp => {
                    const isSelected = selectedCampaigns.includes(camp.id);
                    return (
                        <div 
                          key={camp.id}
                          className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                            isSelected ? "border-black bg-zinc-50" : "border-zinc-100 hover:border-zinc-200"
                          }`}
                          onClick={() => toggleCampaign(camp.id)}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                              isSelected ? "bg-black border-black text-white" : "border-zinc-300 bg-white"
                          }`}>
                              {isSelected && <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3"><path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{camp.name}</div>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                    <Activity className="w-3 h-3"/> {camp.status}
                                </span>
                                <span className="text-xs text-zinc-400 font-mono">{camp.id}</span>
                            </div>
                          </div>
                        </div>
                    );
                })}
              </div>

              <div className="flex items-end gap-4 pt-4 border-t border-zinc-100 mb-6">
                  <div className="flex-1">
                      <label className="block text-xs font-medium text-zinc-500 mb-2">Métricas Visibles en el Canvas</label>
                      <div className="flex flex-wrap gap-2">
                        {availableMetrics.map(metric => (
                           <label key={metric.id} className="flex items-center gap-2 px-3 py-1.5 border border-zinc-200 rounded-lg text-sm bg-zinc-50 cursor-pointer hover:bg-zinc-100">
                              <input 
                                type="checkbox"
                                checked={selectedMetrics.includes(metric.id)}
                                onChange={(e) => setSelectedMetrics(prev => e.target.checked ? [...prev, metric.id] : prev.filter(m => m !== metric.id))}
                                className="rounded text-black focus:ring-black"
                              />
                              <span>{metric.label}</span>
                           </label>
                        ))}
                      </div>
                  </div>
              </div>

              <div className="flex items-end gap-4 pt-4 border-t border-zinc-100">
                 <div className="flex-1">
                    <label className="block text-xs font-medium text-zinc-500 mb-2">Nombre del Cliente / Presentación</label>
                    <input 
                      type="text"
                      placeholder="Ej. Campaña Black Friday 2026"
                      className="w-full px-4 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                    />
                 </div>
                 <button 
                  onClick={handleCreateCanvas}
                  disabled={loading || selectedCampaigns.length === 0 || !clientName}
                  className="px-6 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Generar Canvas Público
                </button>
              </div>
            </section>
          )}

          {/* Step 4: Resultado */}
          {publicUrl && (
             <section className="bg-emerald-50 text-emerald-900 p-6 rounded-2xl border border-emerald-100 animate-in zoom-in-95 duration-300">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    ¡Tu enlace está listo!
                </h3>
                <p className="text-sm text-emerald-700/80 mb-4">Puedes compartir este enlace con tu cliente. Los datos se obtendrán directamente en cada visita de forma read-only.</p>
                <div className="flex gap-2 items-center bg-white border border-emerald-200 p-2 rounded-xl">
                    <input type="text" readOnly value={publicUrl} className="flex-1 bg-transparent text-sm px-2 outline-none" />
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(publicUrl);
                            alert("Copiado al portapapeles");
                        }}
                        className="p-2 hover:bg-emerald-50 rounded-lg transition-colors text-emerald-700"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                </div>
                <div className="mt-4">
                    <a href={publicUrl} target="_blank" className="text-sm font-medium underline text-emerald-800 hover:text-emerald-600">Abrir Canvas ahora &rarr;</a>
                </div>
             </section>
          )}

        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fafafa] flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-zinc-400" /></div>}>
      <AdminContent />
    </Suspense>
  );
}
