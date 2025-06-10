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
    const uiContainer = document.getElementById('ui-container');
    const showUiButton = document.getElementById('show-ui-button');
    const hideUiButton = document.getElementById('hide-ui-button');
    const toggleVisualsButton = document.getElementById('toggle-visuals-button');
    const visualsPanel = document.getElementById('visuals-panel');
    const uploadMusicButton = document.getElementById('upload-music-button');
    const uploadLrcButton = document.getElementById('upload-lrc-button');
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
    const volumeSlider = document.getElementById('volume-slider');
    const reactivitySlider = document.getElementById('reactivity-slider');
    const greetingWindow = document.getElementById('greeting-window');
    const gotItButton = document.getElementById('got-it-button');
    const dontShowGreetingCheckbox = document.getElementById('dont-show-greeting-again');
    const hotkeyInfoWindow = document.getElementById('hotkey-info-window');
    const toggleWordAnimationButton = document.getElementById('toggle-word-animation-button');
    const toggleLinesModeButton = document.getElementById('toggle-lines-mode-button');
    const closeHotkeyInfoButton = document.getElementById('close-hotkey-info-button');


    // --- 2. STATE ---
    let audioContext, analyser, source;
    let lyrics = [], currentLyricIndex = -1;
    let animationFrameId;
    let lyricElements = [];
    let isUserScrolling = false;
    let scrollTimeout = null;
    let currentY = 0;
    let dragEnterCounter = 0;
    let isWordByWordAnimationEnabled = false;
    let isLinesModeEnabled = true; // Default: Lines Mode is ON (all lines visible, .passed style applies)

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

        lyricsList.innerHTML = '';
        songTitleEl.textContent = 'No song loaded';
        songArtistEl.textContent = '';
        currentY = lyricsContainer.clientHeight / 2;
        lyricsList.style.transition = 'none';
        lyricsList.style.transform = `translateY(${currentY}px)`;
        setTimeout(() => {
           lyricsList.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
        }, 50);
    }

    function populateLyricsContainer() {
        const existingPlaceholder = lyricsContainer.querySelector('.placeholder');
        if (existingPlaceholder) existingPlaceholder.remove();
        
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
        if (lyricElements.length === 0 || (isUserScrolling && !force)) return;
        
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
            populateLyricsContainer();
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
            const match = line.match(/\[(\d{2}):(\d{2})[.:](\d{2,3})\](.*)/);
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
        });
        showUiButton.addEventListener('click', () => {
            uiContainer.classList.remove('hidden');
            showUiButton.classList.add('hidden');
            if (mainPageLogo) {
                mainPageLogo.classList.remove('hidden-by-ui');
                mainPageLogo.style.pointerEvents = 'auto';
            }
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
        toggleVisualsButton.addEventListener('click', () => visualsPanel.classList.toggle('hidden'));
        uploadMusicButton.addEventListener('click', () => musicFileInput.click());
        uploadLrcButton.addEventListener('click', () => lrcFileInput.click());
        musicFileInput.addEventListener('change', handleMusicUpload);
        lrcFileInput.addEventListener('change', handleLrcUpload);
        
        layoutButtons.forEach(button => button.addEventListener('click', () => {
             document.body.dataset.layout = button.dataset.layout;
            layoutButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
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

        playPauseBtn.addEventListener('click', togglePlayPause);
        audio.addEventListener('play', updatePlayPauseIcon);
        audio.addEventListener('pause', updatePlayPauseIcon);
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', setDuration);
        progressBar.addEventListener('click', setProgress);
        volumeBtn.addEventListener('click', toggleMute);
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
    }

    async function processMusicFile(file) {
        if (!file || !file.type.startsWith('audio/')) return;
        resetLyrics();
        setPlaceholderMessage("Reading file...", 'default');

        audio.src = URL.createObjectURL(file);
        audio.load();
        audio.play();
        setupAudioContext();

        window.jsmediatags.read(file, {
            onSuccess: async (tag) => {
                const { title, artist } = tag.tags;
                songTitleEl.textContent = title || 'Unknown Title';
                songArtistEl.textContent = artist || 'Unknown Artist';
                if (title && artist) {
                    await searchAndApplyLyrics(artist, title);
                } else {
                    const fromFilename = parseFilename(file.name);
                    songTitleEl.textContent = fromFilename.title || 'Unknown Title';
                    songArtistEl.textContent = fromFilename.artist || 'Unknown Artist';
                    await searchAndApplyLyrics(fromFilename.artist, fromFilename.title);
                }
            },
            onError: async () => {
                const fromFilename = parseFilename(file.name);
                songTitleEl.textContent = fromFilename.title || 'Unknown Title';
                songArtistEl.textContent = fromFilename.artist || 'Unknown Artist';
                await searchAndApplyLyrics(fromFilename.artist, fromFilename.title);
            }
        });
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

    function togglePlayPause() { if (audio.paused) audio.play(); else audio.pause(); }
    function updatePlayPauseIcon() {
        playIcon.classList.toggle('hidden', !audio.paused);
        pauseIcon.classList.toggle('hidden', audio.paused);
    }
    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
    function updateProgress() {
        if (isFinite(audio.duration)) {
            progressFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
        }
        currentTimeEl.textContent = formatTime(audio.currentTime);
    }
    function setDuration() { totalDurationEl.textContent = formatTime(audio.duration); }
    function setProgress(e) { if(isFinite(audio.duration)) audio.currentTime = (e.offsetX / progressBar.clientWidth) * audio.duration; }
    function toggleMute() {
        audio.muted = !audio.muted;
        volumeSlider.value = audio.muted ? 0 : audio.volume;
        updateVolumeIcon();
    }
    function setVolume() {
        audio.volume = volumeSlider.value;
        audio.muted = volumeSlider.value == 0;
        updateVolumeIcon();
    }
    function updateVolumeIcon() {
        volumeIcon.classList.toggle('hidden', audio.muted || audio.volume === 0);
        volumeMuteIcon.classList.toggle('hidden', !audio.muted && audio.volume > 0);
    }
    
    function handleGlobalKeyDown(e) {
        // Allow keyboard shortcuts only if not typing in an input field (if any existed)
        // const activeElement = document.activeElement;
        // if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        //     return;
        // }

        switch (e.key.toLowerCase()) {
            case 'o':
                e.preventDefault();
                musicFileInput.click();
                break;
            case 'h':
                e.preventDefault();
                if (uiContainer.classList.contains('hidden')) {
                    uiContainer.classList.remove('hidden');
                    showUiButton.classList.add('hidden');
                    // Optionally, decide if visualsPanel should also re-open or remember its state
                    if (mainPageLogo) {
                        mainPageLogo.classList.remove('hidden-by-ui');
                        mainPageLogo.style.pointerEvents = 'auto';
                    }
                } else {
                    visualsPanel.classList.add('hidden');
                    uiContainer.classList.add('hidden');
                    showUiButton.classList.remove('hidden');
                    if (mainPageLogo) mainPageLogo.classList.add('hidden-by-ui');
                }
                break;
            case ' ': // Spacebar
                e.preventDefault();
                if (audio.src) togglePlayPause();
                break;
            case 'arrowleft':
                e.preventDefault();
                if (audio.src) {
                    volumeSlider.value = Math.max(0, audio.volume - 0.05).toString();
                    setVolume();
                }
                break;
            case 'arrowright':
                e.preventDefault();
                if (audio.src) {
                    volumeSlider.value = Math.min(1, audio.volume + 0.05).toString();
                    setVolume();
                }
                break;
            case 'arrowup':
                e.preventDefault();
                if (audio.src && lyrics.length > 0 && currentLyricIndex > 0) {
                    isUserScrolling = false;
                    clearTimeout(scrollTimeout);
                    lyricsList.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
                    audio.currentTime = lyrics[currentLyricIndex - 1].time;
                    updateLyricView(true);
                } else if (audio.src && lyrics.length > 0 && currentLyricIndex === 0) {
                    audio.currentTime = 0; // Or lyrics[0].time if you prefer to stick to the first lyric
                    updateLyricView(true);
                }
                break;
            case 'arrowdown':
                e.preventDefault();
                if (audio.src && lyrics.length > 0 && currentLyricIndex < lyrics.length - 1) {
                    isUserScrolling = false;
                    clearTimeout(scrollTimeout);
                    lyricsList.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
                    audio.currentTime = lyrics[currentLyricIndex + 1].time;
                    updateLyricView(true);
                } else if (audio.src && lyrics.length > 0 && currentLyricIndex === lyrics.length - 1) {
                }
                break;
            case 'f': // Fullscreen toggle
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

    // --- 5. INITIALIZATION ---
    visualizer.init();
    setupEventListeners();
    setupDragAndDropListeners();
    visualizer.onResize(); // Call resize once to set initial state
    animate();

    // Initialize dataset attributes and button states based on initial JS state
    document.body.dataset.layout = document.querySelector('.layout-button.active')?.dataset.layout || 'text-center';
    document.body.dataset.wordAnimation = isWordByWordAnimationEnabled ? 'on' : 'off'; // 'off' by default
    document.body.dataset.linesMode = isLinesModeEnabled ? 'on' : 'off'; // 'on' by default
    
    if (toggleLinesModeButton) toggleLinesModeButton.classList.toggle('active', isLinesModeEnabled); // Active by default
    if (toggleWordAnimationButton) toggleWordAnimationButton.classList.toggle('active', isWordByWordAnimationEnabled); // Inactive by default
    
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
