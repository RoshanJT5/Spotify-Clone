// --- State ---
let songs = [];
let currentSong = 0;
const audio = new Audio();
let playlistBtn = null; // the small play/pause in the first card

// --- Helpers ---
async function fetchSongs() {
  try {
    const res = await fetch("./Songs/songs.json"); // adjust if your folder is lowercase
    if (!res.ok) throw new Error("songs.json not found");
    const data = await res.json();
    // normalize slashes (Windows -> web)
    songs = data.map((s) => s.replace(/\\/g, "/"));
    return songs;
  } catch (e) {
    console.error("Error loading songs:", e);
    songs = [];
    return [];
  }
}

function songNameFromPath(p) {
  const base = (p || "").split("/").pop() || "";
  return base
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
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
  if (timeEl)
    timeEl.textContent = `${formatTime(audio.currentTime)} / ${formatTime(
      audio.duration || 0
    )}`;
}

function updatePlaylistBtnIcon() {
  if (playlistBtn) playlistBtn.textContent = audio.paused ? "⏸" : "▶";
}

function highlightActiveInPlaylist() {
  document.querySelectorAll(".song-item").forEach((el, i) => {
    el.classList.toggle("active", i === currentSong);
  });
}

function setSong(index) {
  if (!songs.length) return;
  currentSong = (index + songs.length) % songs.length;
  audio.src = songs[currentSong];
  audio.play().catch(() => {});
  updatePlaybar();
  updatePlaylistBtnIcon();
  highlightActiveInPlaylist();
}

function togglePlay() {
  if (!audio.src) {
    setSong(0);
    return;
  }
  if (audio.paused) audio.play();
  else audio.pause();
  updatePlaylistBtnIcon();
}

// --- Wire up global controls (main playbar + cards) ---
function wireGlobalControls() {
  // main playbar buttons
  const btns = document.querySelectorAll(".songbtn img");
  if (btns.length === 3) {
    const [prevBtn, playBtn, nextBtn] = btns;
    prevBtn.addEventListener("click", () => setSong(currentSong - 1));
    playBtn.addEventListener("click", togglePlay);
    nextBtn.addEventListener("click", () => setSong(currentSong + 1));
  }

  // card mini play buttons in the grid
  document.querySelectorAll(".card .play").forEach((el) => {
    el.addEventListener("click", () => {
      const i = Number(el.getAttribute("data-index")) || 0;
      setSong(i);
    });
  });

  // keep playbar/time in sync
  audio.addEventListener("timeupdate", updatePlaybar);
  audio.addEventListener("loadedmetadata", updatePlaybar);
  audio.addEventListener("play", updatePlaybar);
  audio.addEventListener("pause", updatePlaybar);
}

// --- Seekbar control (clean version) ---
function wireSeekbar() {
  const seekbar = document.querySelector(".seekbar");
  const circle = document.querySelector(".circle");
  if (!seekbar || !circle) return;

  // update circle as song plays
  audio.addEventListener("timeupdate", () => {
    if (!isNaN(audio.duration)) {
      const progress = (audio.currentTime / audio.duration) * 100;
      circle.style.left = progress + "%";
    }
  });

  // click to jump
  seekbar.addEventListener("click", (e) => {
    if (!isNaN(audio.duration)) {
      const rect = seekbar.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const percent = offsetX / rect.width;
      audio.currentTime = percent * audio.duration;
    }
  });

  // drag the circle
  let isDragging = false;
  circle.addEventListener("mousedown", () => { isDragging = true; });
  window.addEventListener("mouseup", () => { isDragging = false; });
  window.addEventListener("mousemove", (e) => {
    if (isDragging && !isNaN(audio.duration)) {
      const rect = seekbar.getBoundingClientRect();
      let offsetX = e.clientX - rect.left;
      offsetX = Math.max(0, Math.min(rect.width, offsetX)); // clamp
      const percent = offsetX / rect.width;
      circle.style.left = percent * 100 + "%";
      audio.currentTime = percent * audio.duration;
    }
  });
}

// helper to refresh all icons depending on play state
function refreshIcons() {
  document.querySelectorAll(".playlist .song-item").forEach((el, i) => {
    const icon = el.querySelector("i");
    if (!icon) return;
    if (i === currentSong && !audio.paused) {
      icon.className = "fa-solid fa-pause play-icon"; // pause icon when playing
    } else {
      icon.className = "fa-solid fa-play play-icon"; // play icon otherwise
    }
  });
}

// --- Build playlist inside FIRST sidebar card when "Create playlist" is clicked ---
function buildPlaylistInFirstCard() {
  const firstCard = document.querySelector(".sidebar .sidebar-card");
  if (!firstCard) return;
  const createBtn = firstCard.querySelector(".sidebar-btn");
  if (!createBtn) return;

  createBtn.addEventListener("click", () => {
    // wipe the card
    firstCard.innerHTML = "";

    // header
    const h3 = document.createElement("h3");
    h3.className = "playlist-heading";

    // add icon
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-music";
    icon.style.marginRight = "8px"; // little spacing
    h3.appendChild(icon);

    // add text
    h3.appendChild(document.createTextNode("Your Playlist"));

    firstCard.appendChild(h3);

    // list
    const list = document.createElement("div");
    list.className = "playlist";

    songs.forEach((src, i) => {
      const item = document.createElement("div");
      item.className = "song-item";

      const nameSpan = document.createElement("span");
      nameSpan.textContent = `${i + 1}. ${songNameFromPath(src)}`;

      const icon = document.createElement("i");
      icon.className = "fa-solid fa-play play-icon"; // start with play icon

      // click on the icon → toggle play/pause
      icon.addEventListener("click", (e) => {
        e.stopPropagation(); // so row’s click won’t fire too
        if (currentSong === i && !audio.paused) {
          audio.pause();
        } else {
          setSong(i);
        }
        refreshIcons();
      });

      // click on the whole row → play that song
      item.addEventListener("click", () => {
        if (currentSong === i && !audio.paused) {
          audio.pause();
        } else {
          setSong(i);
        }
        refreshIcons();
      });

      item.appendChild(nameSpan);
      item.appendChild(icon);
      list.appendChild(item);
    });

    firstCard.appendChild(list);
  });
}

const playPauseBtn = document.querySelector('.play-pause-btn');
let isPlaying = false; // track state

playPauseBtn.addEventListener('click', () => {
  if (isPlaying) {
    // currently playing → pause
    playPauseBtn.src = 'images/playbar.svg';
    isPlaying = false;
    // add your pause logic here, e.g. audio.pause();
  } else {
    // currently paused → play
    playPauseBtn.src = 'images/pause.svg';
    isPlaying = true;
    // add your play logic here, e.g. audio.play();
  }
});


audio.ontimeupdate = function () {
    let progressPercent = (audio.currentTime / audio.duration) * 100;

    // Move circle
    document.querySelector(".circle").style.left = progressPercent + "%";

    // Fill blue bar
    document.querySelector(".progress").style.width = progressPercent + "%";
};

//Add an event to volume
window.onload = () => {
  let rangeInput = document.querySelector(".range input");
  //et initial values (keep slider and audio in sync)
  audio.volume = rangeInput.value / 100;
  // update audio when slider moves
  rangeInput.addEventListener("input", (e) => {
    audio.volume = parseInt(e.target.value)/100;
  });
};


// --- Init ---
(async function init() {
  await fetchSongs();
  wireGlobalControls();
  buildPlaylistInFirstCard();
  wireSeekbar();

  // keep icons in sync
  audio.addEventListener("play", refreshIcons);
  audio.addEventListener("pause", refreshIcons);
  audio.addEventListener("ended", () => {
    setSong(currentSong + 1);
    refreshIcons();
  });
})();
