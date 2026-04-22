import React, { useState, useRef, useEffect } from 'react';
import { Send, Phone, User, Bot, Landmark, Paperclip, X, FileText } from 'lucide-react';

const AGENTROUTER_API_KEY = import.meta.env.VITE_AGENTROUTER_API_KEY || "sk-p91kHsKgqzNHEWNGlZKVZLiKO79RnASl1g3FpB1xnCgOQcp2";

const BASE_URL = "https://api.agentrouter.org/v1";
const MODEL_NAME = "deepseek-v3.2";   // ← Bisa diganti: deepseek-r1-0528 / glm-4.5 / deepseek-v3.1

const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 5) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      retries++;
      if (retries >= maxRetries) throw error;
      const delay = Math.pow(2, retries - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Halo! Saya adalah **Chatbot Konsultan Pajak by Jefri**. Saya siap membantu Anda memahami dan menyelesaikan masalah perpajakan, baik di Indonesia maupun skala global. Apa yang ingin Anda tanyakan hari ini?'
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<any>(null);
  const [uploadError, setUploadError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const systemInstruction = `
Anda adalah Chatbot Konsultan Pajak by Jefri, seorang ahli pajak berpengalaman di Indonesia.
Gaya bicara: ramah, sabar, jelas, profesional, dan mudah dipahami orang awam maupun pengusaha.
Spesialisasi: PPh, PPN, SPT, e-Faktur, e-Bupot, tax planning, PMK terbaru, UU HPP, pajak UMKM, dan pajak internasional.

Selalu jawab dalam bahasa Indonesia yang baik.
Gunakan emoji secukupnya agar ramah.
Di akhir setiap jawaban, tambahkan:
"Catatan: Jawaban ini bukan merupakan pengganti konsultasi pajak resmi. Untuk kepastian hukum, silakan hubungi Jefri di WA 082354506569."
`.trim();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 5MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Format tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      setAttachment({
        url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        base64,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user' as const,
      text: input.trim(),
      attachment: attachment ? { ...attachment } : null
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachment(null);
    setUploadError('');
    setIsLoading(true);

    try {
      const apiMessages = [
        { role: "system", content: systemInstruction },
        ...messages.map(msg => ({
          role: msg.sender === 'bot' ? 'assistant' : 'user',
          content: msg.text || `[File: ${msg.attachment?.name || 'dokumen'}]`
        })),
        {
          role: "user",
          content: userMessage.attachment?.mimeType?.startsWith('image/')
            ? [
                { type: "text", text: userMessage.text || "Mohon analisis dokumen/gambar ini terkait pajak." },
                {
                  type: "image_url",
                  image_url: { url: `data:${userMessage.attachment.mimeType};base64,${userMessage.attachment.base64}` }
                }
              ]
            : (userMessage.text || `[File terlampir: ${userMessage.attachment?.name}]`)
        }
      ];

      const response = await fetchWithRetry(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AGENTROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 4096,
        })
      });

      const botText = response.choices?.[0]?.message?.content;

      if (botText) {
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: botText }]);
      } else {
        throw new Error("Tidak ada respons");
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Maaf, terjadi kesalahan saat menghubungi AI. Silakan coba lagi atau hubungi Jefri langsung via WhatsApp.'
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
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
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
          <span>Hubungi Jefri</span>
        </a>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-100">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex-shrink-0 mx-2 mt-1">
                {msg.sender === 'user' ? (
                  <div className="bg-slate-400 w-8 h-8 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              <div className={`p-4 rounded-2xl shadow text-[15px] leading-relaxed
                ${msg.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 rounded-tl-none'}`}>
                {msg.attachment && (
                  <div className="mb-3">
                    {msg.attachment.url ? (
                      <img src={msg.attachment.url} alt="preview" className="max-h-64 rounded-lg" />
                    ) : (
                      <div className="flex items-center gap-2 bg-slate-100 p-3 rounded-lg">
                        <FileText className="w-6 h-6 text-slate-500" />
                        <span className="text-sm">{msg.attachment.name}</span>
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
            <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-2">
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
            <div className="mb-3 bg-slate-50 border rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {attachment.url ? <img src={attachment.url} className="w-12 h-12 object-cover rounded" /> : <FileText className="w-8 h-8 text-slate-500" />}
                <span className="text-sm text-slate-700 truncate max-w-[200px]">{attachment.name}</span>
              </div>
              <button onClick={() => setAttachment(null)} className="p-2 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {uploadError && <div className="text-red-500 text-xs mb-2">{uploadError}</div>}

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <div className="flex-1 relative bg-slate-50 border border-slate-300 rounded-3xl focus-within:border-blue-500 focus-within:ring-1">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute left-4 top-4 text-slate-500 hover:text-blue-600">
                <Paperclip className="w-5 h-5" />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf" />

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }}}
                placeholder="Tanyakan masalah pajak atau unggah dokumen..."
                className="w-full bg-transparent py-4 pl-14 pr-5 focus:outline-none resize-y min-h-[54px] max-h-32 text-[15px]"
              />
            </div>

            <button type="submit" disabled={isLoading || (!input.trim() && !attachment)}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-3xl p-4 transition-all">
              <Send className="w-5 h-5" />
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-4">
            AI dapat memberikan informasi yang belum tentu 100% akurat. Untuk kepastian hukum, hubungi Jefri.
          </p>
        </div>
      </footer>
    </div>
  );
}
