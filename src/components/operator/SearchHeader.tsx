import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, QrCode, Package } from "lucide-react";
import { BarcodeScanner } from "./BarcodeScanner";

interface SearchHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onBarcodeScanned: (code: string) => void;
}

export const SearchHeader = ({ searchTerm, onSearchChange, onBarcodeScanned }: SearchHeaderProps) => {
  const [showScanner, setShowScanner] = useState(false);

  const handleBarcodeScanned = (code: string) => {
    onBarcodeScanned(code);
    setShowScanner(false);
  };

  return (
    <>
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Apontamento</h1>
                <p className="text-sm text-muted-foreground">Registre a produção</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Search and Scanner */}
      <div className="container mx-auto px-4 py-4 space-y-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex space-x-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar peça ou lote..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowScanner(true)}
                className="h-12 w-12 shrink-0"
              >
                <QrCode className="h-6 w-6" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <BarcodeScanner
        isOpen={showScanner}
        onScan={handleBarcodeScanned}
        onClose={() => setShowScanner(false)}
      />
    </>
  );
};