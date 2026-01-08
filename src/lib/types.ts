export type Room = {
  code: string;
  createdAt: string;
  closedAt?: string | null;
  candidates?: string[] | null;
};

export type Vote = {
  id: string;
  voterName: string;
  candidateName: string;
  createdAt: string;
};

export type TallyEntry = {
  candidate: string;
  count: number;
  voters: string[];
};
