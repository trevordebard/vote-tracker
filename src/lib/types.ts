export type Room = {
  code: string;
  createdAt: string;
  closedAt?: string | null;
  candidates?: string[] | null;
  allowWriteIns?: boolean | null;
  allowAnonymous?: boolean | null;
  roles?: string[] | null;
};

export type Vote = {
  id: string;
  voterName: string;
  candidateName: string;
  roleName: string;
  createdAt: string;
};

export type TallyEntry = {
  candidate: string;
  count: number;
  voters: string[];
};

export type RoleSummary = {
  role: string;
  tally: TallyEntry[];
  winner: TallyEntry | null;
  totalVotes: number;
};
