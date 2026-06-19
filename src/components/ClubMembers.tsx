import React, { useState, useRef, useEffect } from 'react';
import { Player, SavedGame } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { User, Trash2, Edit2, Plus, Search, Trophy, PlayCircle, Eye, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ClubMembersProps {
  savedPlayers: Player[];
  onAddPlayer: (player: Player) => void;
  onUpdatePlayer: (player: Player) => void;
  onDeletePlayer: (playerId: string) => void;
  games: SavedGame[];
}

export default function ClubMembers({
  savedPlayers,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
  games
}: ClubMembersProps) {
  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [playerId, setPlayerId] = useState('');
  const [officialName, setOfficialName] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  
  // Validation errors
  const [idError, setIdError] = useState('');
  const [submitError, setSubmitError] = useState('');
  
  // Modals for deletes
  const [profileToDelete, setProfileToDelete] = useState<Player | null>(null);

  // Hidden photo file ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate ID helper
  const generateNewId = () => {
    let freshId = '';
    let exists = true;
    while (exists) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      freshId = `AGN-${rand}`;
      exists = savedPlayers.some(p => p.id.toUpperCase() === freshId);
    }
    setPlayerId(freshId);
    setIdError('');
  };

  // Initialize new form
  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setOfficialName('');
    setNickname('');
    setAvatarUrl(undefined);
    generateNewId();
    setIdError('');
    setSubmitError('');
  };

  // Prep generation on load or state transition
  useEffect(() => {
    if (!isEditing && !playerId) {
      generateNewId();
    }
  }, [isEditing]);

  const handleIdChange = (val: string) => {
    const raw = val.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setPlayerId(raw);

    if (!raw.trim()) {
      setIdError('Player ID is required');
      return;
    }

    const collision = savedPlayers.some(
      p => p.id.toLowerCase() === raw.toLowerCase() && p.id.toLowerCase() !== editingId?.toLowerCase()
    );

    if (collision) {
      setIdError('⚠️ This Player ID is already registered');
    } else {
      setIdError('');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1500000) {
        alert("This image is too large! Please upload an image under 1.5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit profile handler
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanId = playerId.trim().toUpperCase();
    const cleanOffName = officialName.trim();
    const cleanNick = nickname.trim();

    if (!cleanId) {
      setSubmitError('Unique Player ID is required');
      return;
    }

    if (!cleanOffName) {
      setSubmitError('Official Name is required');
      return;
    }

    // Check collision again
    const collision = savedPlayers.some(
      p => p.id.toLowerCase() === cleanId.toLowerCase() && p.id.toLowerCase() !== editingId?.toLowerCase()
    );
    if (collision) {
      setIdError('This Player ID is already registered');
      setSubmitError('Correct issues before saving');
      return;
    }

    const playerPayload: Player = {
      id: cleanId,
      name: cleanNick || cleanOffName,
      officialName: cleanOffName,
      nickname: cleanNick || undefined,
      avatarUrl
    };

    if (isEditing && editingId) {
      onUpdatePlayer(playerPayload);
    } else {
      onAddPlayer(playerPayload);
    }

    resetForm();
  };

  // Click edit handler
  const handleStartEdit = (p: Player) => {
    setIsEditing(true);
    setEditingId(p.id);
    setPlayerId(p.id);
    setOfficialName(p.officialName);
    setNickname(p.nickname || '');
    setAvatarUrl(p.avatarUrl);
    setIdError('');
    setSubmitError('');
    // Scroll to form smoothly
    document.getElementById('member-form-top')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Matches played and wins calculations per saved game
  const getPlayerStats = (pId: string, pName: string, pOfficial: string, pNick?: string) => {
    let appearances = 0;
    let wins = 0;

    games.forEach(game => {
      // Find if player was in this game
      const inGame = game.players.some(gp => 
        gp.id === pId ||
        gp.officialName.toLowerCase().trim() === pOfficial.toLowerCase().trim() ||
        (pNick && gp.nickname && gp.nickname.toLowerCase().trim() === pNick.toLowerCase().trim())
      );

      if (inGame) {
        appearances++;
        // Winner is calculated as lowest score or matches the winnerName property
        // Let's check matches
        const matchesWinnerName = (game.winnerName || '').toLowerCase().trim();
        const displayOption = (pNick || pOfficial).toLowerCase().trim();
        const checkOfficial = pOfficial.toLowerCase().trim();
        const checkNick = (pNick || '').toLowerCase().trim();

        if (
          matchesWinnerName === displayOption ||
          matchesWinnerName === checkOfficial ||
          (checkNick && matchesWinnerName === checkNick)
        ) {
          wins++;
        }
      }
    });

    const winRate = appearances > 0 ? Math.round((wins / appearances) * 100) : 0;
    return { appearances, wins, winRate };
  };

  // Filtered members list
  const filteredPlayers = savedPlayers.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const oName = (p.officialName || p.name || '').toLowerCase();
    const nick = (p.nickname || '').toLowerCase();
    const idStr = p.id.toLowerCase();

    return oName.includes(q) || nick.includes(q) || idStr.includes(q);
  });

  return (
    <div className="space-y-8" id="club-members-pane">
      
      {/* Title block */}
      <div className="bg-editorial-dark border border-editorial-border p-6 relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="member-header">
        <div className="absolute top-0 left-0 right-0 h-1 bg-editorial-gold" />
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.25em] font-black text-editorial-gold font-mono block">Club Membership Directory</span>
          <h2 className="text-2xl font-black uppercase text-white tracking-tight leading-none">Agnibina Clubhouse Records</h2>
          <p className="text-xs text-editorial-muted">
            Add and manage permanent club records. Link player scores dynamically across matches.
          </p>
        </div>
        <div className="bg-[#1a1815] border border-editorial-border/60 px-4 py-2.5 text-center flex items-center gap-3">
          <div className="text-left">
            <div className="text-[9px] font-mono text-editorial-muted uppercase tracking-widest leading-none">Registered Members</div>
            <div className="text-lg font-mono font-bold text-white mt-1 leading-none">{savedPlayers.length} Members</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Form panel */}
        <div className="lg:col-span-5 space-y-6" id="member-form-top">
          <div className="bg-editorial-dark border border-editorial-border p-5 sm:p-6 relative space-y-5">
            <div className="flex justify-between items-center border-b border-editorial-border/60 pb-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#ece5d8] flex items-center gap-2">
                <Plus className="w-4 h-4 text-editorial-gold" /> {isEditing ? "Edit Member Account" : "Register Club Member"}
              </h3>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[10px] font-mono uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5" id="club-member-subform">
              {/* Profile Photo upload slot */}
              <div className="flex flex-col items-center gap-2 border-b border-editorial-border/40 pb-4">
                <span className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-editorial-muted">Member Photo</span>
                <PlayerAvatar 
                  name={nickname || officialName || "Member"}
                  avatarUrl={avatarUrl}
                  size="w-16 h-16"
                  onClick={handleAvatarClick}
                  editable={true}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <span className="text-[9px] text-[#8e8271] font-serif italic">Tap avatar portrait to upload custom JPEG/PNG</span>
              </div>

              {/* Player ID Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-300 font-mono">Unique Player ID *</label>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={generateNewId}
                      className="text-[8px] font-mono uppercase tracking-widest text-editorial-gold hover:underline cursor-pointer"
                    >
                      Regenerate ID
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. AGN-001"
                  value={playerId}
                  onChange={(e) => handleIdChange(e.target.value)}
                  maxLength={15}
                  disabled={isEditing}
                  className="w-full bg-[#0a0a09]/80 border border-editorial-border px-3 py-2 text-sm text-white font-mono uppercase outline-none focus:border-editorial-gold disabled:opacity-60 transition-colors"
                />
                {idError ? (
                  <span className="text-[9px] font-mono text-red-400 block mt-1">{idError}</span>
                ) : (
                  <span className="text-[9px] font-mono text-editorial-muted block mt-1 leading-relaxed">
                    Alpha-numeric ledger code. Max 15 uppercase characters. Unique registry reference.
                  </span>
                )}
              </div>

              {/* Official Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-300 font-mono">Official Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ashok Kumar"
                  value={officialName}
                  onChange={(e) => {
                    setOfficialName(e.target.value);
                    setSubmitError('');
                  }}
                  maxLength={24}
                  className="w-full bg-[#0a0a09]/80 border border-editorial-border px-3 py-2 text-sm text-white outline-none focus:border-editorial-gold transition-colors"
                />
              </div>

              {/* Nickname */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#8e8271] font-mono">Nickname / Known As (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Ashu"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={12}
                  className="w-full bg-[#0a0a09]/80 border border-editorial-border px-3 py-2 text-sm text-white outline-none focus:border-editorial-gold transition-colors"
                />
                <span className="text-[9px] text-editorial-muted font-mono block mt-1">If provided, this is the display identifier used on scoreboards.</span>
              </div>

              {submitError && (
                <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-300 text-[10px] font-mono flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-400" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!!idError || !officialName.trim() || !playerId.trim()}
                className="w-full py-3 bg-editorial-gold text-black hover:bg-amber-400 font-bold uppercase tracking-widest text-[10px] leading-none transition-colors duration-250 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                id="member-submit-btn"
              >
                {isEditing ? "Update Profile Records" : "Register Club Portrait"}
              </button>
            </form>
          </div>
        </div>

        {/* Directory List panel */}
        <div className="lg:col-span-7 space-y-6" id="member-directory-container">
          
          {/* Search filters */}
          <div className="bg-editorial-dark border border-editorial-border p-4 flex gap-3 relative items-center">
            <Search className="w-4 h-4 text-editorial-muted shrink-0" />
            <input
              type="text"
              placeholder="Search clubhouse by Official Name, Nickname, or Player ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none placeholder-editorial-muted font-sans"
              id="directory-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-editorial-muted hover:text-white font-mono cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Members grid list */}
          <div className="space-y-3" id="club-list-grid">
            {filteredPlayers.length === 0 ? (
              <div className="bg-[#0e0e0e] border border-editorial-border/40 py-12 text-center" id="empty-directory-card">
                <span className="text-xl inline-block mb-3">🗄️</span>
                <p className="text-xs text-editorial-muted font-semibold uppercase tracking-widest leading-relaxed">
                  No registered members match.
                </p>
                <p className="text-[10px] text-editorial-muted/50 font-serif max-w-sm mx-auto mt-1">
                  Adjust search or add a fresh record on the side form.
                </p>
              </div>
            ) : (
              filteredPlayers.map(p => {
                const stats = getPlayerStats(p.id, p.name, p.officialName, p.nickname);
                
                return (
                  <div
                    key={p.id}
                    className="bg-editorial-dark border border-editorial-border hover:border-editorial-gold/20 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors relative"
                    id={`member-row-${p.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerAvatar name={p.name} avatarUrl={p.avatarUrl} size="w-12 h-12" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white uppercase truncate">{p.officialName}</h4>
                          {p.nickname && (
                            <span className="text-[10px] text-editorial-gold font-mono font-bold leading-none bg-[#1d1a15] border border-editorial-gold/15 px-1.5 py-0.5 uppercase tracking-wide">
                              "{p.nickname}"
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-editorial-muted font-mono leading-none mt-1.5 flex items-center gap-1.5">
                          <span className="uppercase text-[#8e8271]">LEDGER ID:</span>
                          <span className="text-white font-black select-all tracking-wider">{p.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col md:flex-row items-center justify-between sm:justify-start w-full sm:w-auto gap-4 sm:gap-2 md:gap-4 border-t sm:border-t-0 border-editorial-border/30 pt-3 sm:pt-0">
                      {/* Live stats indicators */}
                      <div className="flex items-center gap-4 text-left">
                        <div className="text-center bg-[#070707] border border-editorial-border/30 px-2 py-1 min-w-[56px]">
                          <div className="text-[7px] text-[#8e8271] font-mono uppercase tracking-widest leading-none">Played</div>
                          <div className="text-xs font-mono font-bold text-slate-300 mt-1 leading-none">{stats.appearances}</div>
                        </div>
                        <div className="text-center bg-[#070707] border border-editorial-border/30 px-2 py-1 min-w-[56px]">
                          <div className="text-[7px] text-editorial-gold font-mono uppercase tracking-widest leading-none">Wins</div>
                          <div className="text-xs font-mono font-bold text-editorial-gold mt-1 leading-none">{stats.wins}</div>
                        </div>
                        <div className="text-center bg-[#070707] border border-editorial-border/30 px-2 py-1 min-w-[56px]">
                          <div className="text-[7px] text-[#8e8271] font-mono uppercase tracking-widest leading-none">Win %</div>
                          <div className="text-xs font-mono font-bold text-slate-300 mt-1 leading-none">{stats.winRate}%</div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(p)}
                          className="p-2 border border-editorial-border hover:border-editorial-gold text-editorial-muted hover:text-white transition-colors cursor-pointer"
                          title="Edit Profile"
                          id={`edit-btn-${p.id}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileToDelete(p)}
                          className="p-2 border border-editorial-border hover:border-red-950 text-editorial-muted hover:text-rose-400 hover:bg-rose-950/10 transition-colors cursor-pointer"
                          title="Delete Profile"
                          id={`delete-btn-${p.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation popup */}
      <AnimatePresence>
        {profileToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xs select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-editorial-dark border border-red-950/60 p-6 sm:p-8 max-w-sm w-full space-y-4 relative shadow-2xl"
              id="delete-membership-popup"
            >
              <button
                type="button"
                onClick={() => setProfileToDelete(null)}
                className="absolute top-3 right-3 text-editorial-muted hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute top-0 left-0 right-0 h-1 bg-red-900" />
              <div className="flex flex-col gap-1 text-red-400">
                <span className="text-[9px] tracking-[0.25em] font-black uppercase font-mono">CLUB ARCHIVES</span>
                <h4 className="text-lg font-black uppercase text-white leading-none">
                  Revoke Club Membership?
                </h4>
                <p className="text-xs text-editorial-muted font-mono uppercase tracking-widest mt-1">This cannot be undone.</p>
              </div>

              <div className="bg-[#12110e] border border-editorial-border/60 p-4 flex items-center gap-3">
                <PlayerAvatar name={profileToDelete.name} avatarUrl={profileToDelete.avatarUrl} size="w-10 h-10" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white uppercase truncate">{profileToDelete.officialName}</div>
                  <div className="text-[10px] text-editorial-gold font-mono leading-none mt-1">
                    ID: {profileToDelete.id}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-red-300 font-mono uppercase tracking-wider leading-relaxed bg-[#1c0d0a]/30 border border-red-900/30 p-3">
                ⚠️ Revoking membership cancels their directory account permanently. Historic matches in the Agnibina Archives containing this Player ID will remain intact, but they cannot be selected for future Bray games.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProfileToDelete(null)}
                  className="flex-1 py-2.5 bg-transparent border border-editorial-border text-editorial-muted hover:text-white font-black uppercase tracking-widest text-[9px] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeletePlayer(profileToDelete.id);
                    setProfileToDelete(null);
                  }}
                  className="flex-1 py-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-white border border-red-900/50 font-black uppercase tracking-widest text-[9px] transition-colors cursor-pointer"
                >
                  Confirm Revoke
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
