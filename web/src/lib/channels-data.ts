export interface TVChannel {
  id: string;
  name: string;
  streamUrl: string;
  logo: string;
  category: string;
}

export const tvChannels: TVChannel[] = [
  // Info
  { id: "france-24", name: "France 24", streamUrl: "https://live.france24.com/hls/live/2037179-b/F24_FR_HI_HLS/master_5000.m3u8", logo: "https://i.imgur.com/u8N6uoj.png", category: "Info" },
  { id: "bfm-tv", name: "BFM TV", streamUrl: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_TV/index.m3u8?end=END&start=LIVE", logo: "https://i.imgur.com/YJCcczD.png", category: "Info" },
  { id: "cnews", name: "CNews", streamUrl: "https://raw.githubusercontent.com/Paradise-91/ParaTV/main/streams/canalplus/cnews-dm.m3u8", logo: "https://i.imgur.com/sSNhk2g.png", category: "Info" },
  { id: "bfm-business", name: "BFM Business", streamUrl: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_BUSINESS/index.m3u8?end=END&start=LIVE", logo: "https://i.imgur.com/psqIHn4.png", category: "Info" },
  { id: "franceinfo", name: "Franceinfo", streamUrl: "https://raw.githubusercontent.com/Sibprod/streams/main/ressources/dm/py/hls/franceinfotv.m3u8", logo: "https://i.imgur.com/eITXz6A.png", category: "Info" },
  { id: "euronews", name: "Euronews", streamUrl: "https://2f6c5bf4.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmxheHhUVi1ldV9FdXJvbmV3c0ZyYW5jYWlzX0hMUw/playlist.m3u8", logo: "https://i.imgur.com/8t9mdg9.png", category: "Info" },
  { id: "bfm-lyon", name: "BFM Lyon", streamUrl: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_LYON/index.m3u8?end=END&start=LIVE", logo: "https://i.imgur.com/0uiiZRo.png", category: "Info" },
  { id: "20-minutes-tv", name: "20 Minutes TV", streamUrl: "https://live-20minutestv.digiteka.com/1961167769/index.m3u8", logo: "https://i.imgur.com/CMKKbaP.png", category: "Info" },
  { id: "africa-24", name: "Africa 24", streamUrl: "https://africa24.vedge.infomaniak.com/livecast/ik:africa24/manifest.m3u8", logo: "https://africa24tv.com/wp-content/uploads/2021/09/logo.png", category: "Info" },
  // TNT / Generaliste
  { id: "arte", name: "Arte", streamUrl: "https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/index.m3u8", logo: "https://i.imgur.com/ecXMjNl.png", category: "TNT" },
  { id: "w9", name: "W9", streamUrl: "https://origin-m6web.live.6cloud.fr/out/v1/6play/6play-w9/cmaf_q2hyb21h/hls-short-hd.m3u8", logo: "https://i.imgur.com/kCr0s5l.png", category: "TNT" },
  { id: "cstar", name: "CStar", streamUrl: "https://raw.githubusercontent.com/Paradise-91/ParaTV/refs/heads/main/streams/canalplus/cstar-dm.m3u8", logo: "https://i.imgur.com/w4kAX1V.png", category: "TNT" },
  { id: "equidia", name: "Equidia", streamUrl: "https://raw.githubusercontent.com/Paradise-91/ParaTV/main/streams/equidia/live2.m3u8", logo: "https://i.imgur.com/QPpbRcZ.png", category: "TNT" },
  { id: "france-inter", name: "France Inter TV", streamUrl: "https://raw.githubusercontent.com/Sibprod/streams/main/ressources/dm/py/hls/franceinter.m3u8", logo: "https://i.imgur.com/MgBeU52.png", category: "TNT" },
  // Jeunesse / Dessins animes
  { id: "bob-leponge", name: "Bob l'eponge", streamUrl: "https://jmp2.uk/plu-5ffc8c345822750007e167de.m3u8", logo: "https://images.pluto.tv/channels/5ffc8c345822750007e167de/colorLogoPNG.png", category: "Jeunesse" },
  { id: "france-4", name: "France 4", streamUrl: "https://sv1.data-stream.top/8c0a287e56a6e1843143904778be3775b4d3edd4fba4ffcc3f72638c7a71d4d4/hls/francetv4.m3u8", logo: "https://i.imgur.com/6PRNjqN.png", category: "Jeunesse" },
  { id: "tortues-ninja", name: "Tortues Ninja TV", streamUrl: "https://jmp2.uk/plu-5f8ecc1b37867f00071469e9.m3u8", logo: "https://images.pluto.tv/channels/5f8ecc1b37867f00071469e9/colorLogoPNG.png", category: "Jeunesse" },
  { id: "icarly", name: "iCarly TV", streamUrl: "https://jmp2.uk/plu-5f8ecc7aa44d9c00081fca29.m3u8", logo: "https://images.pluto.tv/channels/5e8b580a233dc90007f0cb9d/colorLogoPNG.png", category: "Jeunesse" },
  { id: "detective-conan", name: "Detective Conan", streamUrl: "https://jmp2.uk/plu-62f3e8ad2a8e8000077b013d.m3u8", logo: "https://images.pluto.tv/channels/62f3e8ad2a8e8000077b013d/colorLogoPNG.png?w=512", category: "Jeunesse" },
  { id: "daria", name: "Daria", streamUrl: "https://jmp2.uk/plu-6683b680efa2a10008e8a393.m3u8", logo: "https://images.pluto.tv/channels/6683b680efa2a10008e8a393/colorLogoPNG.png", category: "Jeunesse" },
  { id: "mr-bean", name: "Mr Bean Anime", streamUrl: "https://amg00627-amg00627c31-rakuten-fr-3991.playouts.now.amagi.tv/playlist/amg00627-banijayfast-mrbeanfrcc-rakutenfr/playlist.m3u8", logo: "https://i.imgur.com/wv3WjMa.png", category: "Jeunesse" },
  { id: "inazuma-eleven", name: "Inazuma Eleven", streamUrl: "https://jmp2.uk/plu-632c6df43d2bc5000751f621.m3u8", logo: "https://i.imgur.com/pLv0T3D.png", category: "Jeunesse" },
  { id: "pluto-junior", name: "Pluto TV Junior", streamUrl: "https://jmp2.uk/plu-5f1aa9bcd8160700076d45d1.m3u8", logo: "https://images.pluto.tv/channels/5f1aa9bcd8160700076d45d1/colorLogoPNG_1747402544424.png", category: "Jeunesse" },
  { id: "pluto-toons", name: "Pluto TV Toons", streamUrl: "https://jmp2.uk/plu-6880aa28164eb4890282e803.m3u8", logo: "https://images.pluto.tv/channels/6880aa28164eb4890282e803/colorLogoPNG_1760522020317.png", category: "Jeunesse" },
  { id: "pluto-teen", name: "Pluto TV Teen", streamUrl: "https://jmp2.uk/plu-63eb944dc111bc0008fe7021.m3u8", logo: "https://images.pluto.tv/channels/63eb944dc111bc0008fe7021/colorLogoPNG_1761820520562.png", category: "Jeunesse" },
  { id: "gong", name: "Gong (Anime)", streamUrl: "https://amg01596-gongnetworks-gong-ono-vh5f2.amagi.tv/1080p-vtt/index.m3u8", logo: "https://i.imgur.com/lA9UFMG.png", category: "Jeunesse" },
  { id: "caillou", name: "Caillou", streamUrl: "https://do7nccdsswstc.cloudfront.net/v1/manifest/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-1aso0bc668saa/a5233c83-f772-4a81-959a-45ec7877ef61/5.m3u8", logo: "https://i.imgur.com/RgKaoe4.png", category: "Jeunesse" },
  // Cinema / Divertissement
  { id: "cine-romance", name: "Cine Romance", streamUrl: "https://jmp2.uk/plu-60812fc8539963000707d1e1.m3u8", logo: "https://images.pluto.tv/channels/60812fc8539963000707d1e1/colorLogoPNG_1775048649580.png", category: "Cinema" },
  { id: "cine-scifi", name: "Cine Sci-Fi", streamUrl: "https://jmp2.uk/plu-60c34592c911890007f29a73.m3u8", logo: "https://images.pluto.tv/channels/60c34592c911890007f29a73/colorLogoPNG.png", category: "Cinema" },
  { id: "cine-action", name: "Cine Action", streamUrl: "https://jmp2.uk/plu-5f8ed1ff5c39700007e2204a.m3u8", logo: "https://images.pluto.tv/channels/5f8ed1ff5c39700007e2204a/colorLogoPNG_1752228138963.png", category: "Cinema" },
  { id: "cine-thrillers", name: "Cine Thrillers", streamUrl: "https://jmp2.uk/plu-60c3472a51a2050008dad272.m3u8", logo: "https://images.pluto.tv/channels/60c3472a51a2050008dad272/colorLogoPNG_1751272093012.png", category: "Cinema" },
  { id: "cine-horreur", name: "Cine Horreur", streamUrl: "https://jmp2.uk/plu-66e1978babec540008ce41ac.m3u8", logo: "https://images.pluto.tv/channels/66e1978babec540008ce41ac/colorLogoPNG_1751272165674.png", category: "Cinema" },
  { id: "cine-retro", name: "Cine Retro", streamUrl: "https://jmp2.uk/plu-5f8ed168f72fcd0007e56269.m3u8", logo: "https://images.pluto.tv/channels/5f8ed168f72fcd0007e56269/colorLogoPNG_1751272859383.png", category: "Cinema" },
  { id: "cine-western", name: "Cine Western", streamUrl: "https://jmp2.uk/plu-65cca3e2ec452d0008af3a65.m3u8", logo: "https://images.pluto.tv/channels/65cca3e2ec452d0008af3a65/colorLogoPNG_1751272826143.png", category: "Cinema" },
];
