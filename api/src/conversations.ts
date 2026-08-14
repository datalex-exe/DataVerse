import { Hono } from 'hono';
import { Bindings, Variables } from './types';
import { authMiddleware } from './auth';

const conversationsApp = new Hono<{ Bindings: Bindings; Variables: Variables }>();

conversationsApp.use('*', authMiddleware);

// CREATE A NEW CONVERSATION (1:1 DM or Group)
conversationsApp.post('/', async (c) => {
  const currentUserId = c.get('userId');
  try {
    const { is_group, members, group_name } = await c.req.json(); // members: string[] of target user IDs

    if (!members || !Array.isArray(members) || members.length === 0) {
      return c.json({ error: 'Members array is required' }, 400);
    }

    if (is_group && (!group_name || !group_name.trim())) {
      return c.json({ error: 'Group name is required for group conversations' }, 400);
    }

    // Add current user to the members array
    const allMembers = Array.from(new Set([...members, currentUserId]));

    // If it's a 1:1 conversation (2 members total), check if one already exists
    if (!is_group && allMembers.length === 2) {
      const otherUserId = allMembers.find(id => id !== currentUserId)!;

      const isBlocked = await c.env.DB.prepare(`
        SELECT 1 FROM user_blocks 
        WHERE (blocker_id = ? AND blocked_id = ?) 
           OR (blocker_id = ? AND blocked_id = ?)
      `)
        .bind(currentUserId, otherUserId, otherUserId, currentUserId)
        .first();

      if (isBlocked) {
        return c.json({ error: 'Cannot start conversation. One of the users has blocked the other.' }, 403);
      }

      const existingDM = await c.env.DB.prepare(`
        SELECT conversation_id FROM conversation_members
        WHERE user_id = ? AND conversation_id IN (
          SELECT conversation_id FROM conversation_members WHERE user_id = ?
        ) AND conversation_id IN (
          SELECT id FROM conversations WHERE is_group = 0
        )
        LIMIT 1
      `)
        .bind(currentUserId, otherUserId)
        .first<any>();

      if (existingDM) {
        return c.json({ conversationId: existingDM.conversation_id, alreadyExists: true });
      }
    }

    const conversationId = crypto.randomUUID();
    const createdAt = Date.now();
    const cleanGroupName = is_group ? group_name.trim() : null;

    // 1. Create conversation record
    await c.env.DB.prepare(
      'INSERT INTO conversations (id, is_group, group_name, creator_id, created_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(conversationId, is_group ? 1 : 0, cleanGroupName, is_group ? currentUserId : null, createdAt)
      .run();

    // 2. Insert conversation members
    const memberStatements = allMembers.map(userId => {
      return c.env.DB.prepare(
        'INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)'
      ).bind(conversationId, userId);
    });

    await c.env.DB.batch(memberStatements);

    // 3. For group chats: insert a system welcome message
    if (is_group) {
      const creator = await c.env.DB.prepare('SELECT display_name, username FROM users WHERE id = ?')
        .bind(currentUserId)
        .first<any>();
      const creatorName = creator?.display_name || creator?.username || 'Someone';
      const systemMsgId = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO messages (id, conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(systemMsgId, conversationId, 'system', `${creatorName} created the group "${cleanGroupName}".`, createdAt).run();
    }

    return c.json({ conversationId, alreadyExists: false });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to create conversation' }, 500);
  }
});


// GET USER'S CONVERSATIONS
conversationsApp.get('/', async (c) => {
  const currentUserId = c.get('userId');
  try {
    // 1. Fetch conversations this user is part of, sorted by last message time or creation time
    const { results: conversations } = await c.env.DB.prepare(`
      SELECT c.id, c.is_group, c.group_name, c.creator_id, c.created_at,
        (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_body,
        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_time,
        (SELECT sender_id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_sender_id
      FROM conversations c
      JOIN conversation_members cm ON c.id = cm.conversation_id
      WHERE cm.user_id = ?
        AND (
          c.is_group = 1
          OR NOT EXISTS (
            SELECT 1 FROM conversation_members cm2
            JOIN user_blocks ub ON (ub.blocker_id = cm.user_id AND ub.blocked_id = cm2.user_id)
                                OR (ub.blocker_id = cm2.user_id AND ub.blocked_id = cm.user_id)
            WHERE cm2.conversation_id = c.id AND cm2.user_id != cm.user_id
          )
        )
      ORDER BY COALESCE(last_message_time, c.created_at) DESC
    `)
      .bind(currentUserId)
      .all<any>();

    if (!conversations || conversations.length === 0) {
      return c.json({ conversations: [] });
    }

    // 2. Fetch member details for all retrieved conversations in a single batch
    const conversationIds = conversations.map(convo => convo.id);
    const placeholders = conversationIds.map(() => '?').join(',');

    const { results: members } = await c.env.DB.prepare(`
      SELECT cm.conversation_id, cm.nickname, u.id AS user_id, u.username, u.display_name, u.avatar_url, u.is_verified
      FROM conversation_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.conversation_id IN (${placeholders})
    `)
      .bind(...conversationIds)
      .all<any>();

    // 3. Assemble conversations and member details
    const result = conversations.map(convo => {
      const convoMembers = members
        .filter(m => m.conversation_id === convo.id)
        .map(m => ({
          id: m.user_id,
          username: m.username,
          display_name: m.display_name,
          avatar_url: m.avatar_url,
          is_verified: !!m.is_verified,
          nickname: m.nickname || null
        }));

      return {
        id: convo.id,
        is_group: convo.is_group > 0,
        group_name: convo.group_name || null,
        creator_id: convo.creator_id || null,
        created_at: convo.created_at,
        last_message: convo.last_message_body ? {
          body: convo.last_message_body,
          created_at: convo.last_message_time,
          sender_id: convo.last_message_sender_id
        } : null,
        members: convoMembers
      };
    });

    return c.json({ conversations: result });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});


// GET MESSAGES HISTORY FOR A CONVERSATION
conversationsApp.get('/:id/messages', async (c) => {
  const conversationId = c.req.param('id');
  const currentUserId = c.get('userId');

  try {
    // Verify membership first (bypass for public room IDs starting with room_)
    let isMember = false;
    if (conversationId.startsWith('room_')) {
      isMember = true;
      // Ensure the room exists in D1
      try {
        await c.env.DB.prepare(
          'INSERT OR IGNORE INTO conversations (id, is_group, created_at) VALUES (?, 1, ?)'
        )
          .bind(conversationId, Date.now())
          .run();
      } catch (err) {
        console.error('Failed to auto-insert room in history route:', err);
      }
    } else {
      // Check if Top Admin
      const caller = await c.env.DB.prepare('SELECT is_top_admin FROM users WHERE id = ?')
        .bind(currentUserId)
        .first<any>();
      const isTopAdmin = caller && caller.is_top_admin === 1;

      if (isTopAdmin) {
        isMember = true;
      } else {
        const check = await c.env.DB.prepare(
          'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?'
        )
          .bind(conversationId, currentUserId)
          .first();
        isMember = !!check;
      }
    }

    if (!isMember) {
      return c.json({ error: 'Unauthorized conversation member access' }, 403);
    }

    // Retrieve last 100 messages (use LEFT JOIN and COALESCE to allow system messages)
    const { results: messages } = await c.env.DB.prepare(`
      SELECT m.id, m.conversation_id, m.sender_id, m.body, m.created_at,
        COALESCE(u.username, m.sender_id) AS username, u.display_name, u.avatar_url, u.is_verified
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
      LIMIT 100
    `)
      .bind(conversationId)
      .all<any>();

    return c.json({ messages: messages || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// UPDATE SECURE MEDIA MESSAGE ACCESS PERMISSIONS
conversationsApp.put('/messages/:messageId/access', async (c) => {
  const messageId = c.req.param('messageId');
  const userId = c.get('userId');
  try {
    const { allow_save, allow_forward } = await c.req.json();

    // 1. Fetch message
    const msg = await c.env.DB.prepare('SELECT * FROM messages WHERE id = ?')
      .bind(messageId)
      .first<any>();

    if (!msg) {
      return c.json({ error: 'Message not found' }, 404);
    }

    // 2. Verify ownership
    if (msg.sender_id !== userId) {
      return c.json({ error: 'Forbidden: Only the sender can modify access' }, 403);
    }

    // 3. Parse JSON body to ensure it's secure media
    let bodyObj: any;
    try {
      bodyObj = JSON.parse(msg.body);
    } catch {
      return c.json({ error: 'Invalid operation: Message is not secure media' }, 400);
    }

    if (!bodyObj || bodyObj.type !== 'secure_media') {
      return c.json({ error: 'Invalid operation: Message is not secure media' }, 400);
    }

    // 4. Update fields
    bodyObj.allow_save = !!allow_save;
    bodyObj.allow_forward = !!allow_forward;

    const updatedBody = JSON.stringify(bodyObj);

    // 5. Update D1
    await c.env.DB.prepare('UPDATE messages SET body = ? WHERE id = ?')
      .bind(updatedBody, messageId)
      .run();

    // 6. Push real-time WS update to DO
    const conversationId = msg.conversation_id;
    const doId = c.env.CHAT_ROOM.idFromName(conversationId);
    const stub = c.env.CHAT_ROOM.get(doId);

    // Forward HTTP broadcast request to DO
    const broadcastUrl = `http://durableobject/broadcast_access_update`;
    await stub.fetch(new Request(broadcastUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, body: updatedBody })
    }));

    return c.json({ success: true, body: bodyObj });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// SEND MESSAGE VIA HTTP REST
conversationsApp.post('/:id/messages', async (c) => {
  const userId = c.get('userId');
  const conversationId = c.req.param('id');
  const { body } = await c.req.json();

  if (!body || body.trim() === '') {
    return c.json({ error: 'Message body cannot be empty' }, 400);
  }

  try {
    // Check if any member has blocked the sender or the sender has blocked them (bidirectional blocks)
    const blocks = await c.env.DB.prepare(`
      SELECT 1 FROM user_blocks ub
      JOIN conversation_members cm1 ON cm1.conversation_id = ? AND cm1.user_id = ub.blocker_id
      JOIN conversation_members cm2 ON cm2.conversation_id = ? AND cm2.user_id = ub.blocked_id
    `)
      .bind(conversationId, conversationId)
      .first();

    if (blocks) {
      return c.json({ error: 'Cannot send message. One of the users has blocked the other.' }, 403);
    }

    // 1. Verify caller is a member and check chat restrictions
    const userRow = await c.env.DB.prepare(
      'SELECT u.chat_restricted_until, cm.conversation_id FROM users u JOIN conversation_members cm ON u.id = cm.user_id WHERE cm.conversation_id = ? AND cm.user_id = ?'
    )
      .bind(conversationId, userId)
      .first<any>();

    if (!userRow) {
      return c.json({ error: 'Unauthorized conversation member access' }, 403);
    }

    if (userRow.chat_restricted_until && userRow.chat_restricted_until > Date.now()) {
      return c.json({ error: `Your chat access is restricted until ${new Date(userRow.chat_restricted_until).toLocaleString()}` }, 403);
    }

    const messageId = crypto.randomUUID();
    const createdAt = Date.now();

    // 2. Insert into messages table
    await c.env.DB.prepare(
      'INSERT INTO messages (id, conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(messageId, conversationId, userId, body.trim(), createdAt)
      .run();

    // 3. Fetch sender info for real-time broadcast
    const sender = await c.env.DB.prepare(
      'SELECT username, display_name, avatar_url, is_verified FROM users WHERE id = ?'
    )
      .bind(userId)
      .first<any>();

    const messagePayload = {
      id: messageId,
      conversation_id: conversationId,
      sender_id: userId,
      body: body.trim(),
      created_at: createdAt,
      username: sender.username,
      display_name: sender.display_name,
      avatar_url: sender.avatar_url,
      is_verified: !!sender.is_verified
    };

    // 4. Push real-time WS update to DO
    const doId = c.env.CHAT_ROOM.idFromName(conversationId);
    const stub = c.env.CHAT_ROOM.get(doId);
    const broadcastUrl = `http://durableobject/broadcast_message`;
    await stub.fetch(new Request(broadcastUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: messagePayload })
    }));

    return c.json({ success: true, message: messagePayload });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// UNSEND (DELETE) A MESSAGE
conversationsApp.delete('/messages/:messageId', authMiddleware, async (c) => {
  const messageId = c.req.param('messageId');
  const userId = c.get('userId');

  try {
    // 1. Fetch message to verify ownership and check for media
    const msg = await c.env.DB.prepare('SELECT * FROM messages WHERE id = ?')
      .bind(messageId)
      .first<any>();

    if (!msg) {
      return c.json({ error: 'Message not found' }, 404);
    }

    // 2. Only sender can unsend (or top admin)
    const caller = await c.env.DB.prepare('SELECT is_top_admin FROM users WHERE id = ?')
      .bind(userId)
      .first<any>();
    const isTopAdmin = caller && caller.is_top_admin === 1;

    if (msg.sender_id !== userId && !isTopAdmin) {
      return c.json({ error: 'Forbidden: Only the sender can unsend this message' }, 403);
    }

    // 3. If secure media, delete from D1 media_files too
    try {
      const bodyObj = JSON.parse(msg.body);
      if (bodyObj && bodyObj.type === 'secure_media' && bodyObj.url) {
        await c.env.DB.prepare('DELETE FROM media_files WHERE key = ?')
          .bind(bodyObj.url)
          .run();
      }
    } catch {
      // Not JSON or not media — ignore
    }

    // 4. Delete from D1
    await c.env.DB.prepare('DELETE FROM messages WHERE id = ?')
      .bind(messageId)
      .run();

    // 5. Broadcast real-time unsend event to all chat participants via DO
    const conversationId = msg.conversation_id;
    const doId = c.env.CHAT_ROOM.idFromName(conversationId);
    const stub = c.env.CHAT_ROOM.get(doId);
    await stub.fetch(new Request('http://durableobject/broadcast_unsend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, conversationId })
    }));

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// LEAVE OR KICK MEMBER FROM GROUP CONVERSATION
conversationsApp.delete('/:id/members/:targetUserId', async (c) => {
  const conversationId = c.req.param('id');
  const targetUserId = c.req.param('targetUserId');
  const currentUserId = c.get('userId');
  try {
    // 1. Verify it's a group
    const convo = await c.env.DB.prepare('SELECT is_group, creator_id, group_name FROM conversations WHERE id = ?')
      .bind(conversationId).first<any>();
    if (!convo) return c.json({ error: 'Conversation not found' }, 404);
    if (!convo.is_group) return c.json({ error: 'Cannot leave/kick from a 1:1 DM' }, 400);

    const isSelfLeave = targetUserId === 'me' || targetUserId === currentUserId;
    
    // Check Top Admin
    const callerUser = await c.env.DB.prepare('SELECT is_top_admin FROM users WHERE id = ?')
      .bind(currentUserId).first<any>();
    const isTopAdmin = callerUser && callerUser.is_top_admin === 1;

    const isAdmin = convo.creator_id === currentUserId || isTopAdmin;

    if (!isSelfLeave && !isAdmin) {
      return c.json({ error: 'Forbidden: Only the group admin can kick members' }, 403);
    }

    const resolvedTargetId = isSelfLeave ? currentUserId : targetUserId;

    // 2. Remove member
    await c.env.DB.prepare('DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?')
      .bind(conversationId, resolvedTargetId).run();

    // 3. Broadcast system message
    const targetUserRecord = await c.env.DB.prepare('SELECT display_name, username FROM users WHERE id = ?')
      .bind(resolvedTargetId).first<any>();
    const targetUserName = targetUserRecord?.display_name || targetUserRecord?.username || 'Someone';

    const systemMsgId = crypto.randomUUID();
    const createdAt = Date.now();
    
    let text = '';
    if (isSelfLeave) {
      text = `${targetUserName} left the group.`;
    } else {
      const adminRecord = await c.env.DB.prepare('SELECT display_name, username FROM users WHERE id = ?')
        .bind(currentUserId).first<any>();
      const adminName = adminRecord?.display_name || adminRecord?.username || 'Admin';
      text = `${targetUserName} was kicked from the group by ${adminName}.`;
    }

    await c.env.DB.prepare(
      'INSERT INTO messages (id, conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(systemMsgId, conversationId, 'system', text, createdAt).run();

    // Notify via DO
    try {
      const doId = c.env.CHAT_ROOM.idFromName(conversationId);
      const stub = c.env.CHAT_ROOM.get(doId);
      await stub.fetch(new Request('http://durableobject/broadcast_system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: systemMsgId, conversationId, text, createdAt })
      }));

      // Send kick event to drop connection for kicked member
      await stub.fetch(new Request('http://durableobject/broadcast_kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, kickedUserId: resolvedTargetId })
      }));
    } catch { /* ignore if no DO instance active */ }

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// SET OR UPDATE MEMBER NICKNAME IN CONVERSATION
conversationsApp.put('/:id/members/:targetUserId/nickname', async (c) => {
  const conversationId = c.req.param('id');
  const targetUserId = c.req.param('targetUserId');
  const currentUserId = c.get('userId');
  try {
    const { nickname } = await c.req.json();

    // Verify membership and access
    const convo = await c.env.DB.prepare('SELECT is_group, creator_id FROM conversations WHERE id = ?')
      .bind(conversationId).first<any>();
    if (!convo) return c.json({ error: 'Conversation not found' }, 404);

    const isSelfUpdate = targetUserId === 'me' || targetUserId === currentUserId;
    const resolvedTargetId = isSelfUpdate ? currentUserId : targetUserId;

    // Check caller permission
    const callerUser = await c.env.DB.prepare('SELECT is_top_admin FROM users WHERE id = ?')
      .bind(currentUserId).first<any>();
    const isTopAdmin = callerUser && callerUser.is_top_admin === 1;

    const isAdmin = convo.creator_id === currentUserId || isTopAdmin;

    if (!isSelfUpdate && !isAdmin) {
      return c.json({ error: 'Forbidden: You cannot change this member\'s nickname' }, 403);
    }

    const cleanNickname = nickname && nickname.trim() ? nickname.trim() : null;

    // Update D1
    await c.env.DB.prepare(
      'UPDATE conversation_members SET nickname = ? WHERE conversation_id = ? AND user_id = ?'
    )
      .bind(cleanNickname, conversationId, resolvedTargetId)
      .run();

    // Get user details for DO broadcast
    const userDetail = await c.env.DB.prepare('SELECT username, display_name, avatar_url FROM users WHERE id = ?')
      .bind(resolvedTargetId).first<any>();

    // Notify via DO
    try {
      const doId = c.env.CHAT_ROOM.idFromName(conversationId);
      const stub = c.env.CHAT_ROOM.get(doId);
      await stub.fetch(new Request('http://durableobject/broadcast_nickname_update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          userId: resolvedTargetId,
          nickname: cleanNickname,
          username: userDetail?.username,
          display_name: userDetail?.display_name
        })
      }));
    } catch { /* ignore */ }

    return c.json({ success: true, nickname: cleanNickname });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET ALL GLOBAL CONVERSATIONS (Top Admin audit panel)
conversationsApp.get('/global/all', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const caller = await c.env.DB.prepare('SELECT is_top_admin FROM users WHERE id = ?')
    .bind(userId)
    .first<any>();

  if (!caller || !caller.is_top_admin) {
    return c.json({ error: 'Unauthorized global chats access' }, 403);
  }

  try {
    const { results: convos } = await c.env.DB.prepare(`
      SELECT c.id, c.is_group, c.created_at
      FROM conversations c
      WHERE c.id NOT LIKE 'room_%'
      ORDER BY c.created_at DESC
    `).all<any>();

    if (!convos || convos.length === 0) {
      return c.json({ conversations: [] });
    }

    const convoIds = convos.map(cv => cv.id);
    const placeholders = convoIds.map(() => '?').join(',');
    
    // Fetch members
    const { results: members } = await c.env.DB.prepare(`
      SELECT cm.conversation_id, cm.nickname, u.id, u.username, u.display_name, u.avatar_url, u.is_verified
      FROM conversation_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.conversation_id IN (${placeholders})
    `).bind(...convoIds).all<any>();

    // Fetch last messages using correlated GROUP BY maximum
    const { results: lastMessages } = await c.env.DB.prepare(`
      SELECT m1.conversation_id, m1.body, m1.created_at, m1.sender_id
      FROM messages m1
      JOIN (
        SELECT conversation_id, MAX(created_at) as max_created
        FROM messages
        GROUP BY conversation_id
      ) m2 ON m1.conversation_id = m2.conversation_id AND m1.created_at = m2.max_created
      WHERE m1.conversation_id IN (${placeholders})
    `).bind(...convoIds).all<any>();

    const result = convos.map(cv => {
      const cvMembers = members
        .filter(m => m.conversation_id === cv.id)
        .map(m => ({
          id: m.id,
          username: m.username,
          display_name: m.display_name,
          avatar_url: m.avatar_url,
          is_verified: !!m.is_verified,
          nickname: m.nickname || null
        }));

      const lastMsg = lastMessages.find(m => m.conversation_id === cv.id) || null;

      return {
        id: cv.id,
        is_group: cv.is_group > 0,
        group_name: cv.group_name || null,
        creator_id: cv.creator_id || null,
        created_at: cv.created_at,
        members: cvMembers,
        last_message: lastMsg
      };
    });

    return c.json({ conversations: result });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default conversationsApp;
