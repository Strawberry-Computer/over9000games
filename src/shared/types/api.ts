export type SpriteDefinition = string[];

export type GameDefinition = {
  name: string;
  description: string;
  sprites: Record<string, SpriteDefinition>;
  tiles: Record<string, SpriteDefinition>;
  gameLogic: string;
  initialState: any;
  palette: number[];
};

export type HighScore = {
  username: string;
  score: number;
  timestamp: string;
  rank: number;
};

export type InitResponse = {
  type: "init";
  postId: string;
  username: string;
  gameDefinition?: GameDefinition;
  highScores: HighScore[];
};

export type GenerateGameRequest = {
  description: string;
};

export type GenerateGameResponse = {
  type: "generate";
  gameDefinition: GameDefinition;
};

export type SubmitScoreRequest = {
  score: number;
};

export type SubmitScoreResponse = {
  type: "score";
  newRank?: number;
  isHighScore: boolean;
  highScores: HighScore[];
};

export type LeaderboardResponse = {
  type: "leaderboard";
  highScores: HighScore[];
};
