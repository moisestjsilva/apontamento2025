import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const OperatorTestSimple = () => {
  const [status, setStatus] = useState("Inicializando...");
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setLogs(prev => [...prev, logMessage]);
  };

  const testConnection = async () => {
    try {
      addLog("🔄 Testando conexão com Supabase...");
      setStatus("Testando conexão...");

      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) throw error;

      addLog("✅ Conexão estabelecida com sucesso!");
      setStatus("Conexão OK");
      return true;
    } catch (error: any) {
      addLog(`❌ Erro na conexão: ${error.message}`);
      setStatus("Erro na conexão");
      return false;
    }
  };

  const testLogin = async () => {
    try {
      addLog("🔄 Testando login...");
      setStatus("Testando login...");

      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'operador1@empresa.com')
        .eq('active', true)
        .eq('role', 'operator');

      if (error) throw error;

      addLog(`✅ Usuários encontrados: ${users?.length || 0}`);
      if (users && users.length > 0) {
        addLog(`👤 Usuário: ${users[0].name}`);
        setStatus("Login OK");
        return users[0];
      } else {
        addLog("❌ Usuário não encontrado");
        setStatus("Usuário não encontrado");
        return null;
      }
    } catch (error: any) {
      addLog(`❌ Erro no login: ${error.message}`);
      setStatus("Erro no login");
      return null;
    }
  };

  const testBatches = async () => {
    try {
      addLog("🔄 Testando busca de lotes...");
      setStatus("Buscando lotes...");

      const { data: batches, error } = await supabase
        .from('batches')
        .select('*')
        .eq('status', 'Em andamento');

      if (error) throw error;

      addLog(`✅ Lotes encontrados: ${batches?.length || 0}`);
      
      if (batches && batches.length > 0) {
        for (const batch of batches) {
          addLog(`📦 Lote: ${batch.name} (${batch.code})`);
          
          const { data: pieces, error: piecesError } = await supabase
            .from('pieces')
            .select('*')
            .eq('batch_id', batch.id);

          if (piecesError) {
            addLog(`❌ Erro ao buscar peças: ${piecesError.message}`);
          } else {
            addLog(`✅ Peças: ${pieces?.length || 0}`);
          }
        }
        setStatus("Lotes carregados com sucesso");
        return batches;
      } else {
        addLog("ℹ️ Nenhum lote ativo");
        setStatus("Nenhum lote ativo");
        return [];
      }
    } catch (error: any) {
      addLog(`❌ Erro ao buscar lotes: ${error.message}`);
      setStatus("Erro ao buscar lotes");
      return null;
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    addLog("🚀 Iniciando testes...");

    const connectionOk = await testConnection();
    if (!connectionOk) {
      setIsLoading(false);
      return;
    }

    const user = await testLogin();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const batches = await testBatches();
    
    addLog("🏁 Testes concluídos!");
    setIsLoading(false);
  };

  useEffect(() => {
    runAllTests();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🔧 Teste Simples - Operador</h1>
      
      <div style={{ 
        padding: '15px', 
        marginBottom: '20px', 
        backgroundColor: isLoading ? '#fff3cd' : '#d4edda',
        border: '1px solid ' + (isLoading ? '#ffeaa7' : '#c3e6cb'),
        borderRadius: '4px'
      }}>
        <strong>Status:</strong> {status}
        {isLoading && <span> (Carregando...)</span>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runAllTests}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            backgroundColor: isLoading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Testando...' : 'Executar Testes'}
        </button>
        
        <button 
          onClick={() => setLogs([])}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          Limpar Logs
        </button>
      </div>

      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '4px',
        border: '1px solid #dee2e6',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        <h3>📋 Logs de Debug:</h3>
        {logs.length === 0 ? (
          <p style={{ color: '#6c757d' }}>Nenhum log ainda...</p>
        ) : (
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {logs.join('\n')}
          </pre>
        )}
      </div>
    </div>
  );
};

export default OperatorTestSimple;