import React, { useState } from 'react';
import { Loader2, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const SetupAdmin: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleSetup = async () => {
    setIsLoading(true);

    try {
      // Call edge function with anon key
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      const data = await response.json();

      if (data?.success) {
        setIsComplete(true);
        toast({
          title: 'Sucesso!',
          description: data.message,
        });
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao configurar admin';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            {isComplete ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <Shield className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl text-foreground">
            {isComplete ? 'Configuração Concluída!' : 'Configurar Administrador'}
          </CardTitle>
          <CardDescription>
            {isComplete 
              ? 'O usuário admin foi configurado com sucesso.' 
              : 'Crie o usuário administrador padrão do sistema.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isComplete && (
            <div className="bg-surface p-4 rounded-lg border border-border text-sm">
              <p className="text-muted-foreground mb-2">Será criado o usuário:</p>
              <p className="text-foreground"><strong>Email:</strong> thiago@conxvendas.com.br</p>
              <p className="text-foreground"><strong>Senha:</strong> Conx@2025</p>
              <p className="text-foreground"><strong>Cargo:</strong> Administrador</p>
            </div>
          )}

          {isComplete ? (
            <Button 
              variant="netflix" 
              className="w-full" 
              onClick={() => window.location.href = '/login'}
            >
              Ir para Login
            </Button>
          ) : (
            <Button 
              variant="netflix" 
              className="w-full" 
              onClick={handleSetup}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Configurando...
                </>
              ) : (
                'Criar Administrador'
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupAdmin;
