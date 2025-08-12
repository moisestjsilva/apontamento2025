
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, FileSpreadsheet, BarChart3, Package, Users } from "lucide-react";
import { BatchList } from "@/components/admin/BatchList";
import { ProductionReports } from "@/components/admin/ProductionReports";
import { BatchForm } from "@/components/admin/BatchForm";
import { UserManagement } from "@/components/admin/UserManagement";
import { PieceImport } from "@/components/admin/PieceImport";

const Admin = () => {
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleBatchCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Sistema de Produção</h1>
                <p className="text-sm text-muted-foreground">Painel do Administrador</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowUserManagement(true)}
              >
                <Users className="mr-2 h-4 w-4" />
                Gerenciar Usuários
              </Button>
              <Button 
                onClick={() => setShowBatchForm(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Lote
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="batches" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="batches" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Lotes</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center space-x-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Importar</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Relatórios</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="batches" className="space-y-6">
            <BatchList key={refreshTrigger} onRefresh={() => setRefreshTrigger(prev => prev + 1)} />
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <PieceImport />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ProductionReports />
          </TabsContent>
        </Tabs>
      </main>

      {/* Batch Form Modal */}
      {showBatchForm && (
        <BatchForm 
          onClose={() => setShowBatchForm(false)} 
          onSuccess={handleBatchCreated}
        />
      )}

      {/* User Management Modal */}
      {showUserManagement && (
        <UserManagement 
          open={showUserManagement} 
          onClose={() => setShowUserManagement(false)} 
        />
      )}
    </div>
  );
};

export default Admin;
