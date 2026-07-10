export interface TVChannel {
  id: string;
  name: string;
  streamUrl: string;
  logo: string;
  category: string;
}

export const tvChannels: TVChannel[] = [];
