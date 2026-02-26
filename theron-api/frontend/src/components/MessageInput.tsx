import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Image, X, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface Props {
  onSend: (content: string, images?: File[]) => void;
  isStreaming: boolean;
}

export default function MessageInput({ onSend, isStreaming }: Props) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
    }
  }, [text]);

  function handleSend() {
    if ((!text.trim() && images.length === 0) || isStreaming) return;
    onSend(text.trim(), images.length > 0 ? images : undefined);
    setText('');
    setImages([]);
    setPreviews([]);
  }

  // Detect if user is on mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  function handleKeyDown(e: React.KeyboardEvent) {
    // On mobile, Enter always creates newline (no Shift key available)
    // On desktop, Enter sends, Shift+Enter creates newline
    if (e.key === 'Enter' && !isMobile && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function addImages(files: FileList | File[] | null) {
    if (!files) return;
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    setImages(prev => [...prev, ...newFiles]);
    newFiles.forEach(f => {
      const reader = new FileReader();
      reader.onload = (e) => setPreviews(prev => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  // Handle paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    if (imageItems.length > 0) {
      e.preventDefault();
      const files = imageItems.map(item => item.getAsFile()).filter(Boolean) as File[];
      addImages(files);
    }
  }, []);

  return (
    <div className="border-t border-border bg-card p-4 shrink-0">
      {/* Image previews */}
      {previews.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {previews.map((preview, i) => (
            <div key={i} className="relative group">
              <img src={preview} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Image upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-accent"
          title="Attach images"
        >
          <Image size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addImages(e.target.files)}
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Message Theron... (Shift+Enter for new line)"
          rows={1}
          disabled={isStreaming}
          className={cn(
            'flex-1 resize-none bg-background border border-input rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring transition-all',
            isStreaming && 'opacity-50 cursor-not-allowed'
          )}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={(!text.trim() && images.length === 0) || isStreaming}
          className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5 text-center">
        {isMobile ? 'Tap send button or paste images' : 'Enter to send • Shift+Enter for new line • Paste images directly'}
      </p>
    </div>
  );
}
