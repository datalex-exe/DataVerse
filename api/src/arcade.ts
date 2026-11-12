import { Hono } from 'hono';
import { Bindings, Variables } from './types';
import { authMiddleware } from './auth';

const arcadeApp = new Hono<{ Bindings: Bindings; Variables: Variables }>();
arcadeApp.use('*', authMiddleware);

const GAME_NAMES: Record<string, string> = {
  'tic-tac-toe': 'Tic-Tac-Toe',
  'chess': 'Chess',
  'rps': 'Rock Paper Scissors',
  'memory-match': 'Memory Match',
  'higher-lower': 'Higher or Lower',
  'whack-a-mole': 'Whack-a-Mole',
  'coin-toss': 'Coin Toss',
  'spin-wheel': 'Spin Wheel',
  'runner': 'Runner',
  'snake': 'Snake',
  'flappy': 'Flappy',
  'breakout': 'Breakout',
  'closest-guess': 'Closest Guess',
  'dots-boxes': 'Dots and Boxes',
  'connect-four': 'Connect Four',
  'word-duel': 'Word Duel',
  'number-guess': 'Number Guess',
  'reaction-race': 'Reaction Race',
  'checkers': 'Checkers'
};

// Send a game challenge / request to another user
arcadeApp.post('/invite', async (c) => {
  const userId = c.get('userId');
  try {
    const { recipientId, conversationId, gameType } = await c.req.json();
    const selectedGame = gameType || 'tic-tac-toe';
    const gameName = GAME_NAMES[selectedGame] || selectedGame;

    let finalConvoId = conversationId;
    let targetRecipientId = recipientId;

    // If no conversationId provided, find or create 1:1 DM
    if (!finalConvoId && targetRecipientId) {
      const existingDM = await c.env.DB.prepare(`
        SELECT conversation_id FROM conversation_members
        WHERE user_id = ? AND conversation_id IN (
          SELECT conversation_id FROM conversation_members WHERE user_id = ?
        ) AND conversation_id IN (
          SELECT id FROM conversations WHERE is_group = 0
        )
        LIMIT 1
      `).bind(userId, targetRecipientId).first<any>();

      if (existingDM) {
        finalConvoId = existingDM.conversation_id;
      } else {
        finalConvoId = crypto.randomUUID();
        const now = Date.now();
        await c.env.DB.batch([
          c.env.DB.prepare('INSERT INTO conversations (id, is_group, created_at) VALUES (?, 0, ?)').bind(finalConvoId, now),
          c.env.DB.prepare('INSERT INTO conversation_members (conversation_id, user_id, joined_at) VALUES (?, ?, ?)').bind(finalConvoId, userId, now),
          c.env.DB.prepare('INSERT INTO conversation_members (conversation_id, user_id, joined_at) VALUES (?, ?, ?)').bind(finalConvoId, targetRecipientId, now)
        ]);
      }
    }

    if (!finalConvoId) {
      return c.json({ error: 'Either conversationId or recipientId is required' }, 400);
    }

    // Resolve target recipient from conversation if needed
    if (!targetRecipientId) {
      const otherMember = await c.env.DB.prepare(
        'SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ? LIMIT 1'
      ).bind(finalConvoId, userId).first<any>();
      targetRecipientId = otherMember?.user_id;
    }

    const now = Date.now();
    const sender = await c.env.DB.prepare(
      'SELECT display_name, username, avatar_url FROM users WHERE id = ?'
    ).bind(userId).first<any>();

    const challengerInfo = {
      id: userId,
      display_name: sender?.display_name || sender?.username || 'Player',
      username: sender?.username || 'player',
      avatar_url: sender?.avatar_url || null
    };

    const notifId = crypto.randomUUID();
    const notifBody = JSON.stringify({
      gameType: selectedGame,
      gameName,
      conversationId: finalConvoId,
      challenger: challengerInfo
    });

    // 1. Insert notification for recipient
    if (targetRecipientId) {
      await c.env.DB.prepare(
        'INSERT INTO notifications (id, user_id, notifier_id, type, body, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)'
      ).bind(notifId, targetRecipientId, userId, 'game_invite', notifBody, now).run();
    }

    // 2. Insert chat message into messages table
    const messageId = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO messages (id, conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(messageId, finalConvoId, userId, `🎮 Challenged you to a game of ${gameName}! Click to play in Arcade.`, now).run();

    // 3. Notify Durable Object chat room & global room via WebSocket push
    const invitePayload = {
      type: 'game_invite',
      id: notifId,
      recipientId: targetRecipientId,
      conversationId: finalConvoId,
      senderId: userId,
      gameType: selectedGame,
      gameName,
      challenger: challengerInfo
    };

    try {
      const doId = c.env.CHAT_ROOM.idFromName(finalConvoId);
      const stub = c.env.CHAT_ROOM.get(doId);
      await stub.fetch(new Request('http://durableobject/broadcast_game_invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invitePayload)
      }));
    } catch (_) {}

    try {
      const globalDoId = c.env.CHAT_ROOM.idFromName('room_global');
      const globalStub = c.env.CHAT_ROOM.get(globalDoId);
      await globalStub.fetch(new Request('http://durableobject/broadcast_game_invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invitePayload)
      }));
    } catch (_) {}

    return c.json({
      success: true,
      conversationId: finalConvoId,
      gameType: selectedGame,
      gameName,
      recipientId: targetRecipientId
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to send game challenge' }, 500);
  }
});

// Check for active/pending unread game invitations for the logged-in user
arcadeApp.get('/pending-invite', async (c) => {
  const userId = c.get('userId');
  try {
    const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
    const notif = await c.env.DB.prepare(`
      SELECT n.id, n.type, n.body, n.created_at, n.notifier_id,
             u.username, u.display_name, u.avatar_url
      FROM notifications n
      LEFT JOIN users u ON n.notifier_id = u.id
      WHERE n.user_id = ?
        AND n.type = 'game_invite'
        AND n.is_read = 0
        AND n.created_at > ?
      ORDER BY n.created_at DESC
      LIMIT 1
    `).bind(userId, fifteenMinsAgo).first<any>();

    if (!notif) {
      return c.json({ invitation: null });
    }

    let parsedBody: any = {};
    try {
      parsedBody = JSON.parse(notif.body || '{}');
    } catch {}

    return c.json({
      invitation: {
        id: notif.id,
        conversationId: parsedBody.conversationId,
        gameType: parsedBody.gameType || 'tic-tac-toe',
        gameName: parsedBody.gameName || 'Arcade Game',
        created_at: notif.created_at,
        challenger: {
          id: notif.notifier_id,
          username: notif.username,
          display_name: notif.display_name || notif.username,
          avatar_url: notif.avatar_url
        }
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Respond to a game invitation (Accept or Decline)
arcadeApp.post('/respond', async (c) => {
  const userId = c.get('userId');
  try {
    const { notificationId, accept } = await c.req.json();
    if (notificationId) {
      await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
        .bind(notificationId, userId)
        .run();
    }
    return c.json({ success: true, accept: !!accept });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default arcadeApp;

