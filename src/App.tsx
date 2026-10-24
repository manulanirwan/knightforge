import { useEffect, useMemo, useState } from 'react';
import { Chess, type Square, type PieceSymbol, type Color } from 'chess.js';

type SavedGame = { fen: string; moves: string[] };
const STORAGE_KEY = 'knightforge-game-v1';
const glyph: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
};
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const pieceValue: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function createGame(): Chess {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved) as SavedGame;
      const game = new Chess();
      if (Array.isArray(data.moves)) {
        for (const move of data.moves) game.move(move);
        return game;
      }
      if (typeof data.fen === 'string') game.load(data.fen);
      return game;
    }
  } catch { /* Ignore corrupt or unavailable browser storage. */ }
  return new Chess();
}

function statusText(game: Chess): string {
  if (game.isCheckmate()) return `Checkmate · ${game.turn() === 'w' ? 'Black' : 'White'} wins`;
  if (game.isStalemate()) return 'Draw · Stalemate';
  if (game.isThreefoldRepetition()) return 'Draw · Threefold repetition';
  if (game.isInsufficientMaterial()) return 'Draw · Insufficient material';
  if (game.isDraw()) return 'Draw · 50-move rule';
  if (game.isCheck()) return `${game.turn() === 'w' ? 'White' : 'Black'} is in check`;
  return `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
}

function computerMove(game: Chess): string | null {
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;
  const scored = moves.map((move) => {
    let score = Math.random() * 24;
    if (move.captured) score += pieceValue[move.captured] * 0.7;
    if (move.promotion) score += 800;
    if (move.san.includes('+')) score += 35;
    if (move.san.includes('#')) score += 100000;
    if (['d4', 'e4', 'd5', 'e5'].includes(move.to)) score += 18;
    if (move.piece === 'n' || move.piece === 'b') score += 4;
    return { san: move.san, score };
  });
  return scored.sort((a, b) => b.score - a.score)[0]?.san ?? null;
}

export default function App() {
  const [game, setGame] = useState<Chess>(createGame);
  const [selected, setSelected] = useState<Square | null>(null);
  const [orientation, setOrientation] = useState<Color>('w');
  const [mode, setMode] = useState<'computer' | 'local'>('computer');
  const [thinking, setThinking] = useState(false);
  const [notice, setNotice] = useState('');
  const filesOnBoard = orientation === 'w' ? files : [...files].reverse();
  const ranks = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const legalTargets = useMemo(() => selected ? game.moves({ square: selected, verbose: true }).map(m => m.to) : [], [game, selected]);
  const moves = game.history();
  const finished = game.isGameOver();
  const lastMove = game.history({ verbose: true }).at(-1);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ fen: game.fen(), moves: game.history() } satisfies SavedGame)); }
    catch { /* Browser storage may be disabled or full. */ }
  }, [game]);

  useEffect(() => {
    if (mode !== 'computer' || game.turn() !== 'b' || game.isGameOver()) return;
    setThinking(true);
    const timer = window.setTimeout(() => {
      const san = computerMove(game);
      if (san) {
        const next = new Chess(game.fen());
        next.move(san);
        setGame(next);
      }
      setThinking(false);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [game, mode]);

  function playSquare(square: Square) {
    if (thinking || finished || (mode === 'computer' && game.turn() === 'b')) return;
    setNotice('');
    if (selected) {
      try {
        const next = new Chess(game.fen());
        const result = next.move({ from: selected, to: square, promotion: 'q' });
        if (result) { setGame(next); setSelected(null); return; }
      } catch { /* Not a legal destination. */ }
    }
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) setSelected(square);
    else setSelected(null);
  }

  function newGame() {
    setGame(new Chess()); setSelected(null); setNotice(''); setThinking(false);
  }

  function undo() {
    const next = new Chess(game.fen());
    if (next.undo()) {
      if (mode === 'computer' && next.turn() === 'b') next.undo();
      setGame(new Chess(next.fen())); setSelected(null);
    }
  }

  function exportPgn() {
    const blob = new Blob([game.pgn()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'knightforge-game.pgn'; a.click();
    URL.revokeObjectURL(url);
  }

  function importPgn(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = new Chess();
        next.loadPgn(String(reader.result ?? ''));
        setGame(next); setSelected(null); setNotice('PGN loaded successfully.');
      } catch { setNotice('Could not read that PGN file.'); }
    };
    reader.readAsText(file);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="./" aria-label="KnightForge home"><span className="brand-mark">♞</span><span>KNIGHT<span className="brand-light">FORGE</span><small>YOUR NEXT MOVE STARTS HERE</small></span></a>
        <div className="top-actions"><span className="online-dot" /> LOCAL GAME <span className="version-pill">BETA</span></div>
      </header>
      <section className="hero">
        <div><p className="eyebrow">THE CHESS ROOM</p><h1>Think ahead.<br /><em>Play beautifully.</em></h1><p className="hero-copy">A quiet space for sharp moves and better games.</p></div>
        <div className="hero-stat"><span className="stat-icon">♟</span><div><strong>{moves.length}</strong><small>HALF-MOVES PLAYED</small></div></div>
      </section>
      <section className="game-layout">
        <div className="board-column">
          <div className="player-card"><div className="avatar dark-avatar">♚</div><div className="player-info"><strong>{mode === 'computer' ? 'Computer' : 'Player 2'}</strong><small>{mode === 'computer' ? 'LOCAL STARTER AI' : 'BLACK PIECES'}</small></div><span className={'turn-indicator ' + (game.turn() === 'b' && !finished ? 'active' : '')} /></div>
          <div className="board-frame"><div className="board" role="grid" aria-label="Chess board">
            {ranks.flatMap((rank, ri) => filesOnBoard.map((file, fi) => {
              const square = `${file}${rank}` as Square;
              const piece = game.get(square);
              const isLight = (files.indexOf(file) + rank) % 2 === 0;
              const isLast = lastMove && (lastMove.from === square || lastMove.to === square);
              const target = legalTargets.includes(square);
              return <button key={square} role="gridcell" aria-label={`${square}${piece ? ' ' + piece.color + ' ' + piece.type : ''}`} className={['square', isLight ? 'light' : 'dark', selected === square ? 'selected' : '', isLast ? 'last-move' : ''].filter(Boolean).join(' ')} onClick={() => playSquare(square)}>
                {fi === 0 && <span className="rank-label">{rank}</span>}
                {ri === 7 && <span className="file-label">{file}</span>}
                {piece && <span className={'piece ' + (piece.color === 'w' ? 'white-piece' : 'black-piece')}>{glyph[piece.color][piece.type]}</span>}
                {target && <span className={piece ? 'capture-ring' : 'legal-dot'} />}
              </button>;
            }))}
          </div></div>
          <div className="player-card bottom-player"><div className="avatar light-avatar">♔</div><div className="player-info"><strong>You · White</strong><small>{mode === 'computer' ? 'PLAYING AS WHITE' : 'WHITE PIECES'}</small></div><span className={'turn-indicator ' + (game.turn() === 'w' && !finished ? 'active' : '')} /></div>
        </div>
        <aside className="side-panel">
          <div className="panel-heading"><div><p className="eyebrow">GAME CONTROL</p><h2>Your match</h2></div><span className="live-badge"><i /> LIVE</span></div>
          <div className="status-box"><span className="status-chess">♟</span><div><small>POSITION STATUS</small><strong>{thinking ? 'Computer is thinking…' : statusText(game)}</strong></div></div>
          {notice && <p className="notice">{notice}</p>}
          <div className="mode-switch"><button className={mode === 'computer' ? 'mode-active' : ''} onClick={() => { setMode('computer'); setNotice('Computer mode selected.'); }}>Vs Computer</button><button className={mode === 'local' ? 'mode-active' : ''} onClick={() => { setMode('local'); setNotice('Local two-player mode selected.'); }}>Two Players</button></div>
          <div className="control-grid"><button className="primary-button" onClick={newGame}><span>＋</span> New game</button><button className="secondary-button" onClick={undo} disabled={!moves.length || thinking}>↶ Undo move</button><button className="secondary-button" onClick={() => { setOrientation(o => o === 'w' ? 'b' : 'w'); setSelected(null); }}>⇅ Flip board</button><button className="secondary-button" onClick={exportPgn}>⇩ Export PGN</button></div>
          <label className="import-button">⇧ Import PGN<input type="file" accept=".pgn,.txt" onChange={e => importPgn(e.target.files?.[0])} /></label>
          <div className="move-section"><div className="section-title"><h3>Move history</h3><span>{Math.ceil(moves.length / 2)} MOVES</span></div><div className="move-list">
            {moves.length ? Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => <div className="move-row" key={i}><span className="move-number">{i + 1}.</span><span>{moves[i * 2]}</span><span>{moves[i * 2 + 1] ?? '…'}</span></div>) : <div className="empty-moves"><span>♘</span><p>Your game starts here.</p><small>Make your opening move on the board.</small></div>}
          </div></div>
          <div className="tip-box"><span>✦</span><p><strong>KNIGHT'S NOTE</strong><br />Control the centre, develop your pieces, and keep your king safe.</p></div>
        </aside>
      </section>
      <footer><span>♞ KNIGHTFORGE</span><span>MADE FOR THE LOVE OF THE GAME</span><button onClick={() => { localStorage.removeItem(STORAGE_KEY); newGame(); }}>Reset saved game</button></footer>
    </main>
  );
}
