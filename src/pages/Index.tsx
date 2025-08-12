import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, Settings, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <Package className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Sistema de Apontamento de Produção</h1>
              <p className="text-muted-foreground">Gestão e controle de produção industrial</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-4">Selecione seu perfil de acesso</h2>
            <p className="text-muted-foreground">
              Escolha o módulo apropriado para sua função no sistema de produção
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Admin Card */}
            <Card className="cursor-pointer transition-all hover:bg-muted/50 hover:scale-105 border-2 hover:border-primary">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Settings className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Administrador</CardTitle>
                <CardDescription>
                  Gerencie lotes, peças e relatórios de produção
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 mb-6">
                  <div className="flex items-center space-x-2 text-sm">
                    <Package className="h-4 w-4 text-primary" />
                    <span>Cadastro de lotes e peças</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span>Relatórios de produtividade</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Gestão de usuários</span>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate("/admin")}
                  className="w-full bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  Acessar Painel Admin
                </Button>
              </CardContent>
            </Card>

            {/* Operator Card */}
            <Card className="cursor-pointer transition-all hover:bg-muted/50 hover:scale-105 border-2 hover:border-accent">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-2xl">Apontador</CardTitle>
                <CardDescription>
                  Registre a produção e retrabalhos das peças
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 mb-6">
                  <div className="flex items-center space-x-2 text-sm">
                    <Package className="h-4 w-4 text-accent" />
                    <span>Apontamento de produção</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Settings className="h-4 w-4 text-accent" />
                    <span>Registro de retrabalhos</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-accent" />
                    <span>Acompanhamento visual</span>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate("/operator")}
                  className="w-full bg-accent hover:bg-accent/90"
                  size="lg"
                >
                  Acessar Apontamento
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Test Section */}
          <div className="mt-12">
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader className="text-center">
                <CardTitle className="text-lg text-yellow-800">🔧 Área de Testes</CardTitle>
                <CardDescription className="text-yellow-700">
                  Ferramentas para debug e teste do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button 
                    onClick={() => navigate("/operator-test")}
                    variant="outline"
                    className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                  >
                    Teste Operador (React)
                  </Button>
                  <Button 
                    onClick={() => navigate("/operator-test-simple")}
                    variant="outline"
                    className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                  >
                    Teste Simples
                  </Button>
                  <Button 
                    onClick={() => window.open('/test-supabase.html', '_blank')}
                    variant="outline"
                    className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                  >
                    Teste HTML Puro
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Section */}
          <div className="mt-16 text-center">
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Sistema de Apontamento de Produção</h3>
                <p className="text-sm text-muted-foreground">
                  Controle total da sua produção industrial com apontamentos em tempo real, 
                  gestão de retrabalhos e relatórios de produtividade. Interface otimizada 
                  para chão de fábrica com design responsivo e intuitivo.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
