import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { Message } from '../../types';
import { Send, X, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TripChatModalProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TripChatModal: React.FC<TripChatModalProps> = ({ tripId, isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !tripId) return;

    // Fetch initial chat history
    api.get(`/trips/${tripId}/messages`).then((res) => {
      setMessages(res.data.messages || []);
    });

    const socket = getSocket();
    const handleNewMessage = (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on(`trip:${tripId}:message`, handleNewMessage);

    return () => {
      socket.off(`trip:${tripId}:message`, handleNewMessage);
    };
  }, [isOpen, tripId]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);
    try {
      const res = await api.post(`/trips/${tripId}/messages`, { content });
      setContent('');
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex h-[480px] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Trip Dispatch Chat
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message bubble stream */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              No messages yet. Send a quick update to dispatch!
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === user?.id;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-slate-400 mb-0.5">
                    {m.sender?.name || (isMe ? 'You' : 'Dispatch')}
                  </span>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                      isMe
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded-bl-none'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Message Input form */}
        <form onSubmit={handleSend} className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type message to manager..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
