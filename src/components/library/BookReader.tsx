import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Configuração do Worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface BookReaderProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
  resourceId: string; // Adicionado ID para salvar no banco
}

const BookReader: React.FC<BookReaderProps> = ({ isOpen, onClose, pdfUrl, title, resourceId }) => {
  const { user } = useAuth();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2); // Começa um pouco maior
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Carregar Progresso Salvo ao Abrir
  useEffect(() => {
    if (isOpen && user && resourceId) {
      const loadProgress = async () => {
        const { data, error } = await supabase
          .from('resource_progress')
          .select('last_page')
          .eq('user_id', user.id)
          .eq('resource_id', resourceId)
          .maybeSingle();

        if (data && data.last_page) {
          setPageNumber(data.last_page);
        }
      };
      loadProgress();
    }
  }, [isOpen, user, resourceId]);

  // 2. Salvar Progresso (com Debounce para não salvar a cada clique rápido)
  useEffect(() => {
    if (!user || !resourceId || pageNumber === 1) return;

    // Cancela save anterior se houver
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    setIsSaving(true);
    
    // Espera 1 segundo após o usuário parar de mudar a página para salvar
    saveTimeoutRef.current = setTimeout(async () => {
      await supabase.from('resource_progress').upsert({
        user_id: user.id,
        resource_id: resourceId,
        last_page: pageNumber,
        updated_at: new Date().toISOString()
      });
      setIsSaving(false);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [pageNumber, user, resourceId]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
  }

  function changePage(offset: number) {
    setPageNumber(prevPage => Math.min(Math.max(1, prevPage + offset), numPages || 1));
  }

  // Atalhos de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') changePage(1);
      if (e.key === 'ArrowLeft') changePage(-1);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, numPages]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* TELA CHEIA: 
          - w-screen h-screen: Ocupa tudo.
          - max-w-none: Remove limite de largura do Shadcn.
          - rounded-none: Remove bordas arredondadas.
          - border-none: Remove bordas.
      */}
      <DialogContent className="w-screen h-screen max-w-none m-0 p-0 rounded-none border-none bg-[#121212] flex flex-col overflow-hidden focus:outline-none">
        <VisuallyHidden><DialogTitle>{title}</DialogTitle></VisuallyHidden>

        {/* Topbar Flutuante (Estilo Kindle) */}
        <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-black/80 to-transparent z-50 flex items-center justify-between px-6 transition-opacity hover:opacity-100 opacity-0 md:opacity-100">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/10">
              <X className="w-6 h-6" />
            </Button>
            <h2 className="text-white/90 font-medium text-lg truncate max-w-[300px] hidden sm:block">{title}</h2>
          </div>

          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-3 py-1 border border-white/10">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-white/90 w-12 text-center font-mono">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white" onClick={() => setScale(s => Math.min(3.0, s + 0.2))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="w-10">
             {isSaving && <Loader2 className="w-4 h-4 animate-spin text-white/30" />}
          </div>
        </div>

        {/* Área de Leitura */}
        <div className="flex-1 overflow-auto flex justify-center bg-[#121212] relative no-scrollbar">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-white/50 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p>Abrindo seu livro...</p>
            </div>
          )}

          <div className="py-20 px-4 min-h-full flex items-center">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={null}
              error={<div className="text-red-400 mt-20 text-center">Não foi possível carregar o PDF.</div>}
              className="shadow-2xl"
            >
              <Page 
                pageNumber={pageNumber} 
                scale={scale} 
                renderTextLayer={false} 
                renderAnnotationLayer={false}
                className="shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                loading=""
              />
            </Document>
          </div>
        </div>

        {/* Rodapé Fixo (Navegação) */}
        <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center justify-center z-50">
          <div className="flex items-center gap-8 bg-[#1e1e1e] px-6 py-2 rounded-full shadow-2xl border border-white/5">
            <Button 
              variant="ghost" 
              onClick={() => changePage(-1)} 
              disabled={pageNumber <= 1}
              className="text-white hover:bg-white/10 hover:text-white rounded-full h-10 w-10 p-0"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <div className="text-center">
              <span className="text-white font-bold text-xl">{pageNumber}</span>
              <span className="text-white/40 text-sm mx-1">/</span>
              <span className="text-white/40 text-sm">{numPages || '--'}</span>
            </div>

            <Button 
              variant="ghost" 
              onClick={() => changePage(1)} 
              disabled={pageNumber >= (numPages || 1)}
              className="text-white hover:bg-white/10 hover:text-white rounded-full h-10 w-10 p-0"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookReader;