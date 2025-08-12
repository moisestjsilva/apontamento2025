
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Clipboard, Table, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ColumnMapper } from "./ColumnMapper";

interface ParsedData {
  headers: string[];
  rows: string[][];
}

interface ClipboardImportProps {
  selectedBatch: string;
  onImportSuccess: (pieces: any[]) => void;
}

export const ClipboardImport = ({ selectedBatch, onImportSuccess }: ClipboardImportProps) => {
  const [clipboardData, setClipboardData] = useState<string>("");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const { toast } = useToast();

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setClipboardData(text);
      parseClipboardData(text);
      toast({
        title: "Dados colados",
        description: "Dados foram obtidos da área de transferência"
      });
    } catch (error) {
      toast({
        title: "Erro ao colar",
        description: "Não foi possível acessar a área de transferência",
        variant: "destructive"
      });
    }
  };

  const parseClipboardData = (text: string) => {
    if (!text.trim()) {
      setParsedData(null);
      return;
    }

    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      toast({
        title: "Dados insuficientes",
        description: "É necessário pelo menos uma linha de cabeçalho e uma linha de dados",
        variant: "destructive"
      });
      return;
    }

    // Detectar separador (tab ou vírgula)
    const firstLine = lines[0];
    const separator = firstLine.includes('\t') ? '\t' : ',';

    const headers = firstLine.split(separator).map(h => h.trim());
    const rows = lines.slice(1).map(line => 
      line.split(separator).map(cell => cell.trim())
    );

    setParsedData({ headers, rows });
  };

  const handleTextareaChange = (value: string) => {
    setClipboardData(value);
    parseClipboardData(value);
  };

  const handleProceedToMapping = () => {
    if (!parsedData) return;
    setShowColumnMapper(true);
  };

  const handleMappingComplete = (mappedPieces: any[]) => {
    // Adicionar batch_id a cada peça
    const piecesWithBatch = mappedPieces.map(piece => ({
      ...piece,
      batch_id: selectedBatch
    }));
    
    onImportSuccess(piecesWithBatch);
    setShowColumnMapper(false);
    setClipboardData("");
    setParsedData(null);
  };

  if (showColumnMapper && parsedData) {
    return (
      <ColumnMapper
        data={parsedData}
        selectedBatch={selectedBatch}
        onComplete={handleMappingComplete}
        onCancel={() => setShowColumnMapper(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clipboard className="h-5 w-5" />
          <span>Colar Dados da Planilha</span>
        </CardTitle>
        <CardDescription>
          Cole dados copiados de uma planilha (Excel, Google Sheets, etc.) e configure o mapeamento das colunas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Paste Button */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handlePaste}
            className="flex-1"
          >
            <Clipboard className="mr-2 h-4 w-4" />
            Colar da Área de Transferência
          </Button>
        </div>

        {/* Manual Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Ou cole os dados manualmente:
          </label>
          <Textarea
            placeholder="Cole aqui os dados copiados da planilha..."
            value={clipboardData}
            onChange={(e) => handleTextareaChange(e.target.value)}
            className="min-h-[120px] font-mono text-sm"
          />
        </div>

        {/* Data Preview */}
        {parsedData && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Table className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">
                {parsedData.headers.length} colunas, {parsedData.rows.length} linhas detectadas
              </span>
            </div>

            {/* Headers Preview */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Cabeçalhos detectados:</p>
              <div className="flex flex-wrap gap-2">
                {parsedData.headers.map((header, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-background border rounded text-xs"
                  >
                    {header || `Coluna ${index + 1}`}
                  </span>
                ))}
              </div>
            </div>

            {/* Sample Data Preview */}
            {parsedData.rows.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Primeira linha de dados:</p>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  {parsedData.headers.map((header, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="font-medium">{header || `Coluna ${index + 1}:`}</span>
                      <span className="text-muted-foreground">
                        {parsedData.rows[0]?.[index] || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Continue Button */}
            <Button
              onClick={handleProceedToMapping}
              className="w-full"
              disabled={!selectedBatch}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Continuar para Mapeamento de Colunas
            </Button>

            {!selectedBatch && (
              <p className="text-sm text-muted-foreground text-center">
                Selecione um lote de destino para continuar
              </p>
            )}
          </div>
        )}

        {/* Format Info */}
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <h4 className="font-medium mb-2">Como usar:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Copie dados de qualquer planilha (Excel, Google Sheets, etc.)</li>
              <li>• A primeira linha deve conter os cabeçalhos das colunas</li>
              <li>• Os dados devem estar separados por tabs ou vírgulas</li>
              <li>• Após colar, você poderá mapear cada coluna para os campos necessários</li>
            </ul>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};
