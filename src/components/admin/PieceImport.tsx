
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
      const { error } = await supabase
        .from('pieces')
        .insert(pieces);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${pieces.length} peças importadas com sucesso!`,
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
                  <SelectItem key={batch.id} value={batch.id}>
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
