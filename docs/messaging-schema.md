# Messaging System Database Schema

## Hierarchy Structure

```
Firestore Database
│
├── users/                          # User profiles & presence
│   └── {userId}/
│       ├── name: string
│       ├── email: string
│       ├── role: string (user/admin/super_admin)
│       ├── avatar: string (URL or null)
│       ├── status: string (online/offline/away)
│       ├── lastSeen: timestamp
│       └── createdAt: timestamp
│
├── channels/                       # Chat channels
│   └── {channelId}/
│       ├── name: string
│       ├── description: string
│       ├── icon: string (emoji)
│       ├── type: string (public/private/direct)
│       ├── members: array (userIds - for private channels)
│       ├── createdBy: string (userId)
│       ├── createdAt: timestamp
│       ├── lastMessage: string (preview)
│       ├── lastMessageAt: timestamp
│       └── lastMessageBy: string (userName)
│
├── channels/{channelId}/messages/  # Messages subcollection (hierarchical)
│   └── {messageId}/
│       ├── content: string
│       ├── senderId: string
│       ├── senderName: string
│       ├── senderEmail: string
│       ├── senderRole: string
│       ├── createdAt: timestamp
│       ├── updatedAt: timestamp
│       ├── isEdited: boolean
│       ├── replyTo: string (messageId or null)
│       ├── attachments: array [{name, url, type, size}]
│       └── reactions: map {emoji: [userIds]}
│
└── userChannels/                   # User's channel memberships (for quick lookup)
    └── {userId}/
        └── channels/
            └── {channelId}/
                ├── joinedAt: timestamp
                ├── lastRead: timestamp
                └── unreadCount: number
```

## Benefits of This Structure

1. **Hierarchical Messages**: Messages are subcollection of channels - better for scaling
2. **Real-time Efficiency**: Only subscribe to messages of active channel
3. **User Presence**: Track online/offline status
4. **Unread Counts**: Per-user unread tracking
5. **Private Channels**: Member-based access control
6. **Message Threads**: Reply-to support for conversations
