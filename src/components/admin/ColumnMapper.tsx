
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ParsedData {
  headers: string[];
  rows: string[][];
}

interface ColumnMapping {
  [key: string]: string;
}

interface ColumnMapperProps {
  data: ParsedData;
  selectedBatch: string;
  onComplete: (pieces: any[]) => void;
  onCancel: () => void;
}

const REQUIRED_FIELDS = [
  { key: 'code', label: 'Código da Peça', required: true },
  { key: 'description', label: 'Descrição', required: true },
  { key: 'quantity', label: 'Quantidade', required: true },
];

const OPTIONAL_FIELDS = [
  { key: 'color', label: 'Cor', required: false },
];

export const ColumnMapper = ({ data, selectedBatch, onComplete, onCancel }: ColumnMapperProps) => {
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Auto-detect column mappings based on header names
  const autoDetectMappings = () => {
    const detectedMappings: ColumnMapping = {};
    
    data.headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      
      // Mapping logic for common column names
      if (normalizedHeader.includes('codigo') || normalizedHeader.includes('code') || normalizedHeader.includes('cód')) {
        detectedMappings.code = index.toString();
      } else if (normalizedHeader.includes('descri') || normalizedHeader.includes('description') || normalizedHeader.includes('nome')) {
        detectedMappings.description = index.toString();
      } else if (normalizedHeader.includes('quantidade') || normalizedHeader.includes('qtd') || normalizedHeader.includes('quantity')) {
        detectedMappings.quantity = index.toString();
      } else if (normalizedHeader.includes('cor') || normalizedHeader.includes('color')) {
        detectedMappings.color = index.toString();
      }
    });

    setColumnMapping(detectedMappings);
  };

  useState(() => {
    autoDetectMappings();
  });

  const handleMappingChange = (field: string, columnIndex: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: columnIndex
    }));
  };

  const validateMappings = () => {
    const missingRequired = REQUIRED_FIELDS.filter(field => 
      field.required && !columnMapping[field.key]
    );
    return missingRequired;
  };

  const processData = async () => {
    const missingRequired = validateMappings();
    if (missingRequired.length > 0) {
      toast({
        title: "Campos obrigatórios não mapeados",
        description: `Mapeie os campos: ${missingRequired.map(f => f.label).join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const processedPieces = data.rows.map((row, index) => {
        const piece: any = {
          batch_id: selectedBatch,
          produced_quantity: 0 // Default value
        };

        // Map required fields
        REQUIRED_FIELDS.forEach(field => {
          const columnIndex = columnMapping[field.key];
          if (columnIndex !== undefined) {
            let value = row[parseInt(columnIndex)]?.trim();
            
            // Special handling for quantity field
            if (field.key === 'quantity') {
              const numValue = parseInt(value);
              if (isNaN(numValue) || numValue <= 0) {
                throw new Error(`Linha ${index + 2}: Quantidade inválida "${value}"`);
              }
              piece[field.key] = numValue;
            } else {
              if (!value) {
                throw new Error(`Linha ${index + 2}: Campo "${field.label}" é obrigatório`);
              }
              piece[field.key] = value;
            }
          }
        });

        // Map optional fields
        OPTIONAL_FIELDS.forEach(field => {
          const columnIndex = columnMapping[field.key];
          if (columnIndex !== undefined) {
            const value = row[parseInt(columnIndex)]?.trim();
            if (value) {
              piece[field.key] = value;
            }
          }
        });

        return piece;
      });

      onComplete(processedPieces);
      
    } catch (error: any) {
      console.error('Error processing data:', error);
      toast({
        title: "Erro ao processar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const missingRequired = validateMappings();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ArrowRight className="h-5 w-5" />
          <span>Mapeamento de Colunas</span>
        </CardTitle>
        <CardDescription>
          Configure como cada coluna da planilha corresponde aos campos das peças
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Preview */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">
            Dados detectados: {data.headers.length} colunas, {data.rows.length} linhas
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-medium">Colunas:</span>
              <p className="text-muted-foreground">
                {data.headers.map((h, i) => `${i + 1}. ${h || `Coluna ${i + 1}`}`).join(', ')}
              </p>
            </div>
            <div>
              <span className="font-medium">Exemplo (primeira linha):</span>
              <p className="text-muted-foreground">
                {data.rows[0]?.slice(0, 3).join(', ')}...
              </p>
            </div>
          </div>
        </div>

        {/* Field Mapping */}
        <div className="space-y-4">
          <h4 className="font-medium">Mapeamento de Campos</h4>
          
          {/* Required Fields */}
          {REQUIRED_FIELDS.map(field => (
            <div key={field.key} className="space-y-2">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">
                  {field.label}
                </label>
                <Badge variant="destructive" className="text-xs">
                  Obrigatório
                </Badge>
              </div>
              <Select
                value={columnMapping[field.key] || ""}
                onValueChange={(value) => handleMappingChange(field.key, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma coluna" />
                </SelectTrigger>
                <SelectContent>
                  {data.headers.map((header, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">Col {index + 1}</Badge>
                        <span>{header || `Coluna ${index + 1}`}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {/* Optional Fields */}
          {OPTIONAL_FIELDS.map(field => (
            <div key={field.key} className="space-y-2">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">
                  {field.label}
                </label>
                <Badge variant="secondary" className="text-xs">
                  Opcional
                </Badge>
              </div>
              <Select
                value={columnMapping[field.key] || ""}
                onValueChange={(value) => handleMappingChange(field.key, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma coluna (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Não mapear</SelectItem>
                  {data.headers.map((header, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">Col {index + 1}</Badge>
                        <span>{header || `Coluna ${index + 1}`}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {/* Validation Status */}
        {missingRequired.length > 0 && (
          <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">
              Campos obrigatórios não mapeados: {missingRequired.map(f => f.label).join(', ')}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            onClick={processData}
            disabled={missingRequired.length > 0 || isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Importar {data.rows.length} Peças
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>

        {/* Preview of mapped data */}
        {missingRequired.length === 0 && data.rows.length > 0 && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Prévia da primeira peça:</p>
            <div className="text-xs space-y-1">
              {REQUIRED_FIELDS.concat(OPTIONAL_FIELDS).map(field => {
                const columnIndex = columnMapping[field.key];
                if (columnIndex !== undefined) {
                  const value = data.rows[0]?.[parseInt(columnIndex)];
                  return (
                    <div key={field.key} className="flex justify-between">
                      <span className="font-medium">{field.label}:</span>
                      <span className="text-muted-foreground">{value || "—"}</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
