import { DurableObjectState } from '@cloudflare/workers-types';
import { Bindings } from './types';

interface GameState {
  gameType?: 'tic-tac-toe' | 'chess' | 'rps' | 'higher-lower' | 'whack-a-mole' | 'coin-toss' | 'spin-wheel';
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

      const userCheck = await this.env.DB.prepare('SELECT is_blocked FROM users WHERE id = ?')
        .bind(userId)
        .first<any>();

      if (!userCheck || userCheck.is_blocked === 1) {
        ws.send(JSON.stringify({ type: 'error', error: 'This account has been blocked' }));
        ws.close(1008, 'Account blocked');
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

      // CASE B: RETRIEVE GAME STATE (On component mount)
      if (data.type === 'get_game_state') {
        const game = await this.getGame();
        ws.send(JSON.stringify({ type: 'game_state', game }));
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
      default: return 'Tic-Tac-Toe';
    }
  }

  // Broadcast helper
  private broadcastGame(sockets: WebSocket[], game: GameState) {
    const payload = JSON.stringify({ type: 'game_state', game });
    for (const socket of sockets) {
      socket.send(payload);
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
    console.log(`WebSocket closed: Code ${code}, WasClean ${wasClean}`);
  }

  async webSocketError(ws: WebSocket, error: any) {
    console.error('WebSocket connection error:', error);
  }
}
