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
    const songTitleEl = document.getElementById('song-title');
    const songArtistEl = document.getElementById('song-artist');
    const playerAlbumArt = document.getElementById('player-album-art');
    const playerAlbumArtContainer = document.getElementById('player-album-art-container');
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
    const searchClearButton = document.getElementById('search-clear-button'); // New
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
    const BACKEND_API_URL = '/api'; // Adjusted for Vercel deployment

    // --- New Search State Variables ---
    let currentSearchQuery = '';
    let currentSearchPage = 1;
    const SEARCH_RESULTS_PER_PAGE = 10; // Fetch 10 items per "page"
    let isLoadingMoreSearchResults = false;
    let canLoadMoreSearchResults = true;
    // --- Search History State ---
    const SEARCH_HISTORY_KEY = 'syncadelicaSearchHistory';
    const MAX_SEARCH_HISTORY_ITEMS = 7;


    // --- 3. HELPER FUNCTIONS ---

    /**
     * Cleans a string intended for display (e.g., song title or artist)
     * by removing common extraneous information like (Official Video), [Lyrics], etc.
     * @param {string} str - The string to clean.
     * @returns {string} The cleaned string.
     */
    function cleanDisplayString(str) {
        if (typeof str !== 'string' || !str.trim()) return str || ''; // Return original if not string, or empty string if null/undefined
        let name = str;

        // Remove common bracketed/parenthesized suffixes and terms
        const bracketPatterns = [
            /\s*\[[^\]]*?(official|music|video|audio|lyric|visualizer|hq|hd|4k|explicit|clean|remaster|live|cover|remix|edit|version|instrumental|karaoke|topic|ft|feat|featuring)[^\]]*?\]\s*/gi,
            /\s*\([^)]*?(official|music|video|audio|lyric|visualizer|hq|hd|4k|explicit|clean|remaster|live|cover|remix|edit|version|instrumental|karaoke|topic|ft|feat|featuring)[^)]*?\)\s*/gi,
        ];
        bracketPatterns.forEach(pattern => {
            name = name.replace(pattern, " "); // Replace with a space to avoid merging words
        });

        // Remove standalone keywords common in YouTube titles, often outside brackets
        const keywordPatterns = [
            /\b(official music video|music video|official video|official audio|audio|lyric video|lyrics video|lyrics|lyric|visualizer|hd|4k|hq|explicit|clean|radio edit|remastered|remaster|album version|single version)\b/gi,
            /\s*-\s*Topic\b/gi // Specifically for artist strings like "Artist Name - Topic"
        ];
        keywordPatterns.forEach(pattern => {
            name = name.replace(pattern, " "); // Replace with a space
        });

        // Final cleanup of multiple spaces that might have been introduced
        name = name.replace(/\s+/g, ' ').trim();
        return name;
    }

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

    function checkAndApplyMarquee(textElement) {
        if (!textElement) return;

        const currentText = textElement.textContent || ""; // Get current full title

        // 1. Reset: Clear previous content, remove class and custom property
        textElement.innerHTML = ''; 
        textElement.textContent = currentText; // Set as plain text to measure accurately

        textElement.classList.remove('marquee-active-wrapper');
        textElement.style.removeProperty('--marquee-scroll-distance');
        textElement.style.removeProperty('animationDuration'); // Clear direct style if any

        // 2. Check for overflow
        // scrollWidth is the width of the content, clientWidth is the visible area width
        if (textElement.scrollWidth > textElement.clientWidth) {
            textElement.classList.add('marquee-active-wrapper');

            // Sanitize text before inserting into innerHTML to prevent XSS
            const escapedText = currentText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            textElement.innerHTML = `<span class="marquee-text-wrapper">${escapedText}</span>`;
            
            const marqueeSpan = textElement.querySelector('span.marquee-text-wrapper');
            if (!marqueeSpan) return; // Should not happen
            
            // Calculate how much the inner span needs to move
            const scrollDistance = marqueeSpan.scrollWidth - textElement.clientWidth;

            if (scrollDistance > 0) {
                textElement.style.setProperty('--marquee-scroll-distance', `${scrollDistance}px`);

                const speed = 30; // pixels per second for marquee scroll
                const duration = Math.max(3, scrollDistance / speed); // Minimum 3 seconds duration
                marqueeSpan.style.animationDuration = `${duration}s`;
            } else {
                // Fallback: if not overflowing after adding span (e.g. due to minor calc diffs), revert
                textElement.textContent = currentText; // Revert to plain text
                textElement.classList.remove('marquee-active-wrapper');
            }
        }
        // If not overflowing, textElement.textContent is already currentText, and no class/style is applied.
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
        if (songTitleEl) songTitleEl.textContent = 'No song loaded';
        if (songArtistEl) songArtistEl.textContent = '';
        if (songTitleEl) checkAndApplyMarquee(songTitleEl); // Clear marquee

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
            if (songTitleEl) songTitleEl.textContent = 'No song loaded';
            if (songArtistEl) songArtistEl.textContent = '';
            if (songTitleEl) checkAndApplyMarquee(songTitleEl); // Clear marquee
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
                if (lineDuration <= 0) lineDuration = 0.05; // Ensure a small positive duration

                const numWords = activeElement.wordSpans.length;
                let timePerWord;

                if (numWords > 0) {
                    const TYPICAL_TIME_PER_WORD = 0.3; // Target time for each word to be "active" before next reveals (seconds)
                                                       // This matches the CSS animation duration for a sequential reveal.
                    const calculatedTimePerWordForLine = lineDuration / numWords;

                    // If the typical pace would make the words exceed the line's actual duration,
                    // we must speed up to fit the line's timing.
                    if (numWords * TYPICAL_TIME_PER_WORD > lineDuration) {
                        timePerWord = calculatedTimePerWordForLine;
                    } else {
                        // Otherwise, use the typical pace. Words might finish revealing "early"
                        // within the line's total duration, which can feel more natural.
                        timePerWord = TYPICAL_TIME_PER_WORD;
                    }
                    // Ensure a minimum effective time per word to prevent extremely fast flashing
                    // especially if calculatedTimePerWordForLine is very small.
                    timePerWord = Math.max(0.05, timePerWord); // Minimum 50ms per word step
                } else {
                    timePerWord = lineDuration; // Should not happen if numWords > 0 check is there
                }

                let currentWordToRevealIndex = -1; // Default: no words revealed yet
                if (timeIntoLine >= 0 && numWords > 0 && timePerWord > 0) { // Check timePerWord > 0
                    currentWordToRevealIndex = Math.floor(timeIntoLine / timePerWord);
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

    // --- Search History Functions ---
    function getSearchHistory() {
        const history = localStorage.getItem(SEARCH_HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    }

    function addSearchToHistory(query) {
        if (!query || query.trim() === '') return;
        let history = getSearchHistory();
        const lowerCaseQuery = query.toLowerCase();
        // Remove existing entry if present to move it to the top
        history = history.filter(item => item.toLowerCase() !== lowerCaseQuery);
        // Add new query to the beginning
        history.unshift(query);
        // Limit history size
        if (history.length > MAX_SEARCH_HISTORY_ITEMS) {
            history = history.slice(0, MAX_SEARCH_HISTORY_ITEMS);
        }
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    }

    function removeSearchFromHistory(queryToRemove) {
        let history = getSearchHistory();
        const lowerCaseQueryToRemove = queryToRemove.toLowerCase();
        history = history.filter(item => item.toLowerCase() !== lowerCaseQueryToRemove);
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
        // Re-render history if it's currently visible and input is empty
        if (searchInput.value.trim() === '' && searchResultsContainer.querySelector('.search-history-list')) {
            renderSearchHistory();
        }
    }
    function renderSearchHistory() {
        const history = getSearchHistory();
        searchResultsContainer.innerHTML = ''; // Clear previous content

        if (history.length === 0) {
            searchResultsContainer.innerHTML = '<p class="search-placeholder">No search history yet. Start searching!</p>';
            return;
        }

        const historyHeader = document.createElement('h3');
        historyHeader.className = 'search-history-header';
        historyHeader.textContent = 'Recent Searches';
        searchResultsContainer.appendChild(historyHeader);

        const ul = document.createElement('ul');
        ul.className = 'search-history-list';

        history.forEach(query => {
            const li = document.createElement('li');
            li.className = 'search-history-item';

            const textSpan = document.createElement('span');
            textSpan.className = 'search-history-item-text';
            textSpan.textContent = query;
            textSpan.title = `Search for: ${query}`;
            textSpan.addEventListener('click', () => {
                searchInput.value = query;
                performSearch(query);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-history-item-btn';
            deleteBtn.innerHTML = '&times;'; // HTML entity for 'x'
            deleteBtn.title = `Remove "${query}" from history`;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent li click (search) event from firing
                removeSearchFromHistory(query);
            });

            li.appendChild(textSpan);
            li.appendChild(deleteBtn);
            ul.appendChild(li);
        });
        searchResultsContainer.appendChild(ul);
    }

    async function performSearch(queryValue) {
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(queryValue)}&page=1&limit=10`);
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error('Invalid response format');
            }

            return data;
        } catch (error) {
            console.error('Search failed:', error);
            throw new Error('Failed to fetch search results: ' + error.message);
        }
    }

    async function loadMoreSearchResults() {
        if (isLoadingMoreSearchResults || !canLoadMoreSearchResults || !currentSearchQuery) {
            return;
        }
        isLoadingMoreSearchResults = true;
        let loadMoreIndicatorElement;

        if (currentSearchPage > 1) { // Only show "load more" indicator for subsequent pages
            loadMoreIndicatorElement = document.createElement('div');
            loadMoreIndicatorElement.className = 'search-results-loading-more';
            loadMoreIndicatorElement.innerHTML = `<div class="small-loader"></div> Loading more...`;
            searchResultsContainer.appendChild(loadMoreIndicatorElement);
            loadMoreIndicatorElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }

        try {
            const response = await fetch(`${BACKEND_API_URL}/search?q=${encodeURIComponent(currentSearchQuery)}&page=${currentSearchPage}&limit=${SEARCH_RESULTS_PER_PAGE}`);
            
            if (currentSearchPage === 1) { // Clear initial full-page loader only after first fetch attempt
                const initialLoader = searchResultsContainer.querySelector('.search-loading-indicator');
                if (initialLoader) initialLoader.remove();
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to fetch search results. Server returned an error.' }));
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }
            const results = await response.json();

            if (results && results.length > 0) {
                renderSearchResults(results, currentSearchPage === 1);
                if (results.length < SEARCH_RESULTS_PER_PAGE) {
                    canLoadMoreSearchResults = false;
                    if (currentSearchPage > 1) {
                        const noMoreResultsEl = document.createElement('p');
                        noMoreResultsEl.className = 'search-placeholder';
                        noMoreResultsEl.textContent = 'No more results.';
                        noMoreResultsEl.style.paddingTop = '10px';
                        searchResultsContainer.appendChild(noMoreResultsEl);
                    }
                }
                currentSearchPage++;
            } else {
                canLoadMoreSearchResults = false;
                if (currentSearchPage === 1) {
                    searchResultsContainer.innerHTML = `<p class="search-placeholder">No results found for "${currentSearchQuery}".</p>`;
                } else {
                    const noMoreResultsEl = document.createElement('p');
                    noMoreResultsEl.className = 'search-placeholder';
                    noMoreResultsEl.textContent = 'No more results.';
                    noMoreResultsEl.style.paddingTop = '10px';
                    searchResultsContainer.appendChild(noMoreResultsEl);
                }
            }
        } catch (error) {
            console.error('Search failed:', error);
            canLoadMoreSearchResults = false;
            if (currentSearchPage === 1) {
                searchResultsContainer.innerHTML = `<p class="search-placeholder">Search failed: ${error.message}. Please try again.</p>`;
            } else {
                const errorMsgEl = document.createElement('p');
                errorMsgEl.className = 'search-placeholder';
                errorMsgEl.textContent = `Error loading more: ${error.message}`;
                errorMsgEl.style.color = 'var(--error-color, red)'; // Use CSS var if defined, else red
                searchResultsContainer.appendChild(errorMsgEl);
            }
        } finally {
            if (loadMoreIndicatorElement) {
                loadMoreIndicatorElement.remove();
            }
            isLoadingMoreSearchResults = false;
        }
    }

    function renderSearchResults(results, isInitialLoad) {
        let ul;
        if (isInitialLoad) {
            searchResultsContainer.innerHTML = ''; // Clear for the very first batch of a new search
            if (results.length === 0) { // Should be handled by loadMoreSearchResults, but defensive
                searchResultsContainer.innerHTML = `<p class="search-placeholder">No results found for "${currentSearchQuery}".</p>`;
                return;
            }
            ul = document.createElement('ul');
            ul.className = 'search-results-list';
            searchResultsContainer.appendChild(ul);
        } else {
            ul = searchResultsContainer.querySelector('.search-results-list');
            if (!ul) { // Fallback, should ideally exist
                ul = document.createElement('ul');
                ul.className = 'search-results-list';
                searchResultsContainer.appendChild(ul);
            }
        }

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
            const playButton = li.querySelector('.search-result-play-button');
            if (playButton) {
                playButton.addEventListener('click', async () => {
                    console.log('Play track from search:', result);
                    searchWindow.classList.add('hidden'); 
                    if (result.youtubeUrl) {
                        resetLyrics(); 
                        setPlaceholderMessage(`Loading "${result.title}"...`, 'searching');
                        try {
                            audio.src = `${BACKEND_API_URL}/stream?url=${encodeURIComponent(result.youtubeUrl)}`;
                            audio.load();
                            audio.currentTime = 0; 
                            await audio.play().catch(e => console.error("Error playing audio:", e));
                            setupAudioContext();
                            songTitleEl.textContent = cleanDisplayString(result.title || 'Unknown Title');
                            songArtistEl.textContent = cleanDisplayString(result.artist || 'Unknown Artist');
                            checkAndApplyMarquee(songTitleEl);
                            displayAlbumArt(null, result.title, result.artist, result.albumArtUrl);
                            if (result.title && result.artist) {
                                await searchAndApplyLyrics(result.artist, result.title);
                            } else {
                                setPlaceholderMessage("Lyrics not available for this track.", 'default');
                            }
                            if ('mediaSession' in navigator) {
                                const artworkToUse = result.albumArtUrl;
                                navigator.mediaSession.metadata = new MediaMetadata({
                                    title: cleanDisplayString(result.title || 'Unknown Title'),
                                    artist: cleanDisplayString(result.artist || 'Unknown Artist'),
                                    album: '', 
                                    artwork: artworkToUse ? [{ src: artworkToUse, sizes: '512x512', type: 'image/jpeg' }] : []
                                });
                            }
                        } catch (error) {
                            console.error("Error processing selected search track:", error);
                            setPlaceholderMessage(`Error loading: ${error.message}`, 'default');
                            resetLyrics(); 
                        }
                    } else {
                        alert("No YouTube URL found for this track.");
                        setPlaceholderMessage("Track information missing.", 'default');
                    }
                });
            }
            ul.appendChild(li);
        });
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
                    checkAndApplyMarquee(songTitleEl);
                    setPlaceholderMessage("Upload a song to begin.", 'default');
                }
            }

            // Album art visibility based on layout
            if (document.body.dataset.layout === 'text-center') {
                albumArtContainer.classList.remove('visible'); // Always hide if centered
                if (songTitleEl) checkAndApplyMarquee(songTitleEl); // Re-check marquee on layout change
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
        let name = filename.replace(/\.[^/.]+$/, ""); // Remove file extension

        // Normalize: underscores to spaces, then multiple spaces to one
        name = name.replace(/_/g, " ").replace(/\s+/g, ' ').trim();

        // Remove common bracketed/parenthesized suffixes and terms first.
        // These patterns try to capture variations of (Official Video), [Lyrics], (feat. XYZ), etc.
        // The non-greedy (.*?) helps avoid over-matching if multiple sets of () or [] exist.
        const bracketPatterns = [
            // Matches content within brackets: e.g., [Official Video], [feat. Artist]
            /\s*\[(.*?(official|music|video|audio|lyric|visualizer|hq|hd|4k|explicit|clean|remaster|live|cover|remix|edit|version|instrumental|karaoke|topic|ft|feat|featuring)[^\]]*)\]\s*/gi,
            // Matches content within parentheses: e.g., (Official Audio), (ft. Artist)
            /\s*\((.*?(official|music|video|audio|lyric|visualizer|hq|hd|4k|explicit|clean|remaster|live|cover|remix|edit|version|instrumental|karaoke|topic|ft|feat|featuring)[^[)]*)\)\s*/gi,
        ];
        bracketPatterns.forEach(pattern => {
            name = name.replace(pattern, " "); // Replace with a space to avoid merging words
        });

        // Remove standalone keywords common in YouTube titles.
        // Using \b for word boundaries to avoid partial matches within actual artist/title names.
        const keywordPatterns = [
            /\b(official music video|music video|official video|official audio|audio|lyric video|lyrics video|lyrics|lyric|visualizer|hd|4k|hq|explicit|clean|radio edit|remastered|remaster|instrumental|karaoke|original mix|extended mix|radio mix|club mix|album version|single version|theme song|soundtrack|ost)\b/gi,
            // Remove "ft. Artist", "feat. Artist" etc., when not in brackets/parentheses.
            // This looks for the pattern followed by a separator (like " - ") or end of string.
            /\b(ft|feat|featuring)\b\.?\s+[\w\s&]+(?=\s*-|\s+\(|\s+\[|$)/gi,
            // Remove YouTube's "- Topic" suffix
            /-\s*Topic\b/gi
        ];
        keywordPatterns.forEach(pattern => {
            name = name.replace(pattern, " "); // Replace with a space
        });

        // Final cleanup of spaces
        name = name.replace(/\s+/g, ' ').trim();

        // Attempt to split by " - " (a common artist-title separator)
        const parts = name.split(/\s+-\s+/);
        if (parts.length >= 2) {
            const title = parts.pop().trim(); // Assume the last part is the title
            const artist = parts.join(" - ").trim(); // Everything before is the artist
            if (artist && title) return { artist, title };
        }

        // If " - " split fails or results in empty parts, return the whole cleaned name as title
        return { artist: '', title: name || 'Unknown Title' };
    }

    async function fetchLyrics(artist, title) {
        // Ensure inputs are strings and trimmed. The API call will handle URL encoding.
        const cleanedArtist = String(artist || '').replace(/\s+/g, ' ').trim();
        const cleanedTitle = String(title || '').replace(/\s+/g, ' ').trim();

        if (!cleanedArtist && !cleanedTitle) { // If both are effectively empty, no point in searching.
            console.warn('[API] FetchLyrics: Both artist and title are effectively empty after cleaning.', { artist, title });
            return null;
        }
        // lrclib.net generally performs best with both artist and title.
        // If one is missing, the chances of a good match are significantly lower.
        if (!cleanedArtist || !cleanedTitle) {
             console.warn(`[API] FetchLyrics: Artist or Title is effectively empty. Artist: "${cleanedArtist}", Title: "${cleanedTitle}"`);
             // Depending on the API's strictness, you might return null here.
             // For lrclib, it's often better to have both.
        }

        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanedArtist)}&track_name=${encodeURIComponent(cleanedTitle)}`;
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
        window.addEventListener('resize', () => {
            visualizer.onResize();
            if (songTitleEl) checkAndApplyMarquee(songTitleEl); // Check marquee on resize
        });
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
                console.log("Desktop search button clicked");
                searchWindow.classList.remove('hidden');
                searchInput.focus();
                if (searchInput.value.trim() === '') { // Show history if input is empty
                    renderSearchHistory();
                }
            });
        }
        // Top mobile toggle visuals button
        if (toggleVisualsButtonTop) {
             toggleVisualsButtonTop.addEventListener('click', () => {
                visualsPanel.classList.toggle('hidden');
                // If opening visuals panel, ensure search window is hidden if it was somehow open
                // (though typically they are mutually exclusive in terms of user focus)
                if (!visualsPanel.classList.contains('hidden') && searchWindow && !searchWindow.classList.contains('hidden')) {
                    // searchWindow.classList.add('hidden'); // Optional: close search if opening visuals
                }
            });
        }


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
            if (songTitleEl) checkAndApplyMarquee(songTitleEl); // Re-check marquee on layout change

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
            // visualsPanel.classList.toggle('hidden'); // This is the settings icon button
            // });
            // The `openSearchWindowButton` (settings icon) should toggle the visuals panel.
            openSearchWindowButton.addEventListener('click', () => visualsPanel.classList.toggle('hidden')); 
        }
        if (openSearchWindowButtonTop && searchWindow) { // Mobile search button
            openSearchWindowButtonTop.addEventListener('click', () => {
                searchWindow.classList.remove('hidden');
                searchInput.focus();
                if (searchInput.value.trim() === '') { // Show history if input is empty
                    renderSearchHistory();
                }
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
            searchInput.addEventListener('keypress', (e) => { 
                if (e.key === 'Enter') performSearch(searchInput.value); 
            });
            // Modified event listener for search input
            searchInput.addEventListener('input', () => {
                const hasText = searchInput.value.length > 0;
                if (searchClearButton) {
                    searchClearButton.classList.toggle('visible', hasText);
                }

                const query = searchInput.value.trim();
                if (query === '') {
                    renderSearchHistory();
                } else {
                    // If user is typing and history was shown, clear it for the default placeholder.
                    if (searchResultsContainer.querySelector('.search-history-list')) {
                        searchResultsContainer.innerHTML = '<p class="search-placeholder">Press Enter or click search to find music.</p>';
                    }
                }
            });
        }

        // Event listener for the search clear button
        if (searchClearButton && searchInput) {
            searchClearButton.addEventListener('click', () => {
                searchInput.value = '';
                searchClearButton.classList.remove('visible'); // Hide the button
                searchInput.focus(); // Focus back on the input
                renderSearchHistory(); // Show history or placeholder
            });
        }

        if (searchResultsContainer) {
            searchResultsContainer.addEventListener('scroll', () => {
                const threshold = 100; // Load 100px before reaching the absolute bottom
                if (searchResultsContainer.scrollTop + searchResultsContainer.clientHeight >= searchResultsContainer.scrollHeight - threshold) {
                    if (canLoadMoreSearchResults && !isLoadingMoreSearchResults && currentSearchQuery) {
                        loadMoreSearchResults();
                    }
                }
            });
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
                        title: cleanDisplayString(finalTitle), artist: cleanDisplayString(finalArtist), album: tag.tags.album || '', artwork: artwork
                    });
                }
                displayAlbumArt(tag.tags.picture, finalTitle, finalArtist);
                songTitleEl.textContent = cleanDisplayString(finalTitle);
                songArtistEl.textContent = cleanDisplayString(finalArtist);
                checkAndApplyMarquee(songTitleEl);
                if (finalTitle !== 'Unknown Title' && finalArtist !== 'Unknown Artist') {
                    await searchAndApplyLyrics(finalArtist, finalTitle);
                } else {
                    // Fallback to filename parsing if tags are incomplete
                    const fromFilename = parseFilename(file.name);
                    const titleFromFilename = cleanDisplayString(fromFilename.title || 'Unknown Title');
                    const artistFromFilename = cleanDisplayString(fromFilename.artist || 'Unknown Artist');
                    songTitleEl.textContent = titleFromFilename; // Already cleaned
                    songArtistEl.textContent = artistFromFilename; // Already cleaned
                    checkAndApplyMarquee(songTitleEl);
                    await searchAndApplyLyrics(fromFilename.artist, fromFilename.title);
                }
            },
            onError: async () => {
                const fromFilename = parseFilename(file.name);
                const finalTitle = cleanDisplayString(fromFilename.title || 'Unknown Title');
                const finalArtist = cleanDisplayString(fromFilename.artist || 'Unknown Artist');

                albumArtContainer.innerHTML = ''; // Clear previous art
                albumArtContainer.classList.remove('visible');
                songTitleEl.textContent = finalTitle;
                songArtistEl.textContent = finalArtist;
                checkAndApplyMarquee(songTitleEl);
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: finalTitle, artist: finalArtist, album: '', artwork: [] // Already cleaned
                    });
                }
                await searchAndApplyLyrics(fromFilename.artist, fromFilename.title); // Lyric search uses original parsed parts
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
            titleDiv.textContent = cleanDisplayString(title); // Clean for display here too
            artInfoDiv.appendChild(titleDiv);

            const artistDiv = document.createElement('div');
            artistDiv.className = 'album-art-artist';
            artistDiv.textContent = cleanDisplayString(artist); // Clean for display here too
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
            if (audio.duration > 0) {
                progressFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
            } else if (audio.currentTime === 0 && audio.duration === 0) {
                // Handle case where both are 0 (e.g. initial state or after reset)
                progressFill.style.width = '0%';
            }
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
            audio.currentTime = newTime;
        } else {
            console.warn('[setProgress] Audio is not seekable or duration is not finite. Duration:', audio.duration, 'Seekable:', audio.seekable);
        }
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
                // Volume control removed
                break;
            case 'ArrowRight':
                // Volume control removed
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
