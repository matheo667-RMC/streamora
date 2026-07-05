export interface RadioStation {
  id: string;
  name: string;
  streamUrl: string;
  logo: string;
  genre: string;
}

export interface TVChannel {
  id: string;
  name: string;
  streamUrl: string;
  logo: string;
  category: string;
}

export const radioStations: RadioStation[] = [
  // Radio France
  { id: "france-inter", name: "France Inter", streamUrl: "https://stream.radiofrance.fr/franceinter/franceinter_midfi.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/0/05/France_Inter_2021.svg/1200px-France_Inter_2021.svg.png", genre: "Généraliste" },
  { id: "france-info", name: "France Info", streamUrl: "https://stream.radiofrance.fr/franceinfo/franceinfo_midfi.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/f/f5/Logo_franceinfo_2024.svg/1200px-Logo_franceinfo_2024.svg.png", genre: "Info" },
  { id: "france-culture", name: "France Culture", streamUrl: "https://stream.radiofrance.fr/franceculture/franceculture_midfi.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/c/c9/France_Culture_2021.svg/1200px-France_Culture_2021.svg.png", genre: "Culture" },
  { id: "france-musique", name: "France Musique", streamUrl: "https://stream.radiofrance.fr/francemusique/francemusique_midfi.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/3/32/France_Musique_2021.svg/1200px-France_Musique_2021.svg.png", genre: "Musique Classique" },
  { id: "fip", name: "FIP", streamUrl: "https://stream.radiofrance.fr/fip/fip_midfi.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/0/09/FIP_2021.svg/1200px-FIP_2021.svg.png", genre: "Éclectique" },
  { id: "mouv", name: "Mouv'", streamUrl: "https://stream.radiofrance.fr/mouv/mouv_midfi.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/1/1b/Mouv%27_2021.svg/1200px-Mouv%27_2021.svg.png", genre: "Urbain / Rap" },
  // Privées
  { id: "nrj", name: "NRJ", streamUrl: "https://scdn.nrjaudio.fm/adwz2/fr/30001/mp3_128.mp3", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/NRJ_logo_2023.svg/1200px-NRJ_logo_2023.svg.png", genre: "Pop / Hits" },
  { id: "skyrock", name: "Skyrock", streamUrl: "https://icecast.skyrock.net/s/natio_mp3_128k", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/0/09/Skyrock_logo_2011.svg/1200px-Skyrock_logo_2011.svg.png", genre: "Rap / RnB" },
  { id: "europe1", name: "Europe 1", streamUrl: "https://europe1.lmn.fm/europe1.mp3", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/1/1a/Europe_1_2024.svg/1200px-Europe_1_2024.svg.png", genre: "Généraliste" },
  { id: "rmc", name: "RMC", streamUrl: "https://audio.bfmtv.com/bfmbusiness_128.mp3", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/4/48/Logo_RMC_2022.svg/1200px-Logo_RMC_2022.svg.png", genre: "Info / Sport" },
  { id: "rtl", name: "RTL", streamUrl: "https://streamer-01.rtl.fr/rtl-1-44-128", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/3/34/RTL_logo_2015.svg/1200px-RTL_logo_2015.svg.png", genre: "Généraliste" },
  { id: "nostalgie", name: "Nostalgie", streamUrl: "https://scdn.nrjaudio.fm/adwz2/fr/30601/mp3_128.mp3", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/4/46/Nostalgie_2024.svg/1200px-Nostalgie_2024.svg.png", genre: "Oldies" },
  { id: "cherie-fm", name: "Chérie FM", streamUrl: "https://scdn.nrjaudio.fm/adwz2/fr/30201/mp3_128.mp3", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/4/4e/Ch%C3%A9rie_FM_2022.svg/1200px-Ch%C3%A9rie_FM_2022.svg.png", genre: "Variété / Pop" },
  { id: "rire-et-chansons", name: "Rire et Chansons", streamUrl: "https://scdn.nrjaudio.fm/adwz2/fr/30401/mp3_128.mp3", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/9/9b/Rire_et_Chansons.svg/1200px-Rire_et_Chansons.svg.png", genre: "Humour" },
  { id: "sud-radio", name: "Sud Radio", streamUrl: "https://stream.sudradio.fr/sudradio.mp3", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/d/d8/Sud_Radio_logo_2014.svg/1200px-Sud_Radio_logo_2014.svg.png", genre: "Généraliste" },
];

export const tvChannels: TVChannel[] = [
  // Info
  { id: "france-24", name: "France 24", streamUrl: "https://live.france24.com/hls/live/2037179-b/F24_FR_HI_HLS/master_5000.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/2/24/France_24_logo_2018.svg/1200px-France_24_logo_2018.svg.png", category: "Info" },
  { id: "bfm-tv", name: "BFM TV", streamUrl: "https://live-cdn-stream-euw1.bfmtv.bct.nextradiotv.com/master.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/6/63/BFMTV_logo_%282019%29.svg/1200px-BFMTV_logo_%282019%29.svg.png", category: "Info" },
  { id: "lci", name: "LCI", streamUrl: "http://151.80.18.177:86/LCI_HD/index.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/e/e4/LCI_-_Logo_2016.svg/1200px-LCI_-_Logo_2016.svg.png", category: "Info" },
  { id: "bfm-business", name: "BFM Business", streamUrl: "https://live-cdn-stream-euw1.bfmb.bct.nextradiotv.com/master.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/5/5d/BFM_Business_logo_2016.svg/1200px-BFM_Business_logo_2016.svg.png", category: "Info" },
  { id: "cnews", name: "CNews", streamUrl: "https://raw.githubusercontent.com/Sibprod/streams/main/ressources/dm/py/hls/cnews.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/7/72/CNews_logo_2024.svg/1200px-CNews_logo_2024.svg.png", category: "Info" },
  { id: "euronews", name: "Euronews", streamUrl: "https://cdn-euronews.akamaized.net/live/eds/africanews-fr/250/africanews-fr.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Euronews_2022.svg/1200px-Euronews_2022.svg.png", category: "Info" },
  // TNT / Généraliste
  { id: "france-2", name: "France 2", streamUrl: "http://69.64.57.208/france2/mono.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/3/3d/France_2_2018.svg/1200px-France_2_2018.svg.png", category: "TNT" },
  { id: "france-4", name: "France 4", streamUrl: "https://sv1.data-stream.top/8c0a287e56a6e1843143904778be3775b4d3edd4fba4ffcc3f72638c7a71d4d4/hls/francetv4.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/7/72/France_4_2018.svg/1200px-France_4_2018.svg.png", category: "TNT" },
  { id: "france-5", name: "France 5", streamUrl: "http://69.64.57.208/france5/mono.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/0/0d/France_5_2018.svg/1200px-France_5_2018.svg.png", category: "TNT" },
  { id: "gulli", name: "Gulli", streamUrl: "http://41.205.77.102/GULLI/index.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/a/ab/Gulli_2017.svg/1200px-Gulli_2017.svg.png", category: "Jeunesse" },
  // Sport / Divertissement
  { id: "bfm-lyon", name: "BFM Lyon", streamUrl: "https://live-cdn-bfmtvlyo-euw1.bfmtv.bct.nextradiotv.com/master.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/f/f0/BFM_Lyon_logo.svg/1200px-BFM_Lyon_logo.svg.png", category: "Régional" },
  { id: "20-minutes-tv", name: "20 Minutes TV", streamUrl: "https://live-20minutestv.digiteka.com/1961167769/index.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/2/23/20_minutes_logo.svg/1200px-20_minutes_logo.svg.png", category: "Info" },
  { id: "africa-24", name: "Africa 24", streamUrl: "https://africa24.vedge.infomaniak.com/livecast/ik:africa24/manifest.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/6/6e/Africa24_logo.svg/1200px-Africa24_logo.svg.png", category: "Info" },
  { id: "fun-radio-tv", name: "Fun Radio", streamUrl: "https://raw.githubusercontent.com/Sibprod/streams/main/ressources/dm/py/hls/funradiofr.m3u8", logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/f/fe/Fun_Radio.svg/1200px-Fun_Radio.svg.png", category: "Musique" },
];
