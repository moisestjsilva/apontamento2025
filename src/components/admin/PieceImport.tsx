
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Upload, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClipboardImport } from "./ClipboardImport";

interface Batch {
  id: string;
  code: string;
  name: string;
}

export const PieceImport = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('id, code, name')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBatches(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar lotes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lotes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSuccess = async (pieces: any[]) => {
    try {
      // Verificar se existem combinações código+cor duplicadas no lote
      const { data: existingPieces, error: checkError } = await supabase
        .from('pieces')
        .select('code, color')
        .eq('batch_id', pieces[0]?.batch_id);

      if (checkError) throw checkError;

      // Criar set de combinações existentes (código|cor)
      const existingCombinations = new Set(
        existingPieces?.map(p => `${p.code}|${p.color || 'sem_cor'}`) || []
      );

      const duplicates = [];
      const newPieces = [];

      // Separar peças novas das existentes baseado em código+cor
      for (const piece of pieces) {
        const combination = `${piece.code}|${piece.color || 'sem_cor'}`;
        if (existingCombinations.has(combination)) {
          duplicates.push(piece);
        } else {
          newPieces.push(piece);
        }
      }

      let insertedCount = 0;
      let updatedCount = 0;

      // Inserir peças novas (código+cor únicos)
      if (newPieces.length > 0) {
        const { error: insertError } = await supabase
          .from('pieces')
          .insert(newPieces);

        if (insertError) throw insertError;
        insertedCount = newPieces.length;
      }

      // Atualizar peças existentes (mesma combinação código+cor)
      if (duplicates.length > 0) {
        for (const piece of duplicates) {
          const { error: updateError } = await supabase
            .from('pieces')
            .update({ 
              quantity: piece.quantity,
              description: piece.description
            })
            .eq('batch_id', piece.batch_id)
            .eq('code', piece.code)
            .eq('color', piece.color || null);

          if (updateError) throw updateError;
          updatedCount++;
        }
      }

      // Mostrar resultado
      let message = "";
      if (insertedCount > 0 && updatedCount > 0) {
        message = `${insertedCount} peças novas importadas e ${updatedCount} peças existentes atualizadas!`;
      } else if (insertedCount > 0) {
        message = `${insertedCount} peças importadas com sucesso!`;
      } else if (updatedCount > 0) {
        message = `${updatedCount} peças existentes atualizadas!`;
      } else {
        message = "Nenhuma peça foi processada.";
      }

      toast({
        title: "Sucesso",
        description: message,
      });

    } catch (error: any) {
      console.error('Erro ao importar peças:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao importar peças",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Batch Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5" />
            <span>Importar Peças</span>
          </CardTitle>
          <CardDescription>
            Importe peças em lote através de planilhas ou dados copiados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Selecione o lote de destino *
            </label>
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um lote para importar as peças" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((batch) => (
                  <SelectItem 
                    key={batch.id} 
                    value={batch.id}
                    className="focus:bg-green-100 focus:text-black focus:font-bold data-[highlighted]:bg-green-100 data-[highlighted]:text-black data-[highlighted]:font-bold hover:bg-green-100 hover:text-black hover:font-bold data-[state=checked]:bg-green-200 data-[state=checked]:text-black data-[state=checked]:font-bold transition-all duration-200"
                  >
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{batch.code}</Badge>
                      <span>{batch.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedBatch && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                {batches.length === 0 
                  ? "Nenhum lote disponível. Crie um lote primeiro." 
                  : "Selecione um lote para continuar com a importação."
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Methods */}
      {selectedBatch && (
        <ClipboardImport 
          selectedBatch={selectedBatch}
          onImportSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
};
