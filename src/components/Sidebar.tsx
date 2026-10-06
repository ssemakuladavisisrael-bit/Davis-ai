import React, { useState, useMemo } from 'react';
import { 
  Sparkles,
  Image as ImageIcon, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Search, 
  Sliders, 
  HelpCircle, 
  ChevronRight, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { Conversation, ServerStatus, ModelChoice } from '../types';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenImageStudio: () => void;
  serverStatus: ServerStatus | null;
  model: ModelChoice;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  isOpen,
  onClose,
  onOpenSettings,
  onOpenHelp,
  onOpenImageStudio,
  serverStatus,
  model,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Group conversations chronologically
  const groupedConversations = useMemo(() => {
    const filtered = conversations.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;

    const groups: {
      today: Conversation[];
      yesterday: Conversation[];
      previous7Days: Conversation[];
      older: Conversation[];
    } = {
      today: [],
      yesterday: [],
      previous7Days: [],
      older: [],
    };

    filtered.forEach((conv) => {
      const diff = now - conv.updatedAt;
      if (diff < oneDay) {
        groups.today.push(conv);
      } else if (diff < 2 * oneDay) {
        groups.yesterday.push(conv);
      } else if (diff < sevenDays) {
        groups.previous7Days.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [conversations, searchQuery]);

  const startEditing = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveEditing = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteConversation(id);
  };

  const renderConversationItem = (conv: Conversation) => {
    const isActive = conv.id === activeId;
    const isEditing = editingId === conv.id;

    return (
      <div
        key={conv.id}
        onClick={() => {
          onSelectConversation(conv.id);
          onClose();
        }}
        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
          isActive
            ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700/60'
            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <MessageSquare
            className={`w-3.5 h-3.5 shrink-0 ${
              isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'
            }`}
          />
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editTitle.trim()) onRenameConversation(conv.id, editTitle.trim());
                  setEditingId(null);
                }
                if (e.key === 'Escape') setEditingId(null);
              }}
              autoFocus
              className="bg-slate-900 text-white text-xs px-1.5 py-0.5 rounded border border-indigo-500 outline-none w-full"
            />
          ) : (
            <span className="truncate">{conv.title || 'Untitled Chat'}</span>
          )}
        </div>

        {/* Action icons on hover or active */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {isEditing ? (
            <>
              <button
                onClick={(e) => saveEditing(conv.id, e)}
                className="p-1 rounded text-emerald-400 hover:text-emerald-300 hover:bg-slate-700"
                title="Save title"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={cancelEditing}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700"
                title="Cancel"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
              <button
                onClick={(e) => startEditing(conv, e)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="Rename conversation"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => handleDelete(conv.id, e)}
                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                title="Delete conversation"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in"
        />
      )}

      {/* Main Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 sm:w-80 bg-[#0b1329] text-slate-200 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header: Brand + Close button */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <button onClick={onOpenImageStudio} className="mt-3 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2.5 text-xs font-bold flex items-center justify-center gap-2"><ImageIcon className="w-4 h-4" /> Image Studio</button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 ring-1 ring-white/10">
              <span className="font-extrabold text-lg tracking-tight">D</span>
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>Davis AI</span>
                <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                  {model === 'gemini-3.1-flash-lite' ? '⚡ Flash Lite' : '🧠 3.8 Flash'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">Conversational Assistant</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              <span>New Chat</span>
            </div>
            <span className="text-[10px] bg-indigo-700/60 px-1.5 py-0.5 rounded text-indigo-200">
              ⌘K
            </span>
          </button>
        </div>

        {/* Search Chats */}
        {conversations.length > 2 && (
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 text-xs no-scrollbar">
          {conversations.length === 0 ? (
            <div className="text-center py-10 px-4 text-slate-500 space-y-2">
              <MessageSquare className="w-6 h-6 mx-auto opacity-40 text-slate-400" />
              <p className="text-xs">No conversations yet.</p>
              <p className="text-[11px] text-slate-600">Start a new chat to begin exploring!</p>
            </div>
          ) : (
            <>
              {groupedConversations.today.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Today
                  </div>
                  {groupedConversations.today.map(renderConversationItem)}
                </div>
              )}

              {groupedConversations.yesterday.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Yesterday
                  </div>
                  {groupedConversations.yesterday.map(renderConversationItem)}
                </div>
              )}

              {groupedConversations.previous7Days.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Previous 7 Days
                  </div>
                  {groupedConversations.previous7Days.map(renderConversationItem)}
                </div>
              )}

              {groupedConversations.older.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Older
                  </div>
                  {groupedConversations.older.map(renderConversationItem)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          {/* Server / API Connection status */}
          <button
            onClick={onOpenHelp}
            className={`w-full flex items-center justify-between p-2 rounded-xl text-[11px] transition-colors cursor-pointer ${
              serverStatus?.hasApiKey
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-950/60'
                : 'bg-amber-950/40 text-amber-300 border border-amber-800/40 hover:bg-amber-950/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${serverStatus?.hasApiKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-medium">
                {serverStatus?.hasApiKey ? `${model === 'gemini-3.1-flash-lite' ? 'Flash Lite' : 'Flash 3.8'} Active` : 'Setup Gemini Key'}
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          {/* Quick action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onOpenHelp}
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer border border-slate-800"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Guide</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer border border-slate-800"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
