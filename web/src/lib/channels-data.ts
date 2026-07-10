export interface TVChannel {
  id: string;
  name: string;
  streamUrl: string;
  logo: string;
  category: string;
}

export const tvChannels: TVChannel[] = [
  { id: "tf1", name: "TF1", category: "Généralistes", streamUrl: "/api/hls?u=http%3A%2F%2F151.80.18.177%3A86%2FTF1_HD%2Findex.m3u8", logo: "https://i.imgur.com/QxHt9NC.png" },
  { id: "france-2", name: "France 2", category: "Généralistes", streamUrl: "/api/hls?u=http%3A%2F%2F69.64.57.208%2Ffrance2%2Fmono.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/France_2_2018.svg/320px-France_2_2018.svg.png" },
  { id: "france-5", name: "France 5", category: "Généralistes", streamUrl: "/api/hls?u=http%3A%2F%2F69.64.57.208%2Ffrance5%2Fmono.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/France_5_2018.svg/320px-France_5_2018.svg.png" },
  { id: "m6", name: "M6", category: "Généralistes", streamUrl: "/api/hls?u=http%3A%2F%2F99.27.51.147%3A8080%2FM6%2Findex.m3u8", logo: "https://i.imgur.com/7GVp3fW.png" },
  { id: "france-24", name: "France 24", category: "Info", streamUrl: "/api/hls?u=https%3A%2F%2Flive.france24.com%2Fhls%2Flive%2F2037179-b%2FF24_FR_HI_HLS%2Fmaster_5000.m3u8", logo: "https://i.imgur.com/u8N6uoj.png" },
  { id: "gulli", name: "Gulli", category: "Enfants", streamUrl: "/api/hls?u=http%3A%2F%2F41.205.77.102%2FGULLI%2Findex.m3u8", logo: "https://i.imgur.com/kqYssbW.png" },
  { id: "tiji", name: "TiJi", category: "Enfants", streamUrl: "/api/hls?u=http%3A%2F%2F41.205.77.102%2FTIJI%2Findex.m3u8", logo: "https://i.imgur.com/ZjsfAGb.png" },
  { id: "nickelodeon", name: "Nickelodeon", category: "Enfants", streamUrl: "/api/hls?u=http%3A%2F%2F151.80.18.177%3A86%2FNickelodeon_FR%2Findex.m3u8", logo: "https://i.imgur.com/E84jnP8.png" },
  { id: "nickelodeon-junior", name: "Nickelodeon Junior", category: "Enfants", streamUrl: "/api/hls?u=http%3A%2F%2F151.80.18.177%3A86%2FNickelodeon_Junior%2Findex.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Nickelodeon_Junior.png/320px-Nickelodeon_Junior.png" },
  { id: "caillou", name: "Caillou", category: "Enfants", streamUrl: "/api/hls?u=https%3A%2F%2Fdo7nccdsswstc.cloudfront.net%2Fv1%2Fmanifest%2F3722c60a815c199d9c0ef36c5b73da68a62b09d1%2Fcc-1aso0bc668saa%2Fa5233c83-f772-4a81-959a-45ec7877ef61%2F5.m3u8", logo: "https://i.imgur.com/RgKaoe4.png" },
  { id: "bob-leponge", name: "Bob l\'éponge", category: "Enfants", streamUrl: "/api/hls?u=https%3A%2F%2Fjmp2.uk%2Fplu-5ffc8c345822750007e167de.m3u8", logo: "https://images.pluto.tv/channels/5ffc8c345822750007e167de/colorLogoPNG.png" },
];
