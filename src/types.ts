export interface Player {
  id: string; // Unique profile ID
  name: string; // Display name (will default to nickname if present, otherwise officialName)
  officialName: string;
  nickname?: string;
  avatarUrl?: string; // Base64 image data URI or preset url
}

export interface Round {
  roundNumber: number;
  scores: Record<string, number>; // Maps playerId -> score added in this round
}

export interface SavedGame {
  id: string;
  players: Player[];
  rounds: Round[];
  date: string; // ISO string or human-readable timestamp
  winnerName: string;
}

export interface GameState {
  players: Player[];
  rounds: Round[];
  status: 'setup' | 'playing' | 'ended';
  history: SavedGame[];
}

