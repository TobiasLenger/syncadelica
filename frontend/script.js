window.onload = () => {
    // --- 1. DOM ELEMENTS ---
    const splashScreen = document.getElementById('splash-screen');
    const mainPageLogo = document.getElementById('main-page-logo');

    const audio = document.getElementById('audio');
    const visualizerContainer = document.getElementById('visualizer-container');
    const musicFileInput = document.getElementById('music-file');
    const lrcFileInput = document.getElementById('lrc-file');
    const lyricsContainer = document.getElementById('lyrics-container');
    const lyricsList = document.getElementById('lyrics-list');
    const albumArtContainer = document.getElementById('album-art-container');
    const uiContainer = document.getElementById('ui-container');
    const showUiButton = document.getElementById('show-ui-button');
    const hideUiButton = document.getElementById('hide-ui-button');
    const toggleVisualsButton = document.getElementById('toggle-visuals-button');
    const visualsPanel = document.getElementById('visuals-panel');
    const uploadMusicButton = document.getElementById('upload-music-button');
    const uploadLrcButton = document.getElementById('upload-lrc-button');
    const openSearchWindowButton = document.getElementById('open-search-window-button'); // New Desktop Search Button
    const uploadMusicButtonTop = document.getElementById('upload-music-button-top'); // New
    const uploadLrcButtonTop = document.getElementById('upload-lrc-button-top');   // New
    const topLeftMobileControls = document.getElementById('top-left-mobile-controls');
    const topRightMobileControls = document.getElementById('top-right-mobile-controls');
    const toggleVisualsButtonTop = document.getElementById('toggle-visuals-button-top'); // New
    const layoutButtons = document.querySelectorAll('.layout-button');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const currentTimeEl = document.getElementById('current-time');
    const totalDurationEl = document.getElementById('total-duration');
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const volumeBtn = document.getElementById('volume-btn');
    const volumeIcon = document.getElementById('volume-icon');
    const volumeMuteIcon = document.getElementById('volume-mute-icon');
    const songTitleEl = document.getElementById('song-title');
    const songArtistEl = document.getElementById('song-artist');
    const playerAlbumArt = document.getElementById('player-album-art');
    const playerAlbumArtContainer = document.getElementById('player-album-art-container');
    const volumeSlider = document.getElementById('volume-slider');
    const reactivitySlider = document.getElementById('reactivity-slider');
    const greetingWindow = document.getElementById('greeting-window');
    const gotItButton = document.getElementById('got-it-button');
    const dontShowGreetingCheckbox = document.getElementById('dont-show-greeting-again');
    const hotkeyInfoWindow = document.getElementById('hotkey-info-window');
    const toggleWordAnimationButton = document.getElementById('toggle-word-animation-button');
    const toggleLinesModeButton = document.getElementById('toggle-lines-mode-button');
    const closeHotkeyInfoButton = document.getElementById('close-hotkey-info-button');
    const toggleAlbumArtButton = document.getElementById('toggle-album-art-button');
    const searchWindow = document.getElementById('search-window'); // New Search Window
    const openSearchWindowButtonTop = document.getElementById('open-search-window-button-top'); // New Mobile Search Button
    const closeSearchWindowButton = document.getElementById('close-search-window-button'); // New
    const searchInput = document.getElementById('search-input'); // New
    const searchSubmitButton = document.getElementById('search-submit-button'); // New
    const searchResultsContainer = document.getElementById('search-results-container'); // New
    const lyricsCountdownDisplay = document.getElementById('lyrics-countdown');


    // --- 2. STATE ---
    let audioContext, analyser, source;
    let lyrics = [], currentLyricIndex = -1;
    let animationFrameId;
    let lyricElements = [];
    let isUserScrolling = false;
    let scrollTimeout = null;
    let currentY = 0;
    let dragEnterCounter = 0;
    let touchStartY = 0; // For touch scrolling
    let touchMoveY = 0; // For touch scrolling
    let isWordByWordAnimationEnabled = false;
    let isLinesModeEnabled = true; // Default: Lines Mode is ON (all lines visible, .passed style applies)
    let isAlbumArtVisibleSetting = true; // Default: Album art is enabled by setting

    const BACKEND_API_URL = 'http://localhost:3000/api'; // Adjust if your backend runs elsewhere

    // --- 3. HELPER FUNCTIONS ---

    /**
     * Sets a placeholder message in the lyrics container.
     * @param {string} message - The message to display.
     * @param {'default' | 'searching' | 'notFound'} type - The type of placeholder.
     *        'default': Standard message.
     *        'searching': Message with a pulsing animation (e.g., "Searching for lyrics...").
     *        'notFound': Message for "Lyrics not found", pulses then fades out.
     */
    function setPlaceholderMessage(message, type = 'default') {
        const existingPlaceholder = lyricsContainer.querySelector('.placeholder');
        if (existingPlaceholder) existingPlaceholder.remove();

        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
        placeholder.textContent = message;

        if (type === 'searching') {
            placeholder.classList.add('searching');
        } else if (type === 'notFound') {
            placeholder.classList.add('searching'); // Add pulse animation

            setTimeout(() => {
                // Check if this placeholder is still the active one
                if (lyricsContainer.querySelector('.placeholder') === placeholder) {
                    placeholder.classList.remove('searching');
                    placeholder.classList.add('placeholder-fade-out');
                    placeholder.addEventListener('animationend', () => {
                        if (lyricsContainer.querySelector('.placeholder') === placeholder) placeholder.remove();
                    }, { once: true });
                }
            }, 3000); // Let it pulse for 3 seconds, then start fade out (1s duration)
        }

        lyricsContainer.appendChild(placeholder);
        lyricsList.innerHTML = ''; // Ensure list is empty when placeholder is shown
    }

    function resetLyrics(keepSongInfo = false) {
        lyrics = [];
        lyricElements = [];
        currentLyricIndex = -1;
        isUserScrolling = false;
        clearTimeout(scrollTimeout);

        const existingPlaceholder = lyricsContainer.querySelector('.placeholder'); // Removes any type of placeholder
        if(existingPlaceholder) existingPlaceholder.remove();
        if (lyricsCountdownDisplay) {
            lyricsCountdownDisplay.classList.remove('visible');
            lyricsCountdownDisplay.textContent = '';
        }

        lyricsList.innerHTML = '';
        songTitleEl.textContent = 'No song loaded';
        songArtistEl.textContent = '';
        currentY = lyricsContainer.clientHeight / 2;
        lyricsList.style.transition = 'none';
        lyricsList.style.transform = `translateY(${currentY}px)`;
        setTimeout(() => {
           if (lyricsList) lyricsList.style.opacity = '1'; // Ensure visible after potential countdown
           lyricsList.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
        }, 50);

        // Reset album art
        albumArtContainer.innerHTML = '';
        albumArtContainer.classList.remove('visible');

        if (!keepSongInfo) {
            songTitleEl.textContent = 'No song loaded';
            songArtistEl.textContent = '';
            // Reset player bar album art only if not keeping song info
            if (playerAlbumArt && playerAlbumArtContainer) {
                playerAlbumArt.src = '';
                playerAlbumArt.alt = '';
                playerAlbumArt.style.display = 'none';
                playerAlbumArtContainer.style.backgroundColor = '#2c2c2c'; // Restore placeholder bg
            }
            // Clear Media Session metadata
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = null;
                // Playback state will be updated by play/pause events
                // No need to set action handlers again, they persist.
            }
        }
    }

    function populateLyricsContainer() {
        const existingPlaceholder = lyricsContainer.querySelector('.placeholder');
        if (existingPlaceholder) existingPlaceholder.remove();

        if (lyricsCountdownDisplay) { // Hide countdown when repopulating
            lyricsCountdownDisplay.classList.remove('visible');
            lyricsCountdownDisplay.textContent = '';
        }
        if (lyricsList) lyricsList.style.opacity = '1'; // Ensure lyrics list is visible

        lyricsList.innerHTML = '';
        lyricElements = lyrics.map((line) => {
            const p = document.createElement('p'); // This will be the line container
            p.className = 'lyric-line';

            if (isWordByWordAnimationEnabled) {
                p.wordSpans = [];
                const words = line.text.split(/(\s+)/); // Split by space, keeping spaces
                words.forEach(wordText => {
                    if (wordText.trim().length > 0) {
                        const span = document.createElement('span');
                        span.textContent = wordText;
                        span.className = 'word';
                        p.appendChild(span);
                        p.wordSpans.push(span);
                    } else { // Append spaces as text nodes to preserve them
                        p.appendChild(document.createTextNode(wordText));
                    }
                });
            } else {
                p.textContent = line.text;
            }

            p.addEventListener('click', () => { // Click on the line still seeks
                isUserScrolling = false;
                clearTimeout(scrollTimeout);
                lyricsList.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
                audio.currentTime = line.time;
                updateLyricView(true);
            });
            lyricsList.appendChild(p);
            return p;
        });
    }

    function updateLyricView(force = false) {
        if (lyricElements.length === 0 || (isUserScrolling && !force)) {
            // If no lyrics or user is scrolling, ensure countdown is not visible
            if (lyricsCountdownDisplay) lyricsCountdownDisplay.classList.remove('visible');
            // Ensure lyrics list is visible if it has content and we are not in a countdown elsewhere
            if (lyricsList && lyricElements.length > 0) lyricsList.style.opacity = '1';
            return;
        }

        // Countdown Logic
        // Ensure lyricsCountdownDisplay is defined and there are lyrics to avoid errors.
        // Also check that lyrics[0] and lyrics[0].time are valid.
        if (lyricsCountdownDisplay && lyrics.length > 0 && lyrics[0] && typeof lyrics[0].time === 'number') {
            const firstLyricTime = lyrics[0].time;
            const timeToFirstLyric = firstLyricTime - audio.currentTime;

            // Show countdown if audio hasn't reached the first lyric's time,
            // it's within the 3-second window before the first lyric,
            // AND the first lyric doesn't start too immediately (e.g., > 0.5s).
            if (audio.currentTime < firstLyricTime && timeToFirstLyric > 0 && timeToFirstLyric <= 3.0 && firstLyricTime > 0.5) {
                const countdownNumber = Math.ceil(timeToFirstLyric);
                lyricsCountdownDisplay.textContent = countdownNumber;
                lyricsCountdownDisplay.classList.add('visible');

                if (lyricsList) lyricsList.style.opacity = '0'; // Hide lyrics list during countdown

                // Clear any active/passed classes from lyrics as they are not yet relevant
                lyricElements.forEach(el => {
                    el.classList.remove('active', 'passed');
                    if (el.wordSpans) {
                        el.wordSpans.forEach(span => span.classList.remove('word-revealed'));
                    }
                });
                currentLyricIndex = -1; // Ensure lyric index is reset during countdown
                return; // Stop further lyric processing for this frame
            } else {
                // Not in countdown window, or countdown finished
                lyricsCountdownDisplay.classList.remove('visible');
                if (lyricsList) lyricsList.style.opacity = '1'; // Ensure lyrics list is visible
            }
        } else if (lyricsCountdownDisplay) {
            // Fallback: If lyricsCountdownDisplay exists but other conditions (e.g. no lyrics) aren't met, ensure it's hidden.
            lyricsCountdownDisplay.classList.remove('visible');
            if (lyricsList) lyricsList.style.opacity = '1'; // And lyrics list is visible
        }

        let newLyricIndex = -1;
        for (let i = 0; i < lyrics.length; i++) {
            if (audio.currentTime >= lyrics[i].time) newLyricIndex = i; else break;
        }

        if (newLyricIndex !== currentLyricIndex || force) {
            const oldLyric = lyricElements[currentLyricIndex];
            if (oldLyric) {
                oldLyric.classList.remove('active');
                if (oldLyric.wordSpans) {
                    oldLyric.wordSpans.forEach(span => span.classList.remove('word-revealed'));
                }
            }

            currentLyricIndex = newLyricIndex;

            if (currentLyricIndex >= 0 && currentLyricIndex < lyricElements.length) {
                const activeElement = lyricElements[currentLyricIndex];
                if (!activeElement) return;

                activeElement.classList.add('active');

                const scrollOffset = (lyricsContainer.clientHeight / 2) - activeElement.offsetTop - (activeElement.clientHeight / 2);
                lyricsList.style.transform = `translateY(${scrollOffset}px)`;
                currentY = scrollOffset;

                lyricElements.forEach((el, index) => {
                    el.classList.toggle('passed', index < currentLyricIndex);
                });
            }
        }

        // Word-by-word animation logic
        const activeElement = (currentLyricIndex >= 0 && currentLyricIndex < lyricElements.length) ? lyricElements[currentLyricIndex] : null;

        if (isWordByWordAnimationEnabled && activeElement && activeElement.wordSpans && activeElement.wordSpans.length > 0) {
            if (activeElement.classList.contains('active')) { // Only animate words if the line itself is active
                const lineStartTime = lyrics[currentLyricIndex].time;
                const timeIntoLine = audio.currentTime - lineStartTime;

                let lineEndTime = (currentLyricIndex < lyrics.length - 1) ? lyrics[currentLyricIndex + 1].time : audio.duration;
                if (isNaN(lineEndTime) || lineEndTime <= lineStartTime) lineEndTime = lineStartTime + 5; // Default 5s for last/problematic line
                let lineDuration = lineEndTime - lineStartTime;
                if (lineDuration <= 0) lineDuration = 0.01; // Ensure positive, non-zero duration for calculation

                const numWords = activeElement.wordSpans.length;
                const estimatedTimePerWord = lineDuration / numWords;

                let currentWordToRevealIndex = -1; // Default: no words revealed yet
                if (timeIntoLine >= 0 && numWords > 0 && estimatedTimePerWord > 0) {
                    currentWordToRevealIndex = Math.floor(timeIntoLine / estimatedTimePerWord);
                    currentWordToRevealIndex = Math.max(-1, Math.min(numWords - 1, currentWordToRevealIndex));
                }

                activeElement.wordSpans.forEach((span, idx) => {
                    span.classList.toggle('word-revealed', idx <= currentWordToRevealIndex);
                });
            } else if (activeElement.wordSpans) { // Line is not active, or other conditions not met
                 activeElement.wordSpans.forEach(span => span.classList.remove('word-revealed'));
            }
        } else if (activeElement && activeElement.wordSpans) {
            // If word animation is disabled, ensure all are hidden/reset for the current line
            activeElement.wordSpans.forEach(span => span.classList.remove('word-revealed'));
        }
    }

    function setupAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            source = audioContext.createMediaElementSource(audio);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);
            analyser.connect(audioContext.destination);
        }
    }

    async function performSearch(query) {
        if (!query || query.trim() === '') {
            searchResultsContainer.innerHTML = '<p class="search-placeholder">Please enter a search term.</p>';
            return;
        }

        searchResultsContainer.innerHTML = `<p class="search-placeholder">Searching for "${query}"...</p>`;

        try {
            const response = await fetch(`${BACKEND_API_URL}/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to fetch search results. Server returned an error.' }));
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }

            const results = await response.json();

            if (results && results.length > 0) {
                renderSearchResults(results);
            } else {
                searchResultsContainer.innerHTML = `<p class="search-placeholder">No results found for "${query}".</p>`;
            }
        } catch (error) {
            console.error('Search failed:', error);
            searchResultsContainer.innerHTML = `<p class="search-placeholder">Search failed: ${error.message}. Please try again.</p>`;
        }
    }

    function renderSearchResults(results) {
        searchResultsContainer.innerHTML = ''; // Clear previous results or placeholder

        const ul = document.createElement('ul');
        ul.className = 'search-results-list';

        results.forEach(result => {
            const li = document.createElement('li');
            li.className = 'search-result-item';

            let albumArtImg = '';
            if (result.albumArtUrl) {
                albumArtImg = `<img src="${result.albumArtUrl}" alt="Album art for ${result.title}" class="search-result-album-art">`;
            } else {
                albumArtImg = `<div class="search-result-album-art-placeholder"></div>`;
            }

            li.innerHTML = `
                ${albumArtImg}
                <div class="search-result-info">
                    <h4 class="search-result-title">${result.title || 'Unknown Title'}</h4>
                    <p class="search-result-artist">${result.artist || 'Unknown Artist'}</p>
                </div>
                <button class="search-result-play-button" data-id="${result.id}" title="Play ${result.title}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </button>
            `;
            // Add event listener for playing the track (placeholder for now)
            const playButton = li.querySelector('.search-result-play-button');
            if (playButton) {
                playButton.addEventListener('click', async () => {
                    console.log('Play track from search:', result);
                    // We use result.page to stream through our backend, not result.url directly
                    if (result.page) {
                        resetLyrics(); // Clear existing lyrics and song info
                        setPlaceholderMessage(`Loading "${result.title}"...`, 'searching');

                        try {
                            // 1. Fetch song details (including direct download URL and better album art)
                            const detailsResponse = await fetch(`${BACKEND_API_URL}/song-details?page=${encodeURIComponent(result.page)}&artist=${encodeURIComponent(result.artist || '')}&title=${encodeURIComponent(result.title || '')}`);
                            if (!detailsResponse.ok) {
                                throw new Error(`Failed to fetch song details: ${detailsResponse.status}`);
                            }
                            const songDetails = await detailsResponse.json();

                            if (!songDetails.downloadUrl) {
                                alert("Could not retrieve a streamable URL for this track.");
                                setPlaceholderMessage("Error loading track.", 'default');
                                return;
                            }

                            // 2. Set audio source to stream via our backend, using the direct download URL
                            audio.src = `${BACKEND_API_URL}/stream?url=${encodeURIComponent(songDetails.downloadUrl)}`;
                            audio.load();
                            audio.currentTime = 0; // Reset playback position for new song
                            await audio.play().catch(e => console.error("Error playing audio:", e));
                            setupAudioContext();

                            songTitleEl.textContent = result.title || 'Unknown Title';
                            songArtistEl.textContent = result.artist || 'Unknown Artist';

                            // 3. Display album art (using the potentially better one from songDetails)
                            displayAlbumArt(null, result.title, result.artist, songDetails.albumArtUrl);

                            // 4. Attempt to fetch lyrics
                            if (result.title && result.artist) {
                                await searchAndApplyLyrics(result.artist, result.title);
                            } else {
                                setPlaceholderMessage("Lyrics not available for this track.", 'default');
                            }
                            // 5. Update Media Session API
                            if ('mediaSession' in navigator) {
                                const artworkToUse = songDetails.albumArtUrl; // Strictly use art from songDetails
                                navigator.mediaSession.metadata = new MediaMetadata({
                                    title: result.title || 'Unknown Title',
                                    artist: result.artist || 'Unknown Artist',
                                    album: '', // Album info not available from search result yet
                                    artwork: artworkToUse ? [{ src: artworkToUse, sizes: '512x512', type: 'image/jpeg' }] : []
                                });
                            }

                        } catch (error) {
                            console.error("Error processing selected search track:", error);
                            setPlaceholderMessage(`Error loading: ${error.message}`, 'default');
                            resetLyrics(); // Reset to a clean state on error
                        }
                    } else {
                        alert("No streamable URL found for this track.");
                        setPlaceholderMessage("Track information missing.", 'default');
                    }
                    searchWindow.classList.add('hidden'); // Close search window after selection
                });
            }
            ul.appendChild(li);
        });
        searchResultsContainer.appendChild(ul);
    }


    // --- 4. CORE LOGIC ---

    const visualizer = {
        scene: null, camera: null, renderer: null, uniforms: null,
        init() {
            this.scene = new THREE.Scene();
            this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            visualizerContainer.appendChild(this.renderer.domElement);
            const geometry = new THREE.PlaneGeometry(2, 2);
            this.uniforms = {
                u_time: { value: 0.0 }, u_resolution: { value: new THREE.Vector2() },
                u_bass: { value: 0.0 }, u_mids: { value: 0.0 }, u_treble: { value: 0.0 },
                u_reactivity: { value: 1.2 }
            };
            reactivitySlider.addEventListener('input', (e) => {
                this.uniforms.u_reactivity.value = parseFloat(e.target.value);
            });
            const material = new THREE.ShaderMaterial({
                uniforms: this.uniforms,
                vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
                fragmentShader: `
                    uniform vec2 u_resolution; uniform float u_time;
                    uniform float u_bass; uniform float u_mids; uniform float u_treble;
                    uniform float u_reactivity;
                    vec3 hsv2rgb(vec3 c){vec4 K=vec4(1.0,2.0/3.0,1.0/3.0,3.0);vec3 p=abs(fract(c.xxx+K.xyz)*6.0-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,0.0,1.0),c.y);}
                    float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
                    void main(){
                        vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
                        uv *= (1.0 - u_bass * 0.2);
                        vec3 finalColor=vec3(0.0);
                        float r=u_reactivity;
                        float time=u_time*0.1*(r*0.5+0.1);
                        float bass=u_bass;float mids=u_mids;
                        for(float i=0.0;i<4.0;i++){
                            uv.x+=0.15/(i+1.0)*sin(i*2.0+uv.y*3.0*r+time);
                            uv.y+=0.15/(i+1.0)*cos(i*2.5+uv.x*3.0*r+time);
                        }
                        float d=length(uv);vec3 col=hsv2rgb(vec3(d*0.5+time,0.8,1.0));col*=smoothstep(0.4,1.0,d);col+=hsv2rgb(vec3(d*0.2+time*0.5,0.8,1.0))*0.5;
                        finalColor=col*(0.05+bass*0.5);finalColor+=col*noise(uv*50.0)*u_treble*0.3;
                        float glow=pow(1.0-d,5.0)*(0.1+mids*0.5);finalColor+=glow*col;
                        gl_FragColor=vec4(finalColor,1.0);
                    }`
            });
            this.scene.add(new THREE.Mesh(geometry, material));
        },
        onResize() {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.uniforms.u_resolution.value.x = window.innerWidth;
            this.uniforms.u_resolution.value.y = window.innerHeight;

            // Check if a song is genuinely loaded and its info displayed
            const isSongCurrentlyLoaded = audio.src &&
                                        songTitleEl.textContent !== 'No song loaded' &&
                                        songTitleEl.textContent.trim() !== '';

            if (lyrics.length > 0) {
                // Lyrics exist, so a song must be loaded. Repopulate and update view.
                populateLyricsContainer();
                updateLyricView(true);
            } else {
                // No lyrics are currently in the `lyrics` array.
                // Clear any visual lyric lines from the list and reset scroll position.
                lyricsList.innerHTML = '';
                currentY = lyricsContainer.clientHeight / 2;
                lyricsList.style.transition = 'none';
                lyricsList.style.transform = `translateY(${currentY}px)`;
                setTimeout(() => {
                   lyricsList.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
                }, 50);

                if (isSongCurrentlyLoaded) {
                    // A song is loaded, but `lyrics` array is empty (e.g., not found, not loaded yet, or empty LRC).
                    // The placeholder (e.g., "Lyrics not found", "Searching...") should have been set by lyric processing.
                    // Do not override it with "Upload a song..." and do not clear song info.
                } else {
                    // No song is considered loaded. Reset to the initial state.
                    songTitleEl.textContent = 'No song loaded';
                    songArtistEl.textContent = '';
                    setPlaceholderMessage("Upload a song to begin.", 'default');
                }
            }

            // Album art visibility based on layout
            if (document.body.dataset.layout === 'text-center') {
                albumArtContainer.classList.remove('visible'); // Always hide if centered
            } else if (isAlbumArtVisibleSetting && albumArtContainer.querySelector('img')) {
                albumArtContainer.classList.add('visible'); // Show if setting allows and art exists
            }
        },
        draw(audioData) {
            this.uniforms.u_time.value += 0.016;
            this.uniforms.u_bass.value = audioData.bass;
            this.uniforms.u_mids.value = audioData.mids;
            this.uniforms.u_treble.value = audioData.treble;
            this.renderer.render(this.scene, this.camera);
        }
    };

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        let audioData = { bass: 0, mids: 0, treble: 0 };

        if (analyser) {
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);
            audioData = {
                bass: getFrequencyAverage(dataArray, 0, 10),
                mids: getFrequencyAverage(dataArray, 20, 50),
                treble: getFrequencyAverage(dataArray, 80, 120)
            };
        }

        visualizer.draw(audioData);

        if (!audio.paused) {
            updateLyricView();
        }
    }

    function getFrequencyAverage(dataArray, low, high) {
        let sum = 0, count = high - low + 1;
        for (let i = low; i <= high; i++) sum += dataArray[i];
        return (sum / count) / 255;
    }

    async function searchAndApplyLyrics(artist, title) {
        setPlaceholderMessage("Searching for lyrics...", 'searching');
        const lrcContent = await fetchLyrics(artist, title);
        if (lrcContent) {
            lyrics = parseLRC(lrcContent);
            if (lyrics.length > 0) { // Check if parsing actually yielded lyrics
                populateLyricsContainer();
            } else {
                // lrcContent was present, but parsing resulted in no usable lyrics
                // (e.g., it was plain text, or malformed LRC with no valid lines)
                setPlaceholderMessage("Lyrics not found or format not supported. Please upload an .lrc file.", 'notFound');
            }
        } else {
            setPlaceholderMessage("Lyrics not found. Please upload an .lrc file.", 'notFound');
        }
    }


    function parseFilename(filename) {
        const cleanedName = filename.replace(/\.[^/.]+$/, "").replace(/_/g, " ").replace(/\s*\[.*?\]\s*/g, "").replace(/\s*\(.*?\)\s*/g, "").replace(/(official|lyric|video|audio|h[dq])/i, "").trim();
        const match = cleanedName.match(/(.+?)\s*-\s*(.+)/);
        if (match) return { artist: match[1].trim(), title: match[2].trim() };
        return { artist: '', title: cleanedName };
    }

    async function fetchLyrics(artist, title) {
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.json();
            return data?.syncedLyrics || data?.plainLyrics || null;
        } catch (error) { console.error('[API] Fetch error:', error); return null; }
    }

    function parseLRC(lrcText) {
        return lrcText.split('\n').map(line => {
            const match = line.match(/^\[(\d{2}):(\d{2})\.(\d+)\](.*)$/);
            if (match) {
                const time = parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3]) / (match[3].length === 2 ? 100 : 1000);
                const text = match[4].trim();
                if (text) return { time, text };
            }
        }).filter(Boolean).sort((a, b) => a.time - b.time);
    }

    function setupEventListeners() {
        window.addEventListener('resize', () => visualizer.onResize());
        hideUiButton.addEventListener('click', () => {
            visualsPanel.classList.add('hidden');
            uiContainer.classList.add('hidden');
            showUiButton.classList.remove('hidden');
            if (mainPageLogo) mainPageLogo.classList.add('hidden-by-ui');
            if (topLeftMobileControls) topLeftMobileControls.classList.add('mobile-controls-hidden-by-ui');
            if (topRightMobileControls) topRightMobileControls.classList.add('mobile-controls-hidden-by-ui');
        });
        showUiButton.addEventListener('click', () => {
            uiContainer.classList.remove('hidden');
            showUiButton.classList.add('hidden');
            if (mainPageLogo) {
                mainPageLogo.classList.remove('hidden-by-ui');
                // mainPageLogo.style.pointerEvents = 'auto'; // CSS handles this via .hidden-by-ui removal
            }
            // The CSS for these elements handles their display based on screen width.
            // Removing the 'hidden' class allows the CSS to take effect.
            if (topLeftMobileControls) topLeftMobileControls.classList.remove('mobile-controls-hidden-by-ui');
            if (topRightMobileControls) topRightMobileControls.classList.remove('mobile-controls-hidden-by-ui');
            // Note: visualsPanel remains hidden unless explicitly opened by toggleVisualsButton
        });

        if (mainPageLogo && hotkeyInfoWindow) {
            mainPageLogo.addEventListener('click', () => {
                // Only allow opening if the logo itself is not hidden by the UI (and thus clickable)
                if (!mainPageLogo.classList.contains('hidden-by-ui') && getComputedStyle(mainPageLogo).pointerEvents !== 'none') {
                    hotkeyInfoWindow.classList.remove('hidden');
                }
            });
        }
        // Original toggle visuals button
        // toggleVisualsButton.addEventListener('click', () => visualsPanel.classList.toggle('hidden'));
        // Swapped functionality: toggleVisualsButton now opens search
        if (toggleVisualsButton && searchWindow) {
            toggleVisualsButton.addEventListener('click', () => {
                searchWindow.classList.remove('hidden');
                searchInput.focus(); // Auto-focus the search input
            });
        }
        // Top mobile toggle visuals button
        if (toggleVisualsButtonTop) toggleVisualsButtonTop.addEventListener('click', () => visualsPanel.classList.toggle('hidden'));

        uploadMusicButton.addEventListener('click', () => musicFileInput.click());
        if (uploadMusicButtonTop) uploadMusicButtonTop.addEventListener('click', () => musicFileInput.click());
        uploadLrcButton.addEventListener('click', () => lrcFileInput.click());
        if (uploadLrcButtonTop) uploadLrcButtonTop.addEventListener('click', () => lrcFileInput.click());
        musicFileInput.addEventListener('change', handleMusicUpload);
        lrcFileInput.addEventListener('change', handleLrcUpload);

        layoutButtons.forEach(button => button.addEventListener('click', () => {
             document.body.dataset.layout = button.dataset.layout;
            layoutButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Toggle album art visibility based on layout
            if (button.dataset.layout === 'text-center') {
                albumArtContainer.classList.remove('visible');
            } else if (isAlbumArtVisibleSetting) {
                // Show only if art actually exists (img child) and setting allows
                if (albumArtContainer.querySelector('img')) albumArtContainer.classList.add('visible');
            } else {
                albumArtContainer.classList.remove('visible'); // Hide if setting disallows
            }

            // Disable/enable album art toggle based on layout
            if (toggleAlbumArtButton) {
                toggleAlbumArtButton.disabled = (button.dataset.layout === 'text-center');
                toggleAlbumArtButton.classList.toggle('inactive', button.dataset.layout === 'text-center');
            }
        }));

        lyricsContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            isUserScrolling = true;
            clearTimeout(scrollTimeout);

            lyricsList.style.transition = 'none';
            currentY -= e.deltaY * 0.5;
            lyricsList.style.transform = `translateY(${currentY}px)`;

            scrollTimeout = setTimeout(() => {
                isUserScrolling = false;
                lyricsList.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
                updateLyricView(true);
            }, 2000);
        });

        // Touch scrolling for lyrics
        lyricsContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) { // Single touch
                isUserScrolling = true;
                clearTimeout(scrollTimeout);
                lyricsList.style.transition = 'none'; // Allow immediate drag
                touchStartY = e.touches[0].clientY;
                touchMoveY = currentY; // Start from the current scrolled position
            }
        });

        lyricsContainer.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && isUserScrolling) {
                e.preventDefault(); // Prevent page scroll
                const deltaY = e.touches[0].clientY - touchStartY;
                currentY = touchMoveY + deltaY;
                lyricsList.style.transform = `translateY(${currentY}px)`;
            }
        });

        lyricsContainer.addEventListener('touchend', () => {
            if (isUserScrolling) {
                scrollTimeout = setTimeout(() => {
                    isUserScrolling = false;
                    lyricsList.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
                    updateLyricView(true); // Snap to the nearest lyric or update view
                }, 1000); // A shorter timeout after touch might feel more responsive
            }
        });

        playPauseBtn.addEventListener('click', togglePlayPause);
        audio.addEventListener('play', updatePlayPauseIcon);
        audio.addEventListener('pause', updatePlayPauseIcon);
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', setDuration);
        // Add event listeners for buffering state on progress bar
        audio.addEventListener('seeking', () => {
            if (progressBar) progressBar.classList.add('buffering');
        });
        audio.addEventListener('waiting', () => {
            if (progressBar) progressBar.classList.add('buffering');
        });
        audio.addEventListener('seeked', () => {
            if (progressBar) progressBar.classList.remove('buffering');
        });
        audio.addEventListener('canplay', () => { // Clears buffering when ready to play after waiting/seeking
            if (progressBar) progressBar.classList.remove('buffering');
        });
        volumeBtn.addEventListener('click', toggleMute);

        // Media Session API Setup
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => {
                if (audio.src) audio.play();
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                if (audio.src) audio.pause();
            });
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (audio.src && isFinite(audio.duration) && details.seekTime !== undefined) {
                    audio.currentTime = details.seekTime;
                    updateProgress(); // Update UI and media session state
                }
            });
            navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                const skipTime = details.seekOffset || 10; // Default to 10s
                if (audio.src) audio.currentTime = Math.max(audio.currentTime - skipTime, 0);
                updateProgress();
            });
            navigator.mediaSession.setActionHandler('seekforward', (details) => {
                const skipTime = details.seekOffset || 10; // Default to 10s
                if (audio.src && isFinite(audio.duration)) audio.currentTime = Math.min(audio.currentTime + skipTime, audio.duration);
                updateProgress();
            });
            // Note: previoustrack, nexttrack, seekbackward, seekforward could be added
            // if corresponding functionality exists (e.g., playlist, finer seeking).
            // For now, play/pause are the most relevant.
        }

        volumeSlider.addEventListener('input', setVolume);

        if (gotItButton && greetingWindow && dontShowGreetingCheckbox) {
            gotItButton.addEventListener('click', () => {
                greetingWindow.classList.add('hidden');
                if (dontShowGreetingCheckbox.checked) {
                    localStorage.setItem('syncadelicaGreetingShown', 'true');
                }
            });
        }

        if (closeHotkeyInfoButton && hotkeyInfoWindow) {
            closeHotkeyInfoButton.addEventListener('click', () => {
                hotkeyInfoWindow.classList.add('hidden');
            });
        }

        if (toggleWordAnimationButton) {
            toggleWordAnimationButton.addEventListener('click', () => {
                isWordByWordAnimationEnabled = !isWordByWordAnimationEnabled;
                toggleWordAnimationButton.classList.toggle('active', isWordByWordAnimationEnabled);

                document.body.dataset.wordAnimation = isWordByWordAnimationEnabled ? 'on' : 'off';

                if (isWordByWordAnimationEnabled) {
                    // When word-by-word is enabled, Lines Mode is ON by default.
                    // The user can then optionally turn Lines Mode off via its own toggle.
                    isLinesModeEnabled = true; // Default to ON when activating word-by-word
                    document.body.dataset.linesMode = 'on';
                    toggleLinesModeButton.classList.add('active');
                } else {
                    // When word-by-word is disabled, force Lines Mode ON.
                    isLinesModeEnabled = true;
                    document.body.dataset.linesMode = 'on';
                    toggleLinesModeButton.classList.add('active');
                }

                if (lyrics.length > 0) populateLyricsContainer(); // Re-populate to add/remove word spans
                updateLyricView(true); // Refresh view
            });
        }

        if (toggleLinesModeButton) {
            toggleLinesModeButton.addEventListener('click', () => {
                if (isWordByWordAnimationEnabled) {
                    // Only allow toggling Lines Mode if word-by-word animation is active
                    isLinesModeEnabled = !isLinesModeEnabled;
                    toggleLinesModeButton.classList.toggle('active', isLinesModeEnabled);
                    document.body.dataset.linesMode = isLinesModeEnabled ? 'on' : 'off';
                    updateLyricView(true);
                }
                // If word-by-word is not enabled, this button effectively does nothing,
                // as Lines Mode is forced ON by the other toggle's logic.
            });
        }

        if (toggleAlbumArtButton) {
            toggleAlbumArtButton.addEventListener('click', () => {
                isAlbumArtVisibleSetting = !isAlbumArtVisibleSetting;
                toggleAlbumArtButton.classList.toggle('active', isAlbumArtVisibleSetting);

                if (isAlbumArtVisibleSetting && document.body.dataset.layout !== 'text-center' && albumArtContainer.querySelector('img')) {
                    albumArtContainer.classList.add('visible');
                } else {
                    albumArtContainer.classList.remove('visible');
                }
            });
            // Initialize button state
            toggleAlbumArtButton.classList.toggle('active', isAlbumArtVisibleSetting);
            // Also set initial disabled state based on current layout
            const currentLayout = document.body.dataset.layout || document.querySelector('.layout-button.active')?.dataset.layout;
            toggleAlbumArtButton.disabled = (currentLayout === 'text-center');
            toggleAlbumArtButton.classList.toggle('inactive', currentLayout === 'text-center');
        }

        // openSearchWindowButton now toggles visuals panel
        if (openSearchWindowButton && searchWindow) {
            // openSearchWindowButton.addEventListener('click', () => {
            //     searchWindow.classList.remove('hidden');
            //     searchInput.focus(); // Auto-focus the search input
            // });
            openSearchWindowButton.addEventListener('click', () => visualsPanel.classList.toggle('hidden'));
        }
        if (openSearchWindowButtonTop && searchWindow) { // Mobile search button
            openSearchWindowButtonTop.addEventListener('click', () => {
                searchWindow.classList.remove('hidden');
                searchInput.focus();
            });
        }

        if (closeSearchWindowButton && searchWindow) {
            closeSearchWindowButton.addEventListener('click', () => {
                searchWindow.classList.add('hidden');
            });
        }

        if (searchSubmitButton && searchInput) {
            searchSubmitButton.addEventListener('click', () => performSearch(searchInput.value));
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(searchInput.value); });
        }
    }

    async function processMusicFile(file) {
        if (!file || !file.type.startsWith('audio/')) return;
        resetLyrics();
        setPlaceholderMessage("Reading file...", 'default');

        audio.src = URL.createObjectURL(file);
        audio.load();
        audio.currentTime = 0; // Reset playback position for new song
        audio.play();
        setupAudioContext();

        window.jsmediatags.read(file, {
            onSuccess: async (tag) => {
                const { title, artist } = tag.tags;
                const parsedFilename = parseFilename(file.name);
                const finalTitle = title || parsedFilename.title || 'Unknown Title';
                const finalArtist = artist || parsedFilename.artist || 'Unknown Artist';

                if ('mediaSession' in navigator) {
                    const artwork = [];
                    if (tag.tags.picture) {
                        const base64String = tag.tags.picture.data.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
                        const imageUrl = `data:${tag.tags.picture.format};base64,${window.btoa(base64String)}`;
                        artwork.push({ src: imageUrl, sizes: '512x512', type: tag.tags.picture.format }); // Adjust sizes as needed
                    }
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: finalTitle, artist: finalArtist, album: tag.tags.album || '', artwork: artwork
                    });
                }
                displayAlbumArt(tag.tags.picture, finalTitle, finalArtist);
                songTitleEl.textContent = finalTitle;
                songArtistEl.textContent = finalArtist;
                if (finalTitle !== 'Unknown Title' && finalArtist !== 'Unknown Artist') {
                    await searchAndApplyLyrics(finalArtist, finalTitle);
                } else {
                    // Fallback to filename parsing if tags are incomplete
                    const fromFilename = parseFilename(file.name);
                    songTitleEl.textContent = fromFilename.title || 'Unknown Title';
                    songArtistEl.textContent = fromFilename.artist || 'Unknown Artist';
                    await searchAndApplyLyrics(fromFilename.artist, fromFilename.title);
                }
            },
            onError: async () => {
                const fromFilename = parseFilename(file.name);
                const finalTitle = fromFilename.title || 'Unknown Title';
                const finalArtist = fromFilename.artist || 'Unknown Artist';

                albumArtContainer.innerHTML = ''; // Clear previous art
                albumArtContainer.classList.remove('visible');
                songTitleEl.textContent = finalTitle;
                songArtistEl.textContent = finalArtist;
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: finalTitle, artist: finalArtist, album: '', artwork: []
                    });
                }
                await searchAndApplyLyrics(finalArtist, finalTitle);
            }
        });
    }

    function displayAlbumArt(picture, title, artist, directImageUrl = null) {
        albumArtContainer.innerHTML = ''; // Clear previous art
        let imageUrlToDisplay = directImageUrl;

        if (!imageUrlToDisplay && picture && picture.data) { // Fallback to jsmediatags picture
            const base64String = picture.data.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
            imageUrlToDisplay = `data:${picture.format};base64,${window.btoa(base64String)}`;
        }

        if (imageUrlToDisplay) {
            const img = document.createElement('img');
            img.src = imageUrlToDisplay;
            img.alt = "Album Art";
            albumArtContainer.appendChild(img);

            const artInfoDiv = document.createElement('div');
            artInfoDiv.className = 'album-art-info';

            const titleDiv = document.createElement('div');
            titleDiv.className = 'album-art-title';
            titleDiv.textContent = title;
            artInfoDiv.appendChild(titleDiv);

            const artistDiv = document.createElement('div');
            artistDiv.className = 'album-art-artist';
            artistDiv.textContent = artist;
            artInfoDiv.appendChild(artistDiv);

            albumArtContainer.appendChild(artInfoDiv);

            if (isAlbumArtVisibleSetting && document.body.dataset.layout !== 'text-center') {
                albumArtContainer.classList.add('visible');
            }

            // Player bar album art
            if (playerAlbumArt && playerAlbumArtContainer) {
                playerAlbumArt.src = imageUrlToDisplay;
                playerAlbumArt.alt = `Album art for ${title}`;
                playerAlbumArt.style.display = 'block';
                playerAlbumArtContainer.style.backgroundColor = 'transparent'; // Remove placeholder bg
            }
        } else {
            albumArtContainer.classList.remove('visible');
            // Reset player bar album art if no image to display
            if (playerAlbumArt && playerAlbumArtContainer) {
                playerAlbumArt.src = '';
                playerAlbumArt.alt = '';
                playerAlbumArt.style.display = 'none';
                playerAlbumArtContainer.style.backgroundColor = '#2c2c2c';
            }
        }
    }

    function processLrcFile(file) {
        if (!file || !file.name.toLowerCase().endsWith('.lrc')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            resetLyrics(true); // Reset lyrics but keep song info if a song is already playing
            lyrics = parseLRC(e.target.result);
            populateLyricsContainer();
            if (!audio.paused) { // If audio is playing, update view to sync with new lyrics
                updateLyricView(true);
            }
        };
        reader.readAsText(file);
    }

    async function handleMusicUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        await processMusicFile(file);
    }

    function handleLrcUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        processLrcFile(file);
    }

    function setupDragAndDropListeners() {
        document.body.addEventListener('dragenter', (e) => {
            e.preventDefault(); e.stopPropagation();
            dragEnterCounter++;
            document.body.classList.add('drag-over-active');
        });
        document.body.addEventListener('dragover', (e) => {
            e.preventDefault(); e.stopPropagation(); // Necessary to allow drop
        });
        document.body.addEventListener('dragleave', (e) => {
            e.preventDefault(); e.stopPropagation();
            dragEnterCounter--;
            if (dragEnterCounter === 0) document.body.classList.remove('drag-over-active');
        });
        document.body.addEventListener('drop', async (e) => {
            e.preventDefault(); e.stopPropagation();
            document.body.classList.remove('drag-over-active');
            dragEnterCounter = 0;
            const droppedFiles = e.dataTransfer.files;
            if (droppedFiles.length > 0) {
                let audioFile = Array.from(droppedFiles).find(f => f.type.startsWith('audio/'));
                let lrcFile = Array.from(droppedFiles).find(f => f.name.toLowerCase().endsWith('.lrc'));

                if (audioFile) await processMusicFile(audioFile); // Process music first
                if (lrcFile) processLrcFile(lrcFile);     // Then process LRC, potentially overriding fetched lyrics
            }
        });
    }

    function formatTime(seconds) {
        // Handle Infinity, NaN, and negative values gracefully
        if (!isFinite(seconds) || seconds < 0) return "--:--";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
    function updateProgress() {
        if (isFinite(audio.duration)) {
            progressFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
        }
        currentTimeEl.textContent = formatTime(audio.currentTime);

        // Update Media Session position state
        if ('mediaSession' in navigator && audio.src && isFinite(audio.duration)) {
            navigator.mediaSession.setPositionState?.({ duration: audio.duration, playbackRate: audio.playbackRate, position: audio.currentTime });
        }
        if (progressBar && audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA && !audio.paused) {
            progressBar.classList.remove('buffering'); // Ensure buffering is removed if playing smoothly
        }
    }

    function setProgress(e) {
        // Check if audio is seekable before attempting to set currentTime
        if (audio.src && isFinite(audio.duration) && audio.seekable && audio.seekable.length > 0) {
            console.log('[setProgress] audio.duration:', audio.duration);
            const rect = progressBar.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            // Ensure offsetX is within the bounds of the progress bar [0, clientWidth]
            const boundedOffsetX = Math.max(0, Math.min(offsetX, progressBar.clientWidth));
            const newTime = (boundedOffsetX / progressBar.clientWidth) * audio.duration;
            console.log('[setProgress] Calculated newTime:', newTime, 'from offsetX:', boundedOffsetX, 'clientWidth:', progressBar.clientWidth);
            audio.currentTime = newTime;
            updateProgress();
        } else {
            console.warn('[setProgress] Audio is not seekable or duration is not finite. Duration:', audio.duration, 'Seekable:', audio.seekable);
        }
    }

    // This toggleMute is correct, the one above was an error / duplicate
    function setVolume() {
        audio.volume = parseFloat(volumeSlider.value); // Ensure value is a number
        // Do NOT set audio.muted based on volume here. Let the volume slider control volume,
        // and the mute button control mute state independently.
        // The updateVolumeIcon function handles the visual representation.
        updateVolumeIcon();
    }
    function updateVolumeIcon() {
        volumeIcon.classList.toggle('hidden', audio.muted || audio.volume === 0);
        volumeMuteIcon.classList.toggle('hidden', !audio.muted && audio.volume > 0);
    }

    // This setDuration is correct, the one above was incomplete
    function setDuration() {
        console.log('[setDuration] audio.duration:', audio.duration);
        totalDurationEl.textContent = formatTime(audio.duration);
        updateProgress(); // Ensure media session gets duration info ASAP and updates position

        // Update progress bar interactivity based on seekability
        // A stream is seekable if audio.seekable has at least one time range.
        // We also require finite duration for meaningful seeking via the progress bar.
        const isSeekable = audio.seekable && audio.seekable.length > 0 && isFinite(audio.duration);

        if (isSeekable) {
            progressBar.removeEventListener('click', setProgress); // Defensive remove
            progressBar.addEventListener('click', setProgress);
            progressBar.style.cursor = 'pointer';
            progressBar.title = 'Seek';
        } else {
            progressBar.removeEventListener('click', setProgress);
            progressBar.style.cursor = 'default';
            progressBar.title = 'Seeking not available';
        }
    }

    function handleGlobalKeyDown(e) {
        const activeElement = document.activeElement;
        const isTypingInInput = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

        // Priority for Escape key to close modals
        if (e.code === 'Escape') {
            if (searchWindow && !searchWindow.classList.contains('hidden')) {
                e.preventDefault();
                searchWindow.classList.add('hidden');
                return;
            }
            if (hotkeyInfoWindow && !hotkeyInfoWindow.classList.contains('hidden')) {
                e.preventDefault();
                hotkeyInfoWindow.classList.add('hidden');
                return;
            }
            // Greeting window is not typically closed by Escape once "Got it" is clicked.
        }

        if (isTypingInInput) {
            return; // Don't process other hotkeys if typing in an input, unless it was Escape (handled above)
        }

        switch (e.code) {
            case 'KeyO':
                e.preventDefault();
                musicFileInput.click();
                break;
            case 'KeyH':
                e.preventDefault();
                if (uiContainer.classList.contains('hidden')) {
                    uiContainer.classList.remove('hidden');
                    showUiButton.classList.add('hidden');
                    // Optionally, decide if visualsPanel should also re-open or remember its state
                    if (mainPageLogo) {
                        mainPageLogo.classList.remove('hidden-by-ui');
                        // mainPageLogo.style.pointerEvents = 'auto'; // CSS handles this
                    }
                    if (topLeftMobileControls) topLeftMobileControls.classList.remove('mobile-controls-hidden-by-ui');
                    if (topRightMobileControls) topRightMobileControls.classList.remove('mobile-controls-hidden-by-ui');

                } else {
                    visualsPanel.classList.add('hidden');
                    uiContainer.classList.add('hidden');
                    showUiButton.classList.remove('hidden');
                    if (mainPageLogo) mainPageLogo.classList.add('hidden-by-ui');
                    if (topLeftMobileControls) topLeftMobileControls.classList.add('mobile-controls-hidden-by-ui');
                    if (topRightMobileControls) topRightMobileControls.classList.add('mobile-controls-hidden-by-ui');
                }
                break;
            case 'Space':
                if (!isTypingInInput) { // Prevent space from triggering play/pause if typing
                    e.preventDefault();
                    if (audio.src) togglePlayPause();
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (audio.src) {
                    volumeSlider.value = Math.max(0, audio.volume - 0.05).toString();
                    setVolume();
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (audio.src) {
                    volumeSlider.value = Math.min(1, audio.volume + 0.05).toString();
                    setVolume();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (audio.src && lyrics.length > 0 && currentLyricIndex > 0) {
                    isUserScrolling = false;
                    clearTimeout(scrollTimeout);
                    lyricsList.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
                    audio.currentTime = lyrics[currentLyricIndex - 1].time; // Seek
                    updateProgress(); // Update media session
                    updateLyricView(true);
                } else if (audio.src && lyrics.length > 0 && currentLyricIndex === 0) {
                    audio.currentTime = 0; // Seek to beginning
                    updateProgress(); // Update media session
                    updateLyricView(true);
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (audio.src && lyrics.length > 0 && currentLyricIndex < lyrics.length - 1) {
                    isUserScrolling = false;
                    clearTimeout(scrollTimeout);
                    lyricsList.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
                    audio.currentTime = lyrics[currentLyricIndex + 1].time; // Seek
                    updateProgress(); // Update media session
                    updateLyricView(true);
                } else if (audio.src && lyrics.length > 0 && currentLyricIndex === lyrics.length - 1) {
                }
                break;
            case 'KeyF': // Fullscreen toggle
                e.preventDefault();
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    }
                }
                break;
        }
    }

    function togglePlayPause() {
        if (!audio.src) return; // Do nothing if no source
        if (audio.paused) {
            audio.play().catch(e => console.error("Error playing audio:", e));
        } else {
            audio.pause();
        }
    }
    // This updatePlayPauseIcon is correct, the one removed earlier was incomplete
    function updatePlayPauseIcon() {
        const isPaused = audio.paused;
        playIcon.classList.toggle('hidden', !isPaused);
        pauseIcon.classList.toggle('hidden', isPaused);

        if ('mediaSession' in navigator) {
            if (audio.src) { // Only update if a song is loaded
                navigator.mediaSession.playbackState = isPaused ? "paused" : "playing";
                updateProgress(); // Update media session position state
            } else {
                navigator.mediaSession.playbackState = "none";
            }
        }
    }

    // This toggleMute is correct, the one removed earlier was an error
    function toggleMute() {
        audio.muted = !audio.muted;
        // When muting via the button, we don't change the slider value.
        // This allows the user to unmute and return to their previous volume level.
        // When unmuting via the button, if the volume slider is at 0, set it to a small value (e.g., 0.1)
        // to make sound audible immediately.
        if (!audio.muted && audio.volume === 0) {
             audio.volume = 0.1;
             volumeSlider.value = 0.1;
        }
        updateVolumeIcon();
    }

    function setupCollapsibles() {
        const triggers = document.querySelectorAll('.collapsible-trigger');
        triggers.forEach(trigger => {
            const targetId = trigger.getAttribute('aria-controls');
            const target = document.getElementById(targetId);

            if (target) {
                // Set initial aria-hidden for target based on trigger's initial aria-expanded
                const initiallyExpanded = trigger.getAttribute('aria-expanded') === 'true';
                target.setAttribute('aria-hidden', String(!initiallyExpanded));

                if (initiallyExpanded) { // If meant to be initially expanded (not for this use case)
                    trigger.classList.add('expanded');
                    target.classList.add('expanded');
                }

                trigger.addEventListener('click', () => {
                    const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
                    trigger.setAttribute('aria-expanded', String(!isExpanded));
                    target.setAttribute('aria-hidden', String(isExpanded)); // If it was expanded, it will be hidden

                    trigger.classList.toggle('expanded');
                    target.classList.toggle('expanded');
                });
            }
        });
    }
    // --- 5. INITIALIZATION ---
    visualizer.init();
    setupEventListeners();
    setupDragAndDropListeners();
    visualizer.onResize(); // Call resize once to set initial state
    animate();

    setupCollapsibles();
    // Initialize dataset attributes and button states based on initial JS state
    document.body.dataset.layout = document.querySelector('.layout-button.active')?.dataset.layout || 'text-center';
    document.body.dataset.wordAnimation = isWordByWordAnimationEnabled ? 'on' : 'off'; // 'off' by default
    document.body.dataset.linesMode = isLinesModeEnabled ? 'on' : 'off'; // 'on' by default

    if (toggleLinesModeButton) toggleLinesModeButton.classList.toggle('active', isLinesModeEnabled); // Active by default
    if (toggleWordAnimationButton) toggleWordAnimationButton.classList.toggle('active', isWordByWordAnimationEnabled); // Inactive by default
    if (toggleAlbumArtButton) toggleAlbumArtButton.classList.toggle('active', isAlbumArtVisibleSetting); // Active by default

    // Initially hide the main page logo if UI is hidden by default (it's not, but good practice)
    // and set its interactivity based on UI visibility.
    if (mainPageLogo) {
        if (uiContainer.classList.contains('hidden')) { // If UI is initially hidden
            mainPageLogo.classList.add('hidden-by-ui'); // This class handles opacity and pointer-events
        } else {
            mainPageLogo.style.pointerEvents = 'auto'; // Make it interactive if UI is visible
        }
    }
    document.addEventListener('keydown', handleGlobalKeyDown);

    // Hide splash screen
    if (splashScreen) {
        splashScreen.classList.add('fade-out');
        splashScreen.addEventListener('transitionend', () => {
            splashScreen.classList.add('hidden');
        }, { once: true });
    }

    // Show greeting window if not previously dismissed
    if (greetingWindow && localStorage.getItem('syncadelicaGreetingShown') !== 'true') {
        greetingWindow.classList.remove('hidden');
    } else if (greetingWindow) {
        greetingWindow.classList.add('hidden'); // Ensure it's hidden if already dismissed
    }
};
