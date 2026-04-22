import React, { useState, useRef, useEffect } from 'react';
import { Send, Phone, User, Bot, Landmark, Paperclip, X, FileText } from 'lucide-react';

// Mengambil API Key dari environment variable (.env) atau menggunakan default (hanya untuk testing)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyD9vOjWeSVefwHPCVbuthsFfTD9xh2CrPc";
const GEMINI_MODEL = "gemini-1.5-flash";

const fetchGemini = async (history: any[], currentText: string, attachment: Attachment | null) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const parts: any[] = [{ text: currentText }];
  
  if (attachment && attachment.mimeType.startsWith('image/')) {
    parts.push({
      inline_data: {
        mime_type: attachment.mimeType,
        data: attachment.base64
      }
    });
  }

  const body = {
    contents: [
      ...history,
      {
        role: 'user',
        parts: parts
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gagal menghubungi Gemini');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
};

interface Attachment {
  url: string | null;
  base64: string;
  mimeType: string;
  name: string;
}

interface Message {
  id: number;
  sender: 'bot' | 'user';
  text: string;
  attachment?: Attachment | null;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: 'bot',
      text: 'Halo! Saya adalah **Chatbot Konsultan Pajak by Jefri**. Saya siap membantu Anda memahami masalah perpajakan Anda. Apa yang ingin Anda tanyakan?'
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploadError, setUploadError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const systemInstruction = `Anda adalah Chatbot Konsultan Pajak by Jefri, seorang ahli pajak berpengalaman di Indonesia. Jawablah pertanyaan seputar pajak (PPh, PPN, SPT, dll) dengan ramah, profesional, dan mudah dipahami. Gunakan bahasa Indonesia. Di akhir setiap jawaban, tambahkan: "Catatan: Jawaban ini bukan merupakan pengganti konsultasi pajak resmi. Untuk kepastian hukum, silakan hubungi Jefri di WA 082354506569."`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    if (file.size > 5 * 1024 * 1024) { setUploadError('Maks 5MB'); return; }
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']; // Gemini AI Studio supports these images
    if (!validTypes.includes(file.type)) { setUploadError('Format tidak didukung (Gunakan JPG/PNG)'); return; }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      setAttachment({
        url: URL.createObjectURL(file),
        base64,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;

    const userMsgText = input.trim();
    const userMsgAttachment = attachment ? { ...attachment } : null;

    const userMessage: Message = {
      id: Date.now(),
      sender: 'user',
      text: userMsgText,
      attachment: userMsgAttachment
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
      // Siapkan riwayat chat untuk Gemini
      const history = [
        {
          role: 'user',
          parts: [{ text: "INSTRUKSI SISTEM: " + systemInstruction + "\n\nMohon ingat instruksi di atas untuk seluruh percakapan ini." }]
        },
        {
          role: 'model',
          parts: [{ text: "Baik, saya mengerti. Saya akan bertugas sebagai Chatbot Konsultan Pajak by Jefri dan membantu urusan perpajakan Anda dengan ramah dan profesional." }]
        },
        ...messages.slice(1).map(msg => ({
          role: msg.sender === 'bot' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        }))
      ];

      const botText = await fetchGemini(history, userMsgText || "Mohon analisis file di atas.", userMsgAttachment);

      if (botText) {
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: botText }]);
      } else {
        throw new Error("Tidak ada respons dari AI.");
      }
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: `Maaf, terjadi kesalahan: ${error.message}. Silakan coba lagi atau hubungi Jefri via WhatsApp.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatText = (text: string) => {
    let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    safeText = safeText.replace(/\n/g, '<br/>');
    safeText = safeText.replace(/(\n|^)\s*[-*]\s+/g, '$1• ');
    return <span dangerouslySetInnerHTML={{ __html: safeText }} />;
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans w-full overflow-hidden">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-md p-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-white p-2 rounded-full shadow-sm">
            <Landmark className="text-blue-900 w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl">Chatbot Pajak</h1>
            <p className="text-blue-200 text-sm -mt-1">by Jefri</p>
          </div>
        </div>
        
        <a href="https://wa.me/6282354506569" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 px-4 py-2 rounded-full text-sm font-medium transition-colors">
          <Phone className="w-4 h-4" />
          <span className="hidden sm:inline">Hubungi Jefri</span>
        </a>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-100">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[90%] md:max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex-shrink-0 mx-2 mt-1">
                {msg.sender === 'user' ? (
                  <div className="bg-slate-400 w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                    <User className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              <div className={`p-4 rounded-2xl shadow-sm text-[15px] leading-relaxed
                ${msg.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 rounded-tl-none text-slate-800'}`}>
                {msg.attachment && (
                  <div className="mb-3">
                    {msg.attachment.url ? (
                      <img src={msg.attachment.url} alt="preview" className="max-h-64 rounded-lg object-contain bg-slate-50 border" />
                    ) : (
                      <div className="flex items-center gap-2 bg-slate-100 p-3 rounded-lg border border-slate-200">
                        <FileText className="w-6 h-6 text-slate-500" />
                        <span className="text-sm truncate max-w-[150px]">{msg.attachment.name}</span>
                      </div>
                    )}
                  </div>
                )}
                {msg.text && formatText(msg.text)}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-2 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-300" />
              </div>
              <span className="text-slate-500 text-sm">Sedang berpikir...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t p-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          {attachment && (
            <div className="mb-3 bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {attachment.url ? (
                  <img src={attachment.url} className="w-10 h-10 object-cover rounded border" />
                ) : (
                  <FileText className="w-8 h-8 text-blue-500" />
                )}
                <span className="text-sm text-blue-800 font-medium truncate max-w-[200px]">{attachment.name}</span>
              </div>
              <button 
                type="button"
                onClick={() => setAttachment(null)} 
                className="p-1.5 hover:bg-blue-200 text-blue-600 rounded-full transition-colors"
                aria-label="Remove attachment"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {uploadError && <div className="text-red-500 text-xs mb-2 font-medium bg-red-50 p-2 rounded-lg border border-red-100">{uploadError}</div>}

          <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
            <div className="flex-1 relative bg-slate-50 border border-slate-300 rounded-2xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="absolute left-3 bottom-3 text-slate-400 hover:text-blue-600 p-1 rounded-full transition-colors"
                title="Unggah dokumen"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/jpeg,image/png,image/webp,application/pdf" 
              />

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' && !e.shiftKey) { 
                    e.preventDefault(); 
                    handleSendMessage(e); 
                  }
                }}
                placeholder="Tanyakan masalah pajak atau unggah dokumen..."
                className="w-full bg-transparent py-3 pl-11 pr-4 focus:outline-none resize-none min-h-[48px] max-h-32 text-[15px] text-slate-700"
                rows={1}
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading || (!input.trim() && !attachment)}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl p-3 shadow-md hover:shadow-lg disabled:shadow-none transition-all"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          <p className="text-center text-[10px] text-slate-400 mt-3 uppercase tracking-wider font-medium">
            Saran & Kepastian Hukum: Hubungi Jefri di 082354506569
          </p>
        </div>
      </footer>
    </div>
  );
}
