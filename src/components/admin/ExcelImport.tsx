import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Upload, Download, CheckCircle, AlertTriangle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ClipboardImport } from "./ClipboardImport";

interface ImportedPiece {
  batchCode: string;
  pieceCode: string;
  description: string;
  color: string;
  quantity: number;
  row: number;
}

interface ImportResult {
  success: ImportedPiece[];
  errors: { row: number; message: string; data?: any }[];
}

export const ExcelImport = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Mock data - lotes disponíveis para vinculação
  const availableBatches = [
    { id: "L001", name: "Lote A - Janeiro 2024" },
    { id: "L002", name: "Lote B - Janeiro 2024" },
    { id: "L003", name: "Lote C - Janeiro 2024" }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar se é arquivo Excel
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (validTypes.includes(file.type)) {
        setSelectedFile(file);
        setImportResult(null);
        toast({
          title: "Arquivo selecionado",
          description: `${file.name} está pronto para importação`
        });
      } else {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo Excel (.xlsx) ou CSV",
          variant: "destructive"
        });
      }
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const input = fileInputRef.current;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        handleFileSelect({ target: input } as any);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const processExcelFile = async (file: File): Promise<ImportResult> => {
    // Simulação do processamento do arquivo Excel
    // Em produção, aqui seria usado uma biblioteca como SheetJS ou similar
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock result - seria o resultado real do processamento
        const mockResult: ImportResult = {
          success: [
            {
              batchCode: selectedBatch,
              pieceCode: "PC001",
              description: "Peça Importada 1",
              color: "Azul",
              quantity: 50,
              row: 2
            },
            {
              batchCode: selectedBatch,
              pieceCode: "PC002", 
              description: "Peça Importada 2",
              color: "Verde",
              quantity: 75,
              row: 3
            }
          ],
          errors: [
            {
              row: 4,
              message: "Quantidade inválida",
              data: { pieceCode: "PC003", quantity: "abc" }
            }
          ]
        };
        resolve(mockResult);
      }, 2000);
    });
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedBatch) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione um arquivo e um lote de destino",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simular progresso de upload
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const result = await processExcelFile(selectedFile);
      setImportResult(result);
      setUploadProgress(100);

      if (result.success.length > 0) {
        toast({
          title: "Importação concluída",
          description: `${result.success.length} peças importadas com sucesso`
        });
      }

      if (result.errors.length > 0) {
        toast({
          title: "Avisos na importação",
          description: `${result.errors.length} linhas com erro`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro na importação",
        description: "Falha ao processar o arquivo",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      clearInterval(progressInterval);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setSelectedBatch("");
    setImportResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClipboardImportSuccess = (pieces: any[]) => {
    const result: ImportResult = {
      success: pieces,
      errors: []
    };
    setImportResult(result);
    
    toast({
      title: "Importação concluída",
      description: `${pieces.length} peças importadas via copiar/colar`
    });
  };

  const downloadTemplate = () => {
    // Em produção, aqui seria gerado um arquivo Excel template
    toast({
      title: "Download iniciado",
      description: "Modelo de planilha será baixado em breve"
    });
  };

  return (
    <div className="space-y-6">
      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Modelo de Planilha</span>
          </CardTitle>
          <CardDescription>
            Baixe o modelo padrão para importação das peças
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Baixar Modelo Excel
          </Button>
        </CardContent>
      </Card>

      {/* Clipboard Import */}
      <ClipboardImport
        selectedBatch={selectedBatch}
        onImportSuccess={handleClipboardImportSuccess}
      />

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Importar Planilha Excel</CardTitle>
          <CardDescription>
            Importe peças de uma planilha Excel (.xlsx) e vincule ao lote correspondente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Batch Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Lote de Destino *</label>
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o lote para vincular as peças" />
              </SelectTrigger>
              <SelectContent>
                {availableBatches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.id} - {batch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Drop Zone */}
          <div
            className="border-2 border-dashed border-muted rounded-lg p-8 text-center transition-colors hover:border-primary"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <FileSpreadsheet className="h-8 w-8 text-success" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processando...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Arraste um arquivo Excel aqui ou clique para selecionar
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Selecionar Arquivo
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Import Button */}
          {selectedFile && selectedBatch && !isUploading && (
            <Button 
              onClick={handleImport}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              <Upload className="mr-2 h-4 w-4" />
              Importar Peças
            </Button>
          )}

          {/* Format Info */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <h4 className="font-medium mb-2">Formato da planilha:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>• <strong>Coluna A:</strong> Código da Peça (obrigatório)</div>
                <div>• <strong>Coluna B:</strong> Descrição da Peça (obrigatório)</div>
                <div>• <strong>Coluna C:</strong> Cor (opcional)</div>
                <div>• <strong>Coluna D:</strong> Quantidade Planejada (obrigatório)</div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                A primeira linha deve conter os cabeçalhos. Formatos aceitos: .xlsx, .xls, .csv
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span>Resultado da Importação</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Success Summary */}
            {importResult.success.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="font-medium text-success">
                    {importResult.success.length} peças importadas com sucesso
                  </span>
                </div>
                <div className="space-y-2">
                  {importResult.success.map((piece, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-success/10 border border-success/20 rounded">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{piece.pieceCode}</Badge>
                        <span className="text-sm">{piece.description}</span>
                        {piece.color && (
                          <Badge variant="secondary">{piece.color}</Badge>
                        )}
                      </div>
                      <span className="text-sm font-medium">{piece.quantity} un.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors Summary */}
            {importResult.errors.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">
                    {importResult.errors.length} linhas com erro
                  </span>
                </div>
                <div className="space-y-2">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="p-2 bg-destructive/10 border border-destructive/20 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Linha {error.row}</span>
                        <Badge variant="destructive">Erro</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
                      {error.data && (
                        <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                          {JSON.stringify(error.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};