// src/lib/messages-store.ts
import { create } from "zustand";
import { dm, type DmConversation, type DmMessage } from "./api";

interface MessagesState {
  conversations: DmConversation[];
  messagesById: Record<string, DmMessage[]>;
  loadingConversations: boolean;
  loadingThread: string | null;

  loadConversations: () => Promise<void>;
  loadThread: (userId: string) => Promise<void>;
  sendMessage: (receiverId: string, content: string, postId?: string) => Promise<DmMessage>;
  markAsRead: (userId: string) => Promise<void>;
  prependMessages: (userId: string, messages: DmMessage[]) => void;
}

export const useMessages = create<MessagesState>((set, get) => ({
  conversations: [],
  messagesById: {},
  loadingConversations: false,
  loadingThread: null,

  loadConversations: async () => {
    set({ loadingConversations: true });
    try {
      const { conversations } = await dm.conversations();
      set({ conversations });
    } finally {
      set({ loadingConversations: false });
    }
  },

  loadThread: async (userId: string) => {
    set({ loadingThread: userId });
    try {
      const { messages } = await dm.thread(userId, 25);
      // API returns newest first, reverse for display (oldest at top)
      const reversed = [...messages.data].reverse();
      set((s) => ({
        messagesById: { ...s.messagesById, [userId]: reversed },
      }));
    } finally {
      set({ loadingThread: null });
    }
  },

  sendMessage: async (receiverId: string, content: string, postId?: string) => {
    const { message } = await dm.send(receiverId, content, postId);

    set((s) => {
      const existing = s.messagesById[receiverId] ?? [];
      return {
        messagesById: {
          ...s.messagesById,
          [receiverId]: [...existing, message],
        },
      };
    });

    // Update conversation list (move to top, update last_message)
    set((s) => {
      const updated = s.conversations.map((c) => {
        if (c.other_user.id === receiverId) {
          return {
            ...c,
            last_message: {
              id: message.id,
              content: message.content,
              sender_id: message.sender_id,
              read_at: null,
              created_at: message.created_at,
            },
            last_message_at: message.created_at,
          };
        }
        return c;
      });
      updated.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      return { conversations: updated };
    });

    return message;
  },

  markAsRead: async (userId: string) => {
    await dm.markRead(userId);
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.other_user.id === userId ? { ...c, unread_count: 0 } : c
      ),
    }));
  },

  prependMessages: (userId: string, messages: DmMessage[]) => {
    set((s) => {
      const existing = s.messagesById[userId] ?? [];
      return {
        messagesById: {
          ...s.messagesById,
          [userId]: [...messages, ...existing],
        },
      };
    });
  },
}));

/** Derived: total unread count across all conversations */
export function useUnreadCount(): number {
  return useMessages((s) => s.conversations.reduce((sum, c) => sum + c.unread_count, 0));
}
