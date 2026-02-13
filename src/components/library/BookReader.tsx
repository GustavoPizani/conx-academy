import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut, 
  Maximize, Minimize, Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Document, Page, pdfjs } from 'react-pdf';
import { useToast } from '@/hooks/use-toast';
import { ReactReader, ReactReaderStyle } from 'react-reader';

// CSS do PDF
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface BookReaderProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  resourceId: string;
  type: 'book_pdf' | 'training_pdf' | 'ebook_epub' | 'podcast_audio';
}

const BookReader: React.FC<BookReaderProps> = ({ isOpen, onClose, url, title, resourceId, type }) => {
  const { toast } = useToast();
  
  // -- ESTADOS GERAIS --
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // -- ESTADOS PDF --
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);

  // -- ESTADOS EPUB --
  const [location, setLocation] = useState<string | number>(0);
  const [epubSize, setEpubSize] = useState(100);
  const [rendition, setRendition] = useState<any>(null);
  const tocRef = useRef<any>(null); // Referência para TOC se necessário

  // 1. Carregar Progresso
  useEffect(() => {
    if (isOpen && resourceId) {
      const savedData = localStorage.getItem(`progress_${resourceId}`);
      if (savedData) {
        if (type.includes('pdf')) {
           const parsed = parseInt(savedData, 10);
           if (!isNaN(parsed) && parsed > 0) setPageNumber(parsed);
        } else if (type === 'ebook_epub') {
           setLocation(savedData); 
        }
      }
    }
  }, [isOpen, resourceId, type]);

  // 2. Salvar Progresso (PDF)
  useEffect(() => {
    if (type.includes('pdf') && resourceId && pageNumber > 0) {
      localStorage.setItem(`progress_${resourceId}`, pageNumber.toString());
    }
  }, [pageNumber, resourceId, type]);

  // PDF Helpers
  function onPdfLoadSuccess({ numPages: nextNumPages }: { numPages: number }) {
    setNumPages(nextNumPages);
    setIsLoadingPdf(false);
    if (pageNumber > nextNumPages) setPageNumber(1);
  }

  const changePdfPage = useCallback((offset: number) => {
    setPageNumber(prev => Math.max(1, Math.min(prev + offset, numPages || 1)));
  }, [numPages]);

  // ePub Helpers
  const onLocationChanged = (loc: string | number) => {
    setLocation(loc);
    if (resourceId) localStorage.setItem(`progress_${resourceId}`, loc.toString());
  };

  const changeEpubFontSize = (delta: number) => {
    const newSize = Math.max(80, Math.min(200, epubSize + delta));
    setEpubSize(newSize);
    if (rendition) rendition.themes.fontSize(`${newSize}%`);
  };

  // Styles Customizados para o ReactReader (Forçar Preto e Laranja)
  const ownStyles = {
    ...ReactReaderStyle,
    arrow: {
      ...ReactReaderStyle.arrow,
      color: '#ea580c', // Laranja (primary do tailwind geralmente é orange-600)
    },
    arrowHover: {
      ...ReactReaderStyle.arrowHover,
      color: '#f97316', // Laranja mais claro no hover
    },
    readerArea: {
      ...ReactReaderStyle.readerArea,
      backgroundColor: '#000', // Fundo Preto atrás do livro
      transition: undefined,
    },
    titleArea: {
      ...ReactReaderStyle.titleArea,
      color: '#ccc',
    },
    tocArea: {
      ...ReactReaderStyle.tocArea,
      background: '#111',
    },
    tocButtonExpanded: {
      ...ReactReaderStyle.tocButtonExpanded,
      background: '#222',
    },
    tocButtonBar: {
      ...ReactReaderStyle.tocButtonBar,
      background: '#fff',
    },
    tocButton: {
      ...ReactReaderStyle.tocButton,
      color: 'white',
    },
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
      const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', handleFs);
      return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  // Atalhos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === 'Escape') onClose();
        if (type.includes('pdf')) {
            if (e.key === 'ArrowRight') changePdfPage(1);
            if (e.key === 'ArrowLeft') changePdfPage(-1);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, changePdfPage, onClose, type]);

  if (!isOpen) return null;

  const isPdf = type.includes('pdf');
  const isEpub = type === 'ebook_epub';

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col h-screen w-screen overflow-hidden select-none">
      
      {/* HEADER */}
      <div className={`
        transition-all duration-300 ease-in-out
        bg-zinc-900/90 backdrop-blur border-b border-zinc-800 shadow-md px-4 py-3 flex justify-between items-center z-50
        ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 absolute top-0 w-full pointer-events-none'}
      `}>
        <div className="flex items-center gap-4 flex-1">
          <Button 
            variant="ghost" 
            className="flex items-center gap-1 pl-2 pr-3 text-primary hover:text-primary hover:bg-primary/10 transition-colors font-medium"
            onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); onClose(); }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          <span className="text-sm font-semibold text-zinc-300 border-l border-zinc-700 pl-4 truncate max-w-[150px] md:max-w-md">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-zinc-950/50 p-1 rounded-md border border-zinc-800">
          
          {/* Controles PDF */}
          {isPdf && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100" onClick={() => setScale(s => Math.max(0.6, s - 0.1))}><ZoomOut className="w-4 h-4" /></Button>
              <span className="text-xs w-10 text-center font-mono font-medium text-zinc-400">{Math.round(scale * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100" onClick={() => setScale(s => Math.min(2.5, s + 0.1))}><ZoomIn className="w-4 h-4" /></Button>
            </>
          )}

          {/* Controles ePub */}
          {isEpub && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100" onClick={() => changeEpubFontSize(-10)} title="Diminuir Fonte">
                <Type className="w-3 h-3" />
              </Button>
              <span className="text-xs w-10 text-center font-mono font-medium text-zinc-400">{epubSize}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100" onClick={() => changeEpubFontSize(10)} title="Aumentar Fonte">
                <Type className="w-5 h-5" />
              </Button>
            </>
          )}

          <div className="w-px h-5 bg-zinc-700 mx-1 hidden sm:block" />
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hidden sm:flex">
            {isFullscreen ? <Minimize className="w-4 h-4"/> : <Maximize className="w-4 h-4"/>}
          </Button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-hidden relative flex justify-center bg-black w-full h-full">
        
        {/* PDF */}
        {isPdf && (
          <div className="flex-1 overflow-auto flex justify-center py-8" onClick={() => setShowControls(!showControls)}>
             {isLoadingPdf && (
                <div className="absolute inset-0 flex items-center justify-center z-0"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              )}
              <div className="bg-white shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)] transition-transform duration-200 ease-out select-text relative z-10 h-fit" onClick={e => e.stopPropagation()}>
                <Document file={url} onLoadSuccess={onPdfLoadSuccess} loading={null}>
                  <Page pageNumber={pageNumber} scale={scale} renderTextLayer={true} renderAnnotationLayer={true} className="bg-white" width={window.innerWidth < 640 ? window.innerWidth - 16 : undefined} />
                </Document>
              </div>
          </div>
        )}

        {/* === MODO EPUB (PÁGINA PRETA COM BORDA LARANJA) === */}
        {isEpub && (
          <div 
            className="flex-1 overflow-auto flex justify-center py-8 bg-black" 
            onClick={() => setShowControls(!showControls)}
          >
            {/* Container da "Página" com borda laranja */}
            <div 
              className="bg-black border border-primary shadow-[0_0_40px_-10px_rgba(234,88,12,0.3)] relative z-10 overflow-hidden"
              style={{
                width: window.innerWidth < 640 ? '95%' : '800px',
                height: '100%',
                minHeight: '80vh'
              }}
              onClick={e => e.stopPropagation()}
            >
              <ReactReader
                url={url}
                location={location}
                locationChanged={onLocationChanged}
                readerStyles={ownStyles} // Aqui estão as suas setas laranjas
                getRendition={(r) => {
                  setRendition(r);
                  r.themes.fontSize(`${epubSize}%`);
                  r.themes.register('dark', {
                    body: { 
                      color: '#e4e4e7 !important', // Texto claro (zinc-200)
                      background: '#000000 !important', // Fundo preto interno
                      padding: '40px !important',
                      'font-family': 'Helvetica, Arial, sans-serif !important'
                    }, 
                    p: { 
                      'line-height': '1.6 !important',
                      'color': '#e4e4e7 !important'
                    }
                  });
                  r.themes.select('dark');
                }}
                showToc={false}
                epubOptions={{
                  flow: 'paginated', 
                  width: '100%', 
                  height: '100%',
                  spread: 'none', 
                  minSpreadWidth: 10000 
                }}
              />
            </div>
          </div>
        )}

      </div>

      {/* FOOTER PDF (ePub tem controles laterais nativos agora estilizados em laranja) */}
      {isPdf && (
        <div className={`
          transition-all duration-300 ease-in-out
          bg-zinc-900/90 backdrop-blur border-t border-zinc-800 shadow-2xl p-4 z-50
          flex flex-col gap-4 sm:grid sm:grid-cols-3 sm:items-center
          ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 absolute bottom-0 w-full pointer-events-none'}
        `}>
          <div className="order-2 sm:order-1 flex justify-start">
               <Button variant="outline" onClick={() => changePdfPage(-1)} disabled={pageNumber <= 1 || isLoadingPdf} className="w-full sm:w-auto bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-primary transition-colors">
              <ChevronLeft className="w-4 h-4 mr-1 sm:-ml-1" /> <span className="sm:inline">Anterior</span>
            </Button>
          </div>
          <div className="order-1 sm:order-2 w-full flex flex-col gap-2 items-center mx-auto max-w-md px-4">
             <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden relative">
                <div className="h-full bg-primary transition-all duration-500 ease-out rounded-full relative z-10" style={{ width: `${numPages ? (pageNumber / numPages) * 100 : 0}%` }} />
             </div>
             <p className="text-xs text-center font-medium text-zinc-500 tabular-nums">{isLoadingPdf ? 'Calculando...' : `Página ${pageNumber} de ${numPages || '--'}`}</p>
          </div>
          <div className="order-3 sm:order-3 flex justify-end">
            <Button variant="default" onClick={() => changePdfPage(1)} disabled={pageNumber >= (numPages || 0) || isLoadingPdf} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-95">
              <span className="sm:inline">Próximo</span> <ChevronRight className="w-4 h-4 ml-1 sm:-mr-1" />
            </Button>
          </div>
        </div>
      )}

    </div>
  );
};

export default BookReader;