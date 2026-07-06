export interface TVChannel {
  id: string;
  name: string;
  streamUrl: string;
  logo: string;
  category: string;
}

export const tvChannels: TVChannel[] = [
  // Info
  { id: "france-24", name: "France 24", streamUrl: "https://live.france24.com/hls/live/2037179-b/F24_FR_HI_HLS/master_5000.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/2/24/France_24_logo_2018.svg/1200px-France_24_logo_2018.svg.png", category: "Info" },
  { id: "bfm-tv", name: "BFM TV", streamUrl: "https://live-cdn-stream-euw1.bfmtv.bct.nextradiotv.com/master.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/6/63/BFMTV_logo_%282019%29.svg/1200px-BFMTV_logo_%282019%29.svg.png", category: "Info" },
  { id: "lci", name: "LCI", streamUrl: "http://151.80.18.177:86/LCI_HD/index.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/e/e4/LCI_-_Logo_2016.svg/1200px-LCI_-_Logo_2016.svg.png", category: "Info" },
  { id: "bfm-business", name: "BFM Business", streamUrl: "https://live-cdn-stream-euw1.bfmb.bct.nextradiotv.com/master.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/5/5d/BFM_Business_logo_2016.svg/1200px-BFM_Business_logo_2016.svg.png", category: "Info" },
  { id: "cnews", name: "CNews", streamUrl: "https://raw.githubusercontent.com/Paradise-91/ParaTV/main/streams/canalplus/cnews-dm.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/7/72/CNews_logo_2024.svg/1200px-CNews_logo_2024.svg.png", category: "Info" },
  { id: "bfm-lyon", name: "BFM Lyon", streamUrl: "https://live-cdn-bfmtvlyo-euw1.bfmtv.bct.nextradiotv.com/master.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/f/f0/BFM_Lyon_logo.svg/1200px-BFM_Lyon_logo.svg.png", category: "Info" },
  { id: "20-minutes-tv", name: "20 Minutes TV", streamUrl: "https://live-20minutestv.digiteka.com/1961167769/index.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/2/23/20_minutes_logo.svg/1200px-20_minutes_logo.svg.png", category: "Info" },
  { id: "africa-24", name: "Africa 24", streamUrl: "https://africa24.vedge.infomaniak.com/livecast/ik:africa24/manifest.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/6/6e/Africa24_logo.svg/1200px-Africa24_logo.svg.png", category: "Info" },
  // TNT / Generaliste
  { id: "tf1", name: "TF1", streamUrl: "http://151.80.18.177:86/TF1_HD/index.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/5/57/TF1_logo_2024.svg/1200px-TF1_logo_2024.svg.png", category: "TNT" },
  { id: "france-2", name: "France 2", streamUrl: "http://69.64.57.208/france2/mono.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/3/3d/France_2_2018.svg/1200px-France_2_2018.svg.png", category: "TNT" },
  { id: "france-5", name: "France 5", streamUrl: "http://69.64.57.208/france5/mono.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/0/0d/France_5_2018.svg/1200px-France_5_2018.svg.png", category: "TNT" },
  { id: "m6", name: "M6", streamUrl: "http://99.27.51.147:8080/M6/index.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/5/52/M6_2020.svg/1200px-M6_2020.svg.png", category: "TNT" },
  { id: "w9", name: "W9", streamUrl: "https://origin-m6web.live.6cloud.fr/out/v1/6play/6play-w9/cmaf_q2hyb21h/hls-short-hd.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/8/84/W9_2018.svg/1200px-W9_2018.svg.png", category: "TNT" },
  { id: "tmc", name: "TMC", streamUrl: "http://151.80.18.177:86/TMC/index.m3u8", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/54/TMC_logo.svg/1200px-TMC_logo.svg.png", category: "TNT" },
  { id: "cstar", name: "CStar", streamUrl: "https://raw.githubusercontent.com/Paradise-91/ParaTV/refs/heads/main/streams/canalplus/cstar-dm.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/7/78/CStar_logo_2016.svg/1200px-CStar_logo_2016.svg.png", category: "TNT" },
  // Jeunesse / Dessins animes
  { id: "nickelodeon", name: "Nickelodeon", streamUrl: "http://151.80.18.177:86/Nickelodeon_FR/index.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Nickelodeon_2023_logo_%28outline%29.svg/1200px-Nickelodeon_2023_logo_%28outline%29.svg.png", category: "Jeunesse" },
  { id: "nickelodeon-junior", name: "Nickelodeon Junior", streamUrl: "http://151.80.18.177:86/Nickelodeon_Junior/index.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Nickelodeon_Junior.png/960px-Nickelodeon_Junior.png", category: "Jeunesse" },
  { id: "disney-junior", name: "Disney Junior", streamUrl: "http://151.80.18.177:86/Disney_Junior_HD/index.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/3/36/2019_Disney_Junior_logo.svg", category: "Jeunesse" },
  { id: "gulli", name: "Gulli", streamUrl: "http://41.205.77.102/GULLI/index.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/a/ab/Gulli_2017.svg/1200px-Gulli_2017.svg.png", category: "Jeunesse" },
  { id: "canal-j", name: "Canal J", streamUrl: "http://41.205.77.102/CANALJ/index.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Canal_J_2019_Logo.png/960px-Canal_J_2019_Logo.png", category: "Jeunesse" },
  { id: "tiji", name: "TiJi", streamUrl: "http://41.205.77.102/TIJI/index.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/5/53/TiJi.svg/1200px-TiJi.svg.png", category: "Jeunesse" },
  { id: "teletoon-plus", name: "Teletoon+", streamUrl: "http://cdn.haititivi.com/TELETOON-HD/index.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/T%C3%A9l%C3%A9toon%2B_Logo.png/960px-T%C3%A9l%C3%A9toon%2B_Logo.png", category: "Jeunesse" },
  { id: "bob-leponge", name: "Bob l'eponge", streamUrl: "https://jmp2.uk/plu-5ffc8c345822750007e167de.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/5/55/Bob_l%27%C3%A9ponge_logo.svg/1200px-Bob_l%27%C3%A9ponge_logo.svg.png", category: "Jeunesse" },
  { id: "france-4", name: "France 4", streamUrl: "https://sv1.data-stream.top/8c0a287e56a6e1843143904778be3775b4d3edd4fba4ffcc3f72638c7a71d4d4/hls/francetv4.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/7/72/France_4_2018.svg/1200px-France_4_2018.svg.png", category: "Jeunesse" },
  // Cinema / Divertissement
  { id: "cine-romance", name: "Cine Romance", streamUrl: "https://jmp2.uk/plu-60812fc8539963000707d1e1.m3u8", logo: "https://images.pluto.tv/channels/60812fc8539963000707d1e1/colorLogoPNG_1775048649580.png", category: "Cinema" },
  { id: "cine-scifi", name: "Cine Sci-Fi", streamUrl: "https://jmp2.uk/plu-60c34592c911890007f29a73.m3u8", logo: "https://images.pluto.tv/channels/60c34592c911890007f29a73/colorLogoPNG.png", category: "Cinema" },
];
