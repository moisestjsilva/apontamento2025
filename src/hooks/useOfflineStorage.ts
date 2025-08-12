import { useState, useEffect } from "react";

interface ProductionRecord {
  id: string;
  pieceId: string;
  production: number;
  rework: number;
  reason: string;
  operatorName: string;
  timestamp: Date;
  synced: boolean;
}

export const useOfflineStorage = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingRecords, setPendingRecords] = useState<ProductionRecord[]>([]);

  useEffect(() => {
    // Load pending records from localStorage
    const saved = localStorage.getItem('pendingProductionRecords');
    if (saved) {
      setPendingRecords(JSON.parse(saved));
    }

    // Set up online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Save pending records to localStorage whenever they change
    localStorage.setItem('pendingProductionRecords', JSON.stringify(pendingRecords));

    // Auto-sync when online
    if (isOnline && pendingRecords.some(record => !record.synced)) {
      syncPendingRecords();
    }
  }, [pendingRecords, isOnline]);

  const saveRecord = (data: Omit<ProductionRecord, 'id' | 'timestamp' | 'synced'>) => {
    const record: ProductionRecord = {
      ...data,
      id: Date.now().toString(),
      timestamp: new Date(),
      synced: false
    };

    setPendingRecords(prev => [...prev, record]);

    // If online, try to sync immediately
    if (isOnline) {
      syncRecord(record);
    }

    return record;
  };

  const syncRecord = async (record: ProductionRecord) => {
    try {
      // Importar supabase dinamicamente para evitar problemas de inicialização
      const { supabase } = await import('@/integrations/supabase/client');
      
      console.log('Syncing record:', record);
      
      // Inserir registro no Supabase
      const { error } = await supabase
        .from('production_records')
        .insert({
          piece_id: record.pieceId,
          operator_name: record.operatorName,
          quantity_produced: record.production,
          quantity_rework: record.rework > 0 ? record.rework : null,
          notes: record.reason || null,
        });

      if (error) throw error;
      
      // Atualizar quantidade produzida da peça apenas se houver produção
      if (record.production > 0) {
        const { error: updateError } = await supabase
          .from('pieces')
          .select('produced_quantity')
          .eq('id', record.pieceId)
          .single();
          
        if (!updateError) {
          const { data: pieceData } = await supabase
            .from('pieces')
            .select('produced_quantity')
            .eq('id', record.pieceId)
            .single();
            
          if (pieceData) {
            const newProducedQuantity = pieceData.produced_quantity + record.production;
            
            await supabase
              .from('pieces')
              .update({ produced_quantity: newProducedQuantity })
              .eq('id', record.pieceId);
          }
        }
      }
      
      // Marcar como sincronizado
      setPendingRecords(prev => 
        prev.map(r => r.id === record.id ? { ...r, synced: true } : r)
      );
    } catch (error) {
      console.error('Failed to sync record:', error);
    }
  };

  const syncPendingRecords = async () => {
    const unsyncedRecords = pendingRecords.filter(record => !record.synced);
    
    for (const record of unsyncedRecords) {
      await syncRecord(record);
    }
  };

  const clearSyncedRecords = () => {
    setPendingRecords(prev => prev.filter(record => !record.synced));
  };

  return {
    isOnline,
    pendingRecords,
    saveRecord,
    syncPendingRecords,
    clearSyncedRecords,
    hasPendingRecords: pendingRecords.some(record => !record.synced)
  };
};