import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Clock, Package } from "lucide-react";

interface Piece {
  id: string;
  code: string;
  description: string;
  color: string;
  planned: number;
  produced: number;
  rework: number;
  completed: boolean;
}

interface PieceCardProps {
  piece: Piece;
  onClick: () => void;
}

export const PieceCard = ({ piece, onClick }: PieceCardProps) => {
  const getStatusColor = () => {
    if (piece.completed) return "default";
    if (piece.rework > 0) return "destructive";
    return "secondary";
  };

  const getStatusIcon = () => {
    if (piece.completed) return <CheckCircle2 className="h-5 w-5" />;
    if (piece.rework > 0) return <AlertTriangle className="h-5 w-5" />;
    return <Clock className="h-5 w-5" />;
  };

  const getStatusText = () => {
    if (piece.completed) return "Concluído";
    if (piece.rework > 0) return "Retrabalho";
    return "Em Produção";
  };

  const progressPercentage = Math.min((piece.produced / piece.planned) * 100, 100);
  
  // Função para gerar uma cor de fundo mais clara baseada na cor do lote
  const getLightBackgroundColor = () => {
    if (!piece.color || !piece.color.startsWith('#')) return undefined;
    
    // Converter hex para RGB e adicionar transparência
    return `${piece.color}15`; // 15 é aproximadamente 10% de opacidade em hex
  };

  return (
    <Card 
      className={`cursor-pointer transition-all active:scale-95 touch-manipulation ${
        piece.completed 
          ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
          : piece.rework > 0 
            ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
            : 'hover:bg-muted/50'
      }`}
      onClick={onClick}
      style={{
        borderColor: piece.color.startsWith('#') ? piece.color : undefined,
        borderWidth: piece.color.startsWith('#') ? '2px' : undefined,
        backgroundColor: (!piece.completed && piece.rework === 0) ? getLightBackgroundColor() : undefined
      }}
    >
      <CardContent className="p-6">
        {/* Header with code and status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-primary" />
            <Badge variant="outline" className="text-base font-mono">
              {piece.code}
            </Badge>
          </div>
          <Badge variant={getStatusColor()} className="px-3 py-1">
            {getStatusIcon()}
            <span className="ml-2 font-medium">{getStatusText()}</span>
          </Badge>
        </div>

        {/* Description */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-1">{piece.description}</h3>
        </div>

        {/* Production numbers */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{piece.produced}</div>
            <div className="text-sm text-muted-foreground">Produzido</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-muted-foreground">{piece.planned}</div>
            <div className="text-sm text-muted-foreground">Planejado</div>
          </div>
          {piece.rework > 0 && (
            <div className="text-center">
              <div className="text-xl font-semibold text-orange-600">{piece.rework}</div>
              <div className="text-sm text-muted-foreground">Retrabalho</div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div 
              className="h-3 rounded-full transition-all duration-300"
              style={{ 
                width: `${progressPercentage}%`,
                backgroundColor: piece.completed 
                  ? '#10b981' // verde para peças completas
                  : piece.rework > 0 
                    ? '#f97316' // laranja para peças com retrabalho
                    : piece.color.startsWith('#') ? piece.color : '#6366f1' // cor do lote ou roxo padrão
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};