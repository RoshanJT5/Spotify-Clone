// --- State ---
let albums = {};
let songs = []; // This will hold the current playlist songs.
let currentSong = 0;
const audio = new Audio();

const PLAY_ICON = "images/playbar.svg";
const PAUSE_ICON = "images/pause.svg";

// --- Fetch & Albums ---
async function fetchAlbums() {
  const tryPaths = ["./songs.json", "./Songs/songs.json"];
  for (const p of tryPaths) {
    try {
      const res = await fetch(p);
      if (!res.ok) continue;
      const data = await res.json();
      albums = data;
      return albums;
    } catch (e) {
      console.error("Error fetching songs.json:", e);
    }
  }
  console.error("songs.json not found at ./songs.json or ./Songs/songs.json");
  albums = {};
  return albums;
}

// Load album → songs[] + start playing
function loadAlbum(albumName) {
  if (!albums[albumName] || !albums[albumName].length) {
    console.warn("Album not found or empty:", albumName);
    return;
  }
  songs = albums[albumName];
  currentSong = 0;
  renderPlaylistInFirstCard(songs);
  setSong(0);
}

// --- UI Helpers ---
function songNameFromPath(p) {
  const base = (p || "").split("/").pop() || "";
  const cleanedBase = base.replace(/\.[^/.]+$/, "");
  const parts = cleanedBase.split(" - ");
  if (parts.length > 1) {
    return parts.join(" - ").trim();
  }
  return cleanedBase.replace(/[_-]+/g, " ").trim();
}
function formatTime(sec) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function updatePlaybar() {
  const infoEl = document.querySelector(".songinfo");
  const timeEl = document.querySelector(".songtime");
  if (infoEl) infoEl.textContent = songNameFromPath(songs[currentSong] || "");
  if (timeEl) timeEl.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration || 0)}`;
}
function highlightActiveInPlaylist() {
  document.querySelectorAll(".playlist .song-item").forEach((el, i) => {
    el.classList.toggle("active", i === currentSong);
  });
}
function refreshIcons() {
  document.querySelectorAll(".playlist .song-item").forEach((el, i) => {
    const icon = el.querySelector("i");
    if (!icon) return;
    if (i === currentSong && !audio.paused) icon.className = "fa-solid fa-pause play-icon";
    else icon.className = "fa-solid fa-play play-icon";
  });
}

// --- Core playback ---
function setSong(index) {
  if (!songs.length || index < 0 || index >= songs.length) {
    console.warn("Invalid song index:", index);
    return;
  }
  currentSong = index;
  audio.src = songs[currentSong];
  audio.play().catch(() => {});
  updatePlaybar();
  highlightActiveInPlaylist();
  refreshIcons();
  setPlayPauseIcon();
}
function togglePlay() {
  if (!audio.src) {
    if (songs.length) setSong(0);
    else if (albums.album1?.length) loadAlbum("album1");
    return;
  }
  if (audio.paused) audio.play(); else audio.pause();
}

// --- Build/Render playlist (sidebar card) ---
function renderPlaylistInFirstCard(songList = songs) {
  const firstCard = document.querySelector(".sidebar .sidebar-card");
  if (!firstCard) return;

  firstCard.innerHTML = "";

  const h3 = document.createElement("h3");
  h3.className = "playlist-heading";
  const hIcon = document.createElement("i");
  hIcon.className = "fa-solid fa-music";
  hIcon.style.marginRight = "8px";
  h3.appendChild(hIcon);
  h3.appendChild(document.createTextNode("Your Playlist"));
  firstCard.appendChild(h3);

  const list = document.createElement("div");
  list.className = "playlist";

  songList.forEach((src, i) => {
    const item = document.createElement("div");
    item.className = "song-item";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = `${i + 1}. ${songNameFromPath(src)}`;

    const icon = document.createElement("i");
    icon.className = "fa-solid fa-play play-icon";

    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      const songIndex = songs.indexOf(src);
      if (currentSong === songIndex && !audio.paused) audio.pause();
      else setSong(songIndex);
      refreshIcons();
    });

    item.addEventListener("click", () => {
      const songIndex = songs.indexOf(src);
      if (currentSong === songIndex && !audio.paused) audio.pause();
      else setSong(songIndex);
      refreshIcons();
    });

    item.appendChild(nameSpan);
    item.appendChild(icon);
    list.appendChild(item);
  });

  firstCard.appendChild(list);
}

// --- Create Playlist Button ---
function wireCreatePlaylistButton() {
  const firstCard = document.querySelector(".sidebar .sidebar-card");
  if (!firstCard) return;
  const createBtn = firstCard.querySelector(".sidebar-btn");
  if (!createBtn) return;

  createBtn.addEventListener("click", () => {
    if (!songs.length) {
      if (albums.album1?.length) loadAlbum("album1");
      else renderPlaylistInFirstCard();
    } else {
      renderPlaylistInFirstCard();
    }
  });
}

// --- Dynamic Album Card Generation ---
async function renderAlbumCards() {
  const container = document.querySelector(".cardContainer");
  if (!container) return;
  container.innerHTML = "";
  const albumList = Object.keys(albums);

  for (const album of albumList) {
    try {
      const res = await fetch(`Songs/${album}/info.json`);
      if (!res.ok) throw new Error("Info file not found");
      const info = await res.json();
      const card = document.createElement("div");
      card.className = "card";
      card.setAttribute("data-album", album);
      card.innerHTML = `
        <div class="play">
          <img src="images/playbtn.svg" alt="">
        </div>
        <img src="Songs/${album}/card.jpeg" alt="${info.title}">
        <h3>${info.title}</h3>
        <p>${info.description}</p>
      `;
      container.appendChild(card);
    } catch (e) {
      console.error(`Failed to load info for album ${album}:`, e);
    }
  }
  wireAlbumCardPlayButtons();
}

function wireAlbumCardPlayButtons() {
  document.querySelectorAll(".card").forEach((el) => {
    el.addEventListener("click", () => {
      const album = el.getAttribute("data-album");
      if (album) {
        loadAlbum(album);
      }
    });
  });
}

// --- Controls wiring ---
function wireGlobalControls() {
  const btns = document.querySelectorAll(".songbtn img");
  if (btns.length === 3) {
    const [prevBtn, , nextBtn] = btns;
    prevBtn?.addEventListener("click", () => {
      if (!songs.length) return;
      setSong(currentSong - 1);
    });
    nextBtn?.addEventListener("click", () => {
      if (!songs.length) return;
      setSong(currentSong + 1);
    });
  }
  audio.addEventListener("timeupdate", updatePlaybar);
  audio.addEventListener("loadedmetadata", updatePlaybar);
  audio.addEventListener("play", () => {
    updatePlaybar();
    setPlayPauseIcon();
    refreshIcons();
  });
  audio.addEventListener("pause", () => {
    updatePlaybar();
    setPlayPauseIcon();
    refreshIcons();
  });
  audio.addEventListener("ended", () => {
    setSong(currentSong + 1);
  });
}

// --- show playbar only the first time ---
const playbar = document.querySelector(".playbar");
let playbarShown = false;

audio.addEventListener("play", () => {
  if (!playbarShown) {
    playbar?.classList.add("active");
    playbarShown = true;
  }
});

// --- Seekbar ---
function wireSeekbar() {
  const seekbar = document.querySelector(".seekbar");
  const circle = document.querySelector(".circle");
  const progress = document.querySelector(".progress");
  if (!seekbar || !circle) return;

  audio.addEventListener("timeupdate", () => {
    if (!isNaN(audio.duration)) {
      const pct = (audio.currentTime / audio.duration) * 100;
      circle.style.left = pct + "%";
      if (progress) progress.style.width = pct + "%";
    }
  });

  seekbar.addEventListener("click", (e) => {
    if (!isNaN(audio.duration)) {
      const rect = seekbar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      audio.currentTime = percent * audio.duration;
    }
  });

  let isDragging = false;
  circle.addEventListener("mousedown", () => {
    isDragging = true;
  });
  window.addEventListener("mouseup", () => {
    isDragging = false;
  });
  window.addEventListener("mousemove", (e) => {
    if (isDragging && !isNaN(audio.duration)) {
      const rect = seekbar.getBoundingClientRect();
      let offsetX = e.clientX - rect.left;
      offsetX = Math.max(0, Math.min(rect.width, offsetX));
      const percent = offsetX / rect.width;
      circle.style.left = percent * 100 + "%";
      audio.currentTime = percent * audio.duration;
    }
  });
}

// --- Volume ---
function wireVolumeControls() {
  const rangeInput = document.querySelector(".range input");
  const volumeIcon = document.querySelector(".volumebtn img");
  if (rangeInput) audio.volume = (rangeInput.value || 100) / 100;

  if (rangeInput && volumeIcon) {
    rangeInput.addEventListener("input", (e) => {
      const vol = e.target.value / 100;
      audio.volume = vol;
      volumeIcon.src = vol === 0 ? "images/mute.svg" : "images/volume.svg";
    });
    volumeIcon.addEventListener("click", () => {
      if (audio.volume > 0) {
        audio.volume = 0;
        rangeInput.value = 0;
        volumeIcon.src = "images/mute.svg";
      } else {
        audio.volume = 1;
        rangeInput.value = 100;
        volumeIcon.src = "images/volume.svg";
      }
    });
  }
}

// --- Play/Pause (main playbar button) ---
function getPlayPauseElement() {
  const explicit = document.querySelector(".play-pause-btn");
  if (explicit) return explicit;
  const imgs = document.querySelectorAll(".songbtn img");
  return imgs.length >= 3 ? imgs[1] : null;
}
function setPlayPauseIcon() {
  const btn = getPlayPauseElement();
  if (!btn) return;
  btn.src = audio.paused ? PLAY_ICON : PAUSE_ICON;
  btn.alt = audio.paused ? "Play" : "Pause";
}
function wirePlayPauseBtn() {
  const btn = getPlayPauseElement();
  if (!btn) return;
  setPlayPauseIcon();
  btn.addEventListener("click", () => {
    if (audio.paused) {
      if (!audio.src) {
        if (songs.length) setSong(0);
        else if (albums.album1?.length) loadAlbum("album1");
      } else {
        audio.play();
      }
    } else {
      audio.pause();
    }
  });
  audio.addEventListener("play", setPlayPauseIcon);
  audio.addEventListener("pause", setPlayPauseIcon);
}

// Add an event listener for Hamburger
function hamburger() {
  const hamburgerIcon = document.querySelector(".hamburger-logo");
  const sidebar = document.querySelector(".left");
  const closeBtn = document.querySelector(".cross");
  if (hamburgerIcon && sidebar) {
    hamburgerIcon.addEventListener("click", () => {
      sidebar.style.left = "0";
    });
  }
  if (closeBtn && sidebar) {
    closeBtn.addEventListener("click", () => {
      sidebar.style.left = "-100%";
    });
  }
}

// New search functionality
function searchSongs() {
  const searchInput = document.getElementById("searchbox");
  const searchTerm = searchInput.value.toLowerCase();
  const allSongs = Object.values(albums).flat();
  const filteredSongs = allSongs.filter(songPath => {
    const songName = songNameFromPath(songPath).toLowerCase();
    return songName.includes(searchTerm);
  });
  // Update the global songs array with the search results
  songs = filteredSongs;
  renderPlaylistInFirstCard(filteredSongs);
}

// --- Init ---
(async function init() {
  await fetchAlbums();
  await renderAlbumCards();
  wireGlobalControls();
  wireCreatePlaylistButton();
  wireSeekbar();
  wireVolumeControls();
  wirePlayPauseBtn();
  hamburger();
  const searchInput = document.getElementById("searchbox");
  if (searchInput) {
    searchInput.addEventListener("keyup", searchSongs);
  }
  audio.addEventListener("play", refreshIcons);
  audio.addEventListener("pause", refreshIcons);
})();
