import { DurableObjectState } from '@cloudflare/workers-types';
import { Bindings } from './types';
import {
  ClosestGuessState,
  DotsBoxesState,
  ConnectFourState,
  WordDuelState,
  NumberGuessState,
  ReactionRaceState,
  CheckersState,
  initClosestGuess,
  initDotsBoxes,
  initConnectFour,
  initWordDuel,
  initNumberGuess,
  initReactionRace,
  initCheckers,
  getLegalCheckersMoves,
  checkConnectFourWin,
  isValidDictionaryWord,
  generateWordDuelLetters
} from './arcadeGames';

interface GameState {
  gameType?: string;
  board?: (string | null)[]; // 9 cells, containing null, 'X', or 'O'
  chessBoard?: (string | null)[]; // 64 cells, containing chess piece codes
  chessFen?: string;
  chessHistory?: string[];
  rpsPlayerMoves?: Record<string, 'rock' | 'paper' | 'scissors' | null>;
  wheelQuestion?: string;
  wheelOptions?: string[];
  wheelResultIndex?: number | null;
  hlCard?: { suit: string; value: number } | null;
  hlScore?: number;
  hlStreak?: number;
  moleScore?: Record<string, number>;
  status: 'idle' | 'playing' | 'won' | 'draw';
  playerX: string | null; // userId of Player X
  playerO: string | null; // userId of Player O
  turn: string | null; // userId of whose turn it is
  winner: string | null; // userId of winner
  closestGuess?: ClosestGuessState;
  dotsBoxes?: DotsBoxesState;
  connectFour?: ConnectFourState;
  wordDuel?: WordDuelState;
  numberGuess?: NumberGuessState;
  reactionRace?: ReactionRaceState;
  checkers?: CheckersState;
}

export class ChatRoom {
  state: DurableObjectState;
  env: Bindings;
  cachedGame: GameState | null = null;

  constructor(state: DurableObjectState, env: Bindings) {
    this.state = state;
    this.env = env;
  }

  async getGame(): Promise<GameState> {
    if (this.cachedGame) return this.cachedGame;
    const game = (await this.state.storage.get<GameState>('game_state')) || this.getDefaultGame();
    this.cachedGame = game;
    return game;
  }

  async putGame(game: GameState, skipStorage = false): Promise<void> {
    this.cachedGame = game;
    if (!skipStorage) {
      await this.state.storage.put('game_state', game);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      const url = new URL(request.url);
      if (url.pathname.endsWith('/broadcast_reaction')) {
        try {
          const payload = await request.json<any>();
          const sockets = this.state.getWebSockets();
          const broadcastMsg = JSON.stringify({
            type: 'reaction_update',
            ...payload
          });
          for (const socket of sockets) {
            try { socket.send(broadcastMsg); } catch {}
          }
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
      if (url.pathname.endsWith('/broadcast_access_update')) {
        try {
          const { messageId, body } = await request.json<any>();
          const sockets = this.state.getWebSockets();
          const broadcastMsg = JSON.stringify({
            type: 'message_access_update',
            messageId,
            body
          });
          for (const socket of sockets) {
            socket.send(broadcastMsg);
          }
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
      if (url.pathname.endsWith('/broadcast_unsend')) {
        try {
          const { messageId } = await request.json<any>();
          const sockets = this.state.getWebSockets();
          const broadcastMsg = JSON.stringify({
            type: 'message_unsend',
            messageId
          });
          for (const socket of sockets) {
            socket.send(broadcastMsg);
          }
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
      if (url.pathname.endsWith('/broadcast_message')) {
        try {
          const { message } = await request.json<any>();
          const sockets = this.state.getWebSockets();
          const broadcastMsg = JSON.stringify({
            type: 'message',
            message
          });
          for (const socket of sockets) {
            socket.send(broadcastMsg);
          }
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
      if (url.pathname.endsWith('/broadcast_new_post')) {
        try {
          const { post } = await request.json<any>();
          const sockets = this.state.getWebSockets();
          const broadcastMsg = JSON.stringify({
            type: 'new_post',
            post
          });
          for (const socket of sockets) {
            try { socket.send(broadcastMsg); } catch {}
          }
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
      if (url.pathname.endsWith('/broadcast_post_deleted')) {
        try {
          const { postId } = await request.json<any>();
          const sockets = this.state.getWebSockets();
          const broadcastMsg = JSON.stringify({
            type: 'post_deleted',
            postId
          });
          for (const socket of sockets) {
            try { socket.send(broadcastMsg); } catch {}
          }
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
      if (url.pathname.endsWith('/broadcast_game_invite')) {
        try {
          const payload = await request.json<any>();
          const sockets = this.state.getWebSockets();
          const broadcastMsg = JSON.stringify({
            type: 'game_invite',
            ...payload
          });
          for (const socket of sockets) {
            try { socket.send(broadcastMsg); } catch {}
          }
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
      if (url.pathname.endsWith('/broadcast_system')) {
        try {
          const { messageId, conversationId, text, createdAt } = await request.json<any>();
          const sockets = this.state.getWebSockets();
          const broadcastMsg = JSON.stringify({
            type: 'message',
            message: {
              id: messageId,
              conversation_id: conversationId,
              sender_id: 'system',
              body: text,
              created_at: createdAt,
              username: 'system',
              display_name: 'System',
              avatar_url: null,
            }
          });
          for (const socket of sockets) {
            socket.send(broadcastMsg);
          }
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
      if (url.pathname.endsWith('/broadcast_kick')) {
        try {
          const { conversationId, kickedUserId } = await request.json<any>();
          const sockets = this.state.getWebSockets();
          const broadcastMsg = JSON.stringify({
            type: 'group_kick',
            conversationId,
            kickedUserId
          });
          for (const socket of sockets) {
            socket.send(broadcastMsg);
          }
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
      if (url.pathname.endsWith('/broadcast_nickname_update')) {
        try {
          const { conversationId, userId, nickname, username, display_name } = await request.json<any>();
          const sockets = this.state.getWebSockets();
          const broadcastMsg = JSON.stringify({
            type: 'nickname_update',
            conversationId,
            userId,
            nickname,
            username,
            display_name
          });
          for (const socket of sockets) {
            socket.send(broadcastMsg);
          }
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
      if (url.pathname.endsWith('/broadcast_chat_deleted')) {
        try {
          const { conversationId, deletedByUserId } = await request.json<any>();
          const sockets = this.state.getWebSockets();
          // Only notify the user who deleted the chat — not all participants
          for (const socket of sockets) {
            const [socketUserId] = this.state.getTags(socket);
            if (socketUserId === deletedByUserId) {
              socket.send(JSON.stringify({
                type: 'chat_deleted',
                conversationId,
                deletedByUserId
              }));
              try {
                socket.close(1001, 'Chat deleted by you');
              } catch { /* ignore */ }
            }
          }
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }

      return new Response('Expected Upgrade: websocket', { status: 400 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const conversationId = url.searchParams.get('conversationId');

    if (!userId || !conversationId) {
      return new Response('Missing userId or conversationId parameters', { status: 400 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Accept and tag the socket connection
    this.state.acceptWebSocket(server, [userId, conversationId]);

    // Broadcast user presence to others in the room
    try {
      const sockets = this.state.getWebSockets();
      const joinMsg = JSON.stringify({
        type: 'user_presence',
        userId,
        conversationId,
        status: 'online'
      });
      for (const s of sockets) {
        if (s !== server) {
          try { s.send(joinMsg); } catch {}
        }
      }
      this.env.DB.prepare('UPDATE users SET last_active_at = ? WHERE id = ?')
        .bind(Date.now(), userId)
        .run()
        .catch(() => {});
    } catch {}

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  // Handle incoming socket events
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const [userId, conversationId] = this.state.getTags(ws);
      if (!userId || !conversationId) return;

      const userCheck = await this.env.DB.prepare('SELECT is_blocked, suspended_until FROM users WHERE id = ?')
        .bind(userId)
        .first<any>();

      if (!userCheck || userCheck.is_blocked === 1 || (userCheck.suspended_until && userCheck.suspended_until > Date.now())) {
        ws.send(JSON.stringify({ type: 'error', error: 'This account has been blocked or suspended' }));
        ws.close(1008, 'Account blocked or suspended');
        return;
      }

      // Check user blocks in this conversation
      const blocks = await this.env.DB.prepare(`
        SELECT 1 FROM user_blocks ub
        JOIN conversation_members cm1 ON cm1.conversation_id = ? AND cm1.user_id = ub.blocker_id
        JOIN conversation_members cm2 ON cm2.conversation_id = ? AND cm2.user_id = ub.blocked_id
      `)
        .bind(conversationId, conversationId)
        .first();

      if (blocks) {
        ws.send(JSON.stringify({ type: 'error', error: 'Cannot send message. One of the users has blocked the other.' }));
        return;
      }

      const data = JSON.parse(message as string);
      const sockets = this.state.getWebSockets();

      // CASE A: CHAT MESSAGE
      if (data.type === 'chat' || !data.type) {
        const bodyText = data.body?.trim();
        if (!bodyText) return;

        const messageId = crypto.randomUUID();
        const createdAt = Date.now();

        const sender = await this.env.DB.prepare(
          'SELECT username, display_name, avatar_url, chat_restricted_until FROM users WHERE id = ?'
        )
          .bind(userId)
          .first<any>();

        if (!sender) return;

        if (sender.chat_restricted_until && sender.chat_restricted_until > Date.now()) {
          ws.send(JSON.stringify({
            type: 'error',
            error: `Your chat access is restricted until ${new Date(sender.chat_restricted_until).toLocaleString()}`
          }));
          return;
        }

        await this.env.DB.prepare(
          'INSERT INTO messages (id, conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)'
        )
          .bind(messageId, conversationId, userId, bodyText, createdAt)
          .run();

        const broadcastMsg = JSON.stringify({
          type: 'message',
          message: {
            id: messageId,
            conversation_id: conversationId,
            sender_id: userId,
            body: bodyText,
            created_at: createdAt,
            username: sender.username,
            display_name: sender.display_name,
            avatar_url: sender.avatar_url,
          },
        });

        for (const socket of sockets) {
          socket.send(broadcastMsg);
        }
        return;
      }

      // CASE A.1: TYPING INDICATOR
      if (data.type === 'typing') {
        const isTyping = Boolean(data.isTyping);
        const broadcastMsg = JSON.stringify({
          type: 'typing',
          userId,
          conversationId,
          isTyping
        });
        for (const socket of sockets) {
          const [socketUserId] = this.state.getTags(socket);
          if (socketUserId !== userId) {
            try { socket.send(broadcastMsg); } catch {}
          }
        }
        return;
      }

      // CASE A.2: MESSAGE REACTION
      if (data.type === 'reaction') {
        const { messageId, emoji } = data;
        if (!messageId || !emoji) return;

        // Check if existing reaction by this user with this emoji
        const existing = await this.env.DB.prepare(
          'SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'
        ).bind(messageId, userId, emoji).first<any>();

        let action = 'added';
        if (existing) {
          await this.env.DB.prepare('DELETE FROM message_reactions WHERE id = ?').bind(existing.id).run();
          action = 'removed';
        } else {
          await this.env.DB.prepare(
            'INSERT INTO message_reactions (id, message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?, ?)'
          ).bind(crypto.randomUUID(), messageId, userId, emoji, Date.now()).run();
          action = 'added';
        }

        // Fetch current summary of reactions for this message
        const { results: reactions } = await this.env.DB.prepare(`
          SELECT mr.emoji, mr.user_id, u.username
          FROM message_reactions mr
          LEFT JOIN users u ON mr.user_id = u.id
          WHERE mr.message_id = ?
        `).bind(messageId).all<any>();

        const broadcastMsg = JSON.stringify({
          type: 'reaction_update',
          messageId,
          conversationId,
          userId,
          emoji,
          action,
          reactions: reactions || []
        });

        for (const socket of sockets) {
          try { socket.send(broadcastMsg); } catch {}
        }
        return;
      }

      // CASE A.3: GET ONLINE PRESENCE IN ROOM
      if (data.type === 'get_presence') {
        const onlineUsers = new Set<string>();
        for (const socket of sockets) {
          const [socketUserId] = this.state.getTags(socket);
          if (socketUserId) onlineUsers.add(socketUserId);
        }
        ws.send(JSON.stringify({
          type: 'presence_state',
          conversationId,
          onlineUsers: Array.from(onlineUsers),
          userIds: Array.from(onlineUsers)
        }));
        return;
      }

      // CASE A.4: WEBRTC AUDIO CALL SIGNALING
      if (
        data.type === 'call_request' ||
        data.type === 'call_accept' ||
        data.type === 'call_reject' ||
        data.type === 'call_end' ||
        data.type === 'webrtc_offer' ||
        data.type === 'webrtc_answer' ||
        data.type === 'webrtc_ice'
      ) {
        const payload = JSON.stringify({
          ...data,
          fromUserId: userId,
          conversationId
        });
        for (const socket of sockets) {
          const [socketUserId] = this.state.getTags(socket);
          if (socketUserId !== userId) {
            try { socket.send(payload); } catch {}
          }
        }
        return;
      }

      // CASE B: RETRIEVE GAME STATE (On component mount)
      if (data.type === 'get_game_state') {
        const game = await this.getGame();
        const userGame = this.maskGameForUser(game, userId);
        ws.send(JSON.stringify({ type: 'game_state', game: userGame }));
        return;
      }

      // CASE C: START / INVITE GAME
      if (data.type === 'game_invite') {
        const gameType = data.gameType || 'tic-tac-toe';
        const members = await this.env.DB.prepare(
          'SELECT user_id FROM conversation_members WHERE conversation_id = ?'
        )
          .bind(conversationId)
          .all<any>();

        const opponent = members.results?.find(m => m.user_id !== userId);
        const opponentId = opponent ? opponent.user_id : null;

        const game: GameState = {
          gameType,
          status: 'playing',
          playerX: userId,
          playerO: opponentId,
          turn: userId, // Creator starts
          winner: null
        };

        if (gameType === 'tic-tac-toe') {
          game.board = Array(9).fill(null);
        } else if (gameType === 'chess') {
          game.chessBoard = [
            'r', 'n', 'b', 'q', 'k', 'b', 'n', 'r',
            'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p',
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P',
            'R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'
          ];
          game.chessFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
          game.chessHistory = [];
        } else if (gameType === 'spin-wheel') {
          game.wheelOptions = ['Coffee ☕', 'Pizza 🍕', 'Gaming 🎮', 'Walk 🚶', 'Code 💻', 'Sleep 😴'];
          game.wheelResultIndex = null;
        } else if (gameType === 'closest-guess') {
          game.closestGuess = initClosestGuess(userId, opponentId || '');
        } else if (gameType === 'dots-boxes') {
          game.dotsBoxes = initDotsBoxes(userId, opponentId || '');
        } else if (gameType === 'connect-four') {
          game.connectFour = initConnectFour();
        } else if (gameType === 'word-duel') {
          game.wordDuel = initWordDuel(userId, opponentId || '');
        } else if (gameType === 'number-guess') {
          game.numberGuess = initNumberGuess(userId, opponentId || '');
        } else if (gameType === 'reaction-race') {
          game.reactionRace = initReactionRace(userId, opponentId || '');
        } else if (gameType === 'checkers') {
          game.checkers = initCheckers();
        }

        await this.putGame(game);
        this.broadcastGame(sockets, game);

        // Save system notification to D1
        const sender = await this.env.DB.prepare('SELECT display_name FROM users WHERE id = ?').bind(userId).first<any>();
        const gameName = this.getGameName(gameType);
        await this.createSystemMessage(conversationId, `${sender?.display_name || 'Someone'} started a ${gameName} game!`, sockets);
        return;
      }

      // CASE D: MAKE A MOVE
      if (data.type === 'game_move') {
        const game = await this.getGame();
        if (!game || game.status !== 'playing' || !game.board) return;

        // Validate turn
        if (game.turn !== userId) return;

        const cellIndex = parseInt(data.index);
        if (isNaN(cellIndex) || cellIndex < 0 || cellIndex > 8 || game.board[cellIndex] !== null) return;

        // Apply Move
        const mark = userId === game.playerX ? 'X' : 'O';
        game.board[cellIndex] = mark;

        // Check Winner
        const win = this.checkWinner(game.board);
        if (win) {
          game.status = 'won';
          game.winner = userId;
          game.turn = null;
        } else if (game.board.every(cell => cell !== null)) {
          game.status = 'draw';
          game.turn = null;
        } else {
          // Switch turn
          game.turn = game.turn === game.playerX ? game.playerO : game.playerX;
        }

        await this.putGame(game);
        this.broadcastGame(sockets, game);

        // System notification on game over
        if (game.status === 'won') {
          const winner = await this.env.DB.prepare('SELECT display_name FROM users WHERE id = ?').bind(userId).first<any>();
          await this.createSystemMessage(conversationId, `${winner?.display_name || 'Someone'} won the Tic-Tac-Toe game! 🏆`, sockets);
        } else if (game.status === 'draw') {
          await this.createSystemMessage(conversationId, 'The Tic-Tac-Toe game ended in a draw! 🤝', sockets);
        }
        return;
      }

      // CASE D2: AUTHORITATIVE ACTIONS FOR 1v1 ARCADE GAMES
      if (data.type === 'game_action') {
        const game = await this.getGame();
        if (!game || game.status !== 'playing') return;
        const subType = data.subType;

        // 1. CLOSEST GUESS
        if (game.gameType === 'closest-guess' && game.closestGuess) {
          if (subType === 'closest_guess_submit') {
            const guess = parseInt(data.guess);
            if (isNaN(guess) || guess < 1 || guess > 100) return;
            if (userId !== game.playerX && userId !== game.playerO) return;
            if (game.closestGuess.roundComplete) return;
            if (game.closestGuess.guesses[userId] !== null) return;

            game.closestGuess.guesses[userId] = guess;

            // Check if both players submitted
            const pX = game.playerX!;
            const pO = game.playerO!;
            if (game.closestGuess.guesses[pX] !== null && game.closestGuess.guesses[pO] !== null) {
              const diffX = Math.abs(game.closestGuess.guesses[pX]! - game.closestGuess.target);
              const diffO = Math.abs(game.closestGuess.guesses[pO]! - game.closestGuess.target);
              let winnerId: string | null = null;
              if (diffX < diffO) {
                winnerId = pX;
                game.closestGuess.scores[pX] = (game.closestGuess.scores[pX] || 0) + 1;
              } else if (diffO < diffX) {
                winnerId = pO;
                game.closestGuess.scores[pO] = (game.closestGuess.scores[pO] || 0) + 1;
              }

              game.closestGuess.roundHistory.push({
                round: game.closestGuess.round,
                target: game.closestGuess.target,
                guesses: {
                  [pX]: game.closestGuess.guesses[pX]!,
                  [pO]: game.closestGuess.guesses[pO]!
                },
                winnerId
              });
              game.closestGuess.roundComplete = true;

              const sX = game.closestGuess.scores[pX] || 0;
              const sO = game.closestGuess.scores[pO] || 0;
              if (sX >= 3 || sO >= 3 || game.closestGuess.round >= game.closestGuess.maxRounds) {
                if (sX > sO) {
                  game.status = 'won';
                  game.winner = pX;
                } else if (sO > sX) {
                  game.status = 'won';
                  game.winner = pO;
                } else {
                  game.status = 'draw';
                }
              }
            }
            await this.putGame(game);
            this.broadcastGame(sockets, game);
            return;
          }

          if (subType === 'closest_guess_next') {
            if (!game.closestGuess.roundComplete || game.status !== 'playing') return;
            game.closestGuess.round++;
            game.closestGuess.target = Math.floor(Math.random() * 100) + 1;
            game.closestGuess.guesses = { [game.playerX!]: null, [game.playerO!]: null };
            game.closestGuess.roundComplete = false;

            await this.putGame(game);
            this.broadcastGame(sockets, game);
            return;
          }
        }

        // 2. DOTS AND BOXES
        if (game.gameType === 'dots-boxes' && game.dotsBoxes) {
          if (subType === 'dots_boxes_draw') {
            if (game.turn !== userId) return;
            const line = String(data.line || '');
            if (!line || game.dotsBoxes.drawnLines.includes(line)) return;

            game.dotsBoxes.drawnLines.push(line);
            game.dotsBoxes.lastLine = line;

            let claimedNewBox = false;
            for (let r = 0; r < 3; r++) {
              for (let c = 0; c < 3; c++) {
                const bKey = `b-${r}-${c}`;
                if (!game.dotsBoxes.boxes[bKey]) {
                  const top = `h-${r}-${c}`;
                  const bottom = `h-${r + 1}-${c}`;
                  const left = `v-${r}-${c}`;
                  const right = `v-${r}-${c + 1}`;
                  if (
                    game.dotsBoxes.drawnLines.includes(top) &&
                    game.dotsBoxes.drawnLines.includes(bottom) &&
                    game.dotsBoxes.drawnLines.includes(left) &&
                    game.dotsBoxes.drawnLines.includes(right)
                  ) {
                    game.dotsBoxes.boxes[bKey] = userId;
                    game.dotsBoxes.scores[userId] = (game.dotsBoxes.scores[userId] || 0) + 1;
                    claimedNewBox = true;
                  }
                }
              }
            }

            if (!claimedNewBox) {
              game.turn = game.turn === game.playerX ? game.playerO : game.playerX;
            }

            if (Object.keys(game.dotsBoxes.boxes).length === 9) {
              const sX = game.dotsBoxes.scores[game.playerX!] || 0;
              const sO = game.dotsBoxes.scores[game.playerO!] || 0;
              if (sX > sO) {
                game.status = 'won';
                game.winner = game.playerX;
              } else if (sO > sX) {
                game.status = 'won';
                game.winner = game.playerO;
              } else {
                game.status = 'draw';
              }
              game.turn = null;
            }

            await this.putGame(game);
            this.broadcastGame(sockets, game);
            return;
          }
        }

        // 3. CONNECT FOUR
        if (game.gameType === 'connect-four' && game.connectFour) {
          if (subType === 'connect_four_drop') {
            if (game.turn !== userId) return;
            const col = parseInt(data.col);
            if (isNaN(col) || col < 0 || col > 6) return;
            if (game.connectFour.board[0][col] !== null) return; // Column full

            let dropRow = -1;
            for (let r = 5; r >= 0; r--) {
              if (game.connectFour.board[r][col] === null) {
                dropRow = r;
                break;
              }
            }
            if (dropRow === -1) return;

            const mark = userId === game.playerX ? 'R' : 'Y';
            game.connectFour.board[dropRow][col] = mark;
            game.connectFour.lastMove = { row: dropRow, col };

            const win = checkConnectFourWin(game.connectFour.board);
            if (win) {
              game.connectFour.winningCells = win.cells;
              game.status = 'won';
              game.winner = userId;
              game.turn = null;
            } else if (game.connectFour.board[0].every(c => c !== null)) {
              game.status = 'draw';
              game.turn = null;
            } else {
              game.turn = game.turn === game.playerX ? game.playerO : game.playerX;
            }

            await this.putGame(game);
            this.broadcastGame(sockets, game);
            return;
          }
        }

        // 4. WORD DUEL
        if (game.gameType === 'word-duel' && game.wordDuel) {
          if (subType === 'word_duel_submit') {
            if (userId !== game.playerX && userId !== game.playerO) return;
            if (game.wordDuel.roundComplete) return;
            if (game.wordDuel.submissions[userId] !== null) return;

            const rawWord = String(data.word || '').trim().toUpperCase();
            const avail = [...game.wordDuel.letters];
            let canSpell = rawWord.length >= 3;
            for (const char of rawWord) {
              const idx = avail.indexOf(char);
              if (idx === -1) {
                canSpell = false;
                break;
              }
              avail.splice(idx, 1);
            }
            const isValid = canSpell && isValidDictionaryWord(rawWord);
            game.wordDuel.submissions[userId] = {
              word: rawWord,
              isValid,
              length: isValid ? rawWord.length : 0
            };

            const pX = game.playerX!;
            const pO = game.playerO!;
            if (game.wordDuel.submissions[pX] !== null && game.wordDuel.submissions[pO] !== null) {
              game.wordDuel.roundComplete = true;
              const subX = game.wordDuel.submissions[pX]!;
              const subO = game.wordDuel.submissions[pO]!;
              const sX = subX.isValid ? subX.length : 0;
              const sO = subO.isValid ? subO.length : 0;

              let roundWinnerId: string | null = null;
              if (sX > sO) {
                roundWinnerId = pX;
                game.wordDuel.scores[pX] = (game.wordDuel.scores[pX] || 0) + 1;
              } else if (sO > sX) {
                roundWinnerId = pO;
                game.wordDuel.scores[pO] = (game.wordDuel.scores[pO] || 0) + 1;
              }

              game.wordDuel.roundHistory.push({
                round: game.wordDuel.round,
                letters: game.wordDuel.letters,
                submissions: {
                  [pX]: subX,
                  [pO]: subO
                },
                winnerId: roundWinnerId
              });

              if (game.wordDuel.round >= game.wordDuel.maxRounds) {
                const totalX = game.wordDuel.scores[pX] || 0;
                const totalO = game.wordDuel.scores[pO] || 0;
                if (totalX > totalO) {
                  game.status = 'won';
                  game.winner = pX;
                } else if (totalO > totalX) {
                  game.status = 'won';
                  game.winner = pO;
                } else {
                  game.status = 'draw';
                }
              }
            }

            await this.putGame(game);
            this.broadcastGame(sockets, game);
            return;
          }

          if (subType === 'word_duel_next') {
            if (!game.wordDuel.roundComplete || game.status !== 'playing') return;
            game.wordDuel.round++;
            game.wordDuel.letters = generateWordDuelLetters();
            game.wordDuel.submissions = { [game.playerX!]: null, [game.playerO!]: null };
            game.wordDuel.roundComplete = false;

            await this.putGame(game);
            this.broadcastGame(sockets, game);
            return;
          }
        }

        // 5. NUMBER GUESS
        if (game.gameType === 'number-guess' && game.numberGuess) {
          if (subType === 'number_guess_set_secret') {
            if (userId !== game.numberGuess.chooserId) return;
            if (game.numberGuess.secretNumber !== null) return;
            const sec = parseInt(data.secret);
            if (isNaN(sec) || sec < 1 || sec > 100) return;

            game.numberGuess.secretNumber = sec;
            await this.putGame(game);
            this.broadcastGame(sockets, game);
            return;
          }

          if (subType === 'number_guess_guess') {
            if (userId !== game.numberGuess.guesserId) return;
            if (game.numberGuess.secretNumber === null || game.numberGuess.roundComplete) return;
            const g = parseInt(data.guess);
            if (isNaN(g) || g < 1 || g > 100) return;

            let hint: 'HIGHER' | 'LOWER' | 'CORRECT';
            if (g === game.numberGuess.secretNumber) {
              hint = 'CORRECT';
            } else if (g < game.numberGuess.secretNumber) {
              hint = 'HIGHER';
            } else {
              hint = 'LOWER';
            }

            game.numberGuess.guesses.push({ guess: g, hint });

            if (hint === 'CORRECT') {
              game.numberGuess.roundComplete = true;
              game.numberGuess.roundWinnerId = game.numberGuess.guesserId;
              game.numberGuess.scores[game.numberGuess.guesserId] = (game.numberGuess.scores[game.numberGuess.guesserId] || 0) + 1;
            } else if (game.numberGuess.guesses.length >= game.numberGuess.maxGuesses) {
              game.numberGuess.roundComplete = true;
              game.numberGuess.roundWinnerId = game.numberGuess.chooserId;
              game.numberGuess.scores[game.numberGuess.chooserId] = (game.numberGuess.scores[game.numberGuess.chooserId] || 0) + 1;
            }

            if (game.numberGuess.roundComplete && game.numberGuess.round >= game.numberGuess.maxRounds) {
              const sX = game.numberGuess.scores[game.playerX!] || 0;
              const sO = game.numberGuess.scores[game.playerO!] || 0;
              if (sX > sO) {
                game.status = 'won';
                game.winner = game.playerX;
              } else if (sO > sX) {
                game.status = 'won';
                game.winner = game.playerO;
              } else {
                game.status = 'draw';
              }
            }

            await this.putGame(game);
            this.broadcastGame(sockets, game);
            return;
          }

          if (subType === 'number_guess_next') {
            if (!game.numberGuess.roundComplete || game.status !== 'playing') return;
            const prevChooser = game.numberGuess.chooserId;
            game.numberGuess.chooserId = game.numberGuess.guesserId;
            game.numberGuess.guesserId = prevChooser;
            game.numberGuess.round++;
            game.numberGuess.secretNumber = null;
            game.numberGuess.guesses = [];
            game.numberGuess.roundComplete = false;
            game.numberGuess.roundWinnerId = null;

            await this.putGame(game);
            this.broadcastGame(sockets, game);
            return;
          }
        }

        // 6. REACTION RACE
        if (game.gameType === 'reaction-race' && game.reactionRace) {
          if (subType === 'reaction_race_ready') {
            if (userId !== game.playerX && userId !== game.playerO) return;
            game.reactionRace.readyPlayers[userId] = true;

            const pX = game.playerX!;
            const pO = game.playerO!;
            if (game.reactionRace.readyPlayers[pX] && game.reactionRace.readyPlayers[pO]) {
              game.reactionRace.state = 'waiting_go';
              // Authoritative go timestamp 1.5 - 3.5 seconds ahead
              game.reactionRace.goTimestamp = Date.now() + Math.floor(Math.random() * 2000) + 1500;
            }

            await this.putGame(game);
            this.broadcastGame(sockets, game);
            return;
          }

          if (subType === 'reaction_race_tap') {
            if (userId !== game.playerX && userId !== game.playerO) return;
            if (game.reactionRace.reactionTimes[userId] !== null) return; // Prevent duplicate taps

            const now = Date.now();
            const goTime = game.reactionRace.goTimestamp;

            if (!goTime || now < goTime) {
              // False start! Tapped before GO
              game.reactionRace.reactionTimes[userId] = -1;
            } else {
              game.reactionRace.reactionTimes[userId] = Math.max(1, now - goTime);
            }

            const pX = game.playerX!;
            const pO = game.playerO!;
            const timeX = game.reactionRace.reactionTimes[pX];
            const timeO = game.reactionRace.reactionTimes[pO];

            if (timeX !== null && timeO !== null) {
              let roundWinner: string | null = null;
              if (timeX > 0 && timeO > 0) {
                roundWinner = timeX < timeO ? pX : timeO < timeX ? pO : null;
              } else if (timeX > 0 && timeO <= 0) {
                roundWinner = pX;
              } else if (timeO > 0 && timeX <= 0) {
                roundWinner = pO;
              }

              if (roundWinner) {
                game.reactionRace.scores[roundWinner] = (game.reactionRace.scores[roundWinner] || 0) + 1;
              }

              game.reactionRace.roundHistory.push({
                round: game.reactionRace.round,
                reactionTimes: { [pX]: timeX, [pO]: timeO },
                winnerId: roundWinner
              });
              game.reactionRace.state = 'round_complete';

              const sX = game.reactionRace.scores[pX] || 0;
              const sO = game.reactionRace.scores[pO] || 0;
              if (sX >= 3 || sO >= 3 || game.reactionRace.round >= game.reactionRace.maxRounds) {
                if (sX > sO) {
                  game.status = 'won';
                  game.winner = pX;
                } else if (sO > sX) {
                  game.status = 'won';
                  game.winner = pO;
                } else {
                  game.status = 'draw';
                }
              }
            }

            await this.putGame(game);
            this.broadcastGame(sockets, game);
            return;
          }

          if (subType === 'reaction_race_next') {
            if (game.reactionRace.state !== 'round_complete' || game.status !== 'playing') return;
            game.reactionRace.round++;
            game.reactionRace.readyPlayers = { [game.playerX!]: false, [game.playerO!]: false };
            game.reactionRace.state = 'waiting_ready';
            game.reactionRace.goTimestamp = null;
            game.reactionRace.reactionTimes = { [game.playerX!]: null, [game.playerO!]: null };

            await this.putGame(game);
            this.broadcastGame(sockets, game);
            return;
          }
        }

        // 7. CHECKERS
        if (game.gameType === 'checkers' && game.checkers) {
          if (subType === 'checkers_move') {
            if (game.turn !== userId) return;
            const from = parseInt(data.from);
            const to = parseInt(data.to);
            if (isNaN(from) || isNaN(to) || from < 0 || from > 63 || to < 0 || to > 63) return;

            const legalMoves = getLegalCheckersMoves(
              game.checkers.board,
              userId,
              game.playerX!,
              game.checkers.mustContinueWith
            );

            const move = legalMoves.find(m => m.from === from && m.to === to);
            if (!move) return; // Illegal move or skipped mandatory capture

            const piece = game.checkers.board[from]!;
            game.checkers.board[from] = null;

            const isRed = userId === game.playerX;
            const reachesKingRow = (isRed && to >= 56 && to <= 63) || (!isRed && to >= 0 && to <= 7);
            let finalPiece = piece;
            let justPromoted = false;
            if (reachesKingRow && (piece === 'r' || piece === 'b')) {
              finalPiece = isRed ? 'R' : 'B';
              justPromoted = true;
            }
            game.checkers.board[to] = finalPiece;
            game.checkers.lastMove = { from, to };

            if (move.isCapture && move.capturedSquare !== undefined) {
              game.checkers.board[move.capturedSquare] = null;
              if (isRed) {
                game.checkers.capturedX++;
              } else {
                game.checkers.capturedO++;
              }
              game.checkers.halfMovesWithoutCapture = 0;

              if (!justPromoted) {
                const nextCaptures = getLegalCheckersMoves(game.checkers.board, userId, game.playerX!, to).filter(m => m.isCapture);
                if (nextCaptures.length > 0) {
                  game.checkers.mustContinueWith = to;
                } else {
                  game.checkers.mustContinueWith = null;
                  game.turn = game.turn === game.playerX ? game.playerO : game.playerX;
                }
              } else {
                game.checkers.mustContinueWith = null;
                game.turn = game.turn === game.playerX ? game.playerO : game.playerX;
              }
            } else {
              game.checkers.halfMovesWithoutCapture++;
              game.checkers.mustContinueWith = null;
              game.turn = game.turn === game.playerX ? game.playerO : game.playerX;
            }

            // Check if next player has any legal moves left
            const oppId = game.turn!;
            const oppMoves = getLegalCheckersMoves(game.checkers.board, oppId, game.playerX!);
            if (oppMoves.length === 0) {
              game.status = 'won';
              game.winner = userId;
              game.turn = null;
            } else if (game.checkers.halfMovesWithoutCapture >= 40) {
              game.status = 'draw';
              game.turn = null;
            }

            await this.putGame(game);
            this.broadcastGame(sockets, game);
            return;
          }
        }
      }

      // CASE E: GAME RESET (Play again)
      if (data.type === 'game_reset') {
        const game = await this.getGame();
        if (!game) return;

        const gameType = game.gameType || 'tic-tac-toe';

        // Start new game swapping roles (winner/last player starts)
        const nextPlayerX = game.playerO || userId; // swap X/O to keep it fun
        const nextPlayerO = game.playerX || userId;

        const newGame: GameState = {
          gameType,
          status: 'playing',
          playerX: nextPlayerX,
          playerO: nextPlayerO,
          turn: nextPlayerX,
          winner: null
        };

        if (gameType === 'tic-tac-toe') {
          newGame.board = Array(9).fill(null);
        } else if (gameType === 'chess') {
          newGame.chessBoard = [
            'r', 'n', 'b', 'q', 'k', 'b', 'n', 'r',
            'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p',
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P',
            'R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'
          ];
          newGame.chessFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
          newGame.chessHistory = [];
        } else if (gameType === 'rps') {
          newGame.rpsPlayerMoves = {};
        } else if (gameType === 'spin-wheel') {
          newGame.wheelOptions = game.wheelOptions || ['Coffee ☕', 'Pizza 🍕', 'Gaming 🎮', 'Walk 🚶', 'Code 💻', 'Sleep 😴'];
          newGame.wheelResultIndex = null;
        } else if (gameType === 'closest-guess') {
          newGame.closestGuess = initClosestGuess(nextPlayerX, nextPlayerO);
        } else if (gameType === 'dots-boxes') {
          newGame.dotsBoxes = initDotsBoxes(nextPlayerX, nextPlayerO);
        } else if (gameType === 'connect-four') {
          newGame.connectFour = initConnectFour();
        } else if (gameType === 'word-duel') {
          newGame.wordDuel = initWordDuel(nextPlayerX, nextPlayerO);
        } else if (gameType === 'number-guess') {
          newGame.numberGuess = initNumberGuess(nextPlayerX, nextPlayerO);
        } else if (gameType === 'reaction-race') {
          newGame.reactionRace = initReactionRace(nextPlayerX, nextPlayerO);
        } else if (gameType === 'checkers') {
          newGame.checkers = initCheckers();
        }

        await this.putGame(newGame);
        this.broadcastGame(sockets, newGame);

        const gameName = this.getGameName(gameType);
        await this.createSystemMessage(conversationId, `A new ${gameName} game has started!`, sockets);
        return;
      }

      // CASE F: GENERIC GAME STATE UPDATE (For Chess, RPS, Spin-wheel turns, Air Hockey)
      if (data.type === 'game_update') {
        const updatedGame = data.game;

        await this.putGame(updatedGame);
        this.broadcastGame(sockets, updatedGame);

        // System notification on custom game wins
        if (updatedGame.status === 'won' && updatedGame.winner) {
          const winner = await this.env.DB.prepare('SELECT display_name FROM users WHERE id = ?').bind(updatedGame.winner).first<any>();
          const gameName = this.getGameName(updatedGame.gameType || '');
          await this.createSystemMessage(conversationId, `${winner?.display_name || 'Someone'} won the ${gameName} game! 🏆`, sockets);
        } else if (updatedGame.status === 'draw') {
          const gameName = this.getGameName(updatedGame.gameType || '');
          await this.createSystemMessage(conversationId, `The ${gameName} game ended in a draw! 🤝`, sockets);
        }
        return;
      }

      // CASE G: GAME CLOSE (Quit back to idle)
      if (data.type === 'game_close') {
        const idleGame = this.getDefaultGame();
        await this.putGame(idleGame);
        this.broadcastGame(sockets, idleGame);

        const sender = await this.env.DB.prepare('SELECT display_name FROM users WHERE id = ?').bind(userId).first<any>();
        await this.createSystemMessage(conversationId, `${sender?.display_name || 'Someone'} ended the game session.`, sockets);
        return;
      }

    } catch (err) {
      console.error('Error handling WebSocket event:', err);
    }
  }

  // Check lines helper
  private checkWinner(board: (string | null)[]): boolean {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return true;
      }
    }
    return false;
  }

  // Get default game helper
  private getDefaultGame(): GameState {
    return {
      gameType: 'tic-tac-toe',
      board: Array(9).fill(null),
      status: 'idle',
      playerX: null,
      playerO: null,
      turn: null,
      winner: null
    };
  }

  // Get human readable game name
  private getGameName(type: string): string {
    switch (type) {
      case 'chess': return 'Chess';
      case 'rps': return 'Rock Paper Scissors';
      case 'higher-lower': return 'Higher or Lower';
      case 'whack-a-mole': return 'Whack-a-Mole';
      case 'coin-toss': return 'Coin Toss';
      case 'spin-wheel': return 'Spin the Wheel';
      case 'closest-guess': return 'Closest Guess';
      case 'dots-boxes': return 'Dots and Boxes';
      case 'connect-four': return 'Connect Four';
      case 'word-duel': return 'Word Duel';
      case 'number-guess': return 'Number Guess';
      case 'reaction-race': return 'Reaction Race';
      case 'checkers': return 'Checkers';
      default: return 'Tic-Tac-Toe';
    }
  }

  // Mask private choices before reveal so users cannot inspect WS frames
  private maskGameForUser(game: GameState, userId: string): GameState {
    if (!game) return game;
    try {
      const masked: GameState = JSON.parse(JSON.stringify(game));

      // Closest Guess: mask secret target and opponent's guess until roundComplete
      if (masked.closestGuess && !masked.closestGuess.roundComplete) {
        masked.closestGuess.target = 0;
        for (const p of Object.keys(masked.closestGuess.guesses)) {
          if (p !== userId && masked.closestGuess.guesses[p] !== null) {
            masked.closestGuess.guesses[p] = -999;
          }
        }
      }

      // Word Duel: mask opponent's submitted word until roundComplete
      if (masked.wordDuel && !masked.wordDuel.roundComplete) {
        for (const p of Object.keys(masked.wordDuel.submissions)) {
          if (p !== userId && masked.wordDuel.submissions[p] !== null) {
            masked.wordDuel.submissions[p] = {
              word: '••••',
              isValid: true,
              length: masked.wordDuel.submissions[p]!.length
            };
          }
        }
      }

      // Number Guess: mask secret number from guesser until roundComplete
      if (masked.numberGuess && !masked.numberGuess.roundComplete) {
        if (userId === masked.numberGuess.guesserId) {
          masked.numberGuess.secretNumber = null;
        }
      }

      // RPS: mask opponent move until both submitted
      if (masked.rpsPlayerMoves && masked.playerX && masked.playerO) {
        const pXMove = masked.rpsPlayerMoves[masked.playerX];
        const pOMove = masked.rpsPlayerMoves[masked.playerO];
        if (!pXMove || !pOMove) {
          for (const p of Object.keys(masked.rpsPlayerMoves)) {
            if (p !== userId && masked.rpsPlayerMoves[p]) {
              (masked.rpsPlayerMoves as any)[p] = 'ready';
            }
          }
        }
      }

      return masked;
    } catch {
      return game;
    }
  }

  // Broadcast helper with authoritative per-player masking
  private broadcastGame(sockets: WebSocket[], game: GameState) {
    for (const socket of sockets) {
      try {
        const [socketUserId] = this.state.getTags(socket);
        const userGame = socketUserId ? this.maskGameForUser(game, socketUserId) : game;
        socket.send(JSON.stringify({ type: 'game_state', game: userGame }));
      } catch (err) {
        console.error('Failed to send game_state to socket:', err);
      }
    }
  }

  // D1 System message announcement helper
  private async createSystemMessage(conversationId: string, text: string, sockets: WebSocket[]) {
    const messageId = crypto.randomUUID();
    const createdAt = Date.now();

    await this.env.DB.prepare(
      'INSERT INTO messages (id, conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(messageId, conversationId, 'system', text, createdAt)
      .run();

    const broadcastMsg = JSON.stringify({
      type: 'message',
      message: {
        id: messageId,
        conversation_id: conversationId,
        sender_id: 'system',
        body: text,
        created_at: createdAt,
        username: 'system',
        display_name: 'System',
        avatar_url: null,
      },
    });

    for (const socket of sockets) {
      socket.send(broadcastMsg);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    try {
      const [userId, conversationId] = this.state.getTags(ws);
      if (userId && conversationId) {
        const sockets = this.state.getWebSockets();
        const otherSockets = sockets.filter(s => s !== ws && this.state.getTags(s)[0] === userId);
        if (otherSockets.length === 0) {
          const leaveMsg = JSON.stringify({
            type: 'user_presence',
            userId,
            conversationId,
            status: 'offline',
            lastActive: Date.now()
          });
          for (const s of sockets) {
            if (s !== ws) {
              try { s.send(leaveMsg); } catch {}
            }
          }
        }
        this.env.DB.prepare('UPDATE users SET last_active_at = ? WHERE id = ?')
          .bind(Date.now(), userId)
          .run()
          .catch(() => {});
      }
    } catch {}
    console.log(`WebSocket closed: Code ${code}, WasClean ${wasClean}`);
  }

  async webSocketError(ws: WebSocket, error: any) {
    console.error('WebSocket connection error:', error);
  }
}
