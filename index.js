// Inicjalizacja ikon
lucide.createIcons();

// Domyślny kod startowy
const INITIAL_CODE = `import React, { useState } from 'react';

// Edytor wykrywa tryb automatycznie!
// 1. React: Zostaw 'function App'
// 2. Czysty HTML: Zacznij od <!DOCTYPE html>


`;

// Referencje do elementów DOM
const toggleEditorButton = document.getElementById('toggleEditorButton');
const editorPanel = document.getElementById('editorPanel');
const previewPanel = document.getElementById('previewPanel');
const resizer = document.getElementById('resizer');
const content = document.getElementById('mainContent');
const previewFrame = document.getElementById('previewFrame');
const rulerIndicator = document.getElementById('rulerIndicator');
const bottomRuler = document.getElementById('bottomRuler');
const rulerMarks = document.getElementById('rulerMarks');
const rulerIndicatorBottom = document.getElementById('rulerIndicatorBottom');
const statusIndicator = document.getElementById('statusIndicator');

// Zmienne edytora
let editorInstance = null;
let debounceTimer;

// --- OBSŁUGA MODALA I TOASTA ---
const confirmModal = document.getElementById('confirmModal');
const confirmResetAction = document.getElementById('confirmResetAction');
const successToast = document.getElementById('successToast');

window.closeModal = function () {
    confirmModal.classList.remove('active');
};

function showModal() {
    confirmModal.classList.add('active');
}

function showToast() {
    successToast.classList.add('show');
    setTimeout(() => {
        successToast.classList.remove('show');
    }, 3000);
}
// Zamykanie modala po kliknięciu w overlay (poza modalem)
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        closeModal();
    }
});
// --- USTAWIENIA RESIZERA I SNAP POINTS ---
const snapPoints = [25, 50, 75];
const snapThreshold = 2;

function updateStatus(text) {
    statusIndicator.textContent = text;
}

function generateRulerMarks() {
    rulerMarks.innerHTML = '';
    for (let i = 0; i <= 100; i += 5) {
        const mark = document.createElement('div');
        mark.className = `ruler-mark ${i % 25 === 0 ? 'major' : ''}`;
        mark.style.left = `${i}%`;

        if (i % 25 === 0) {
            const label = document.createElement('span');
            label.className = 'ruler-label';
            label.textContent = `${i}%`;
            mark.appendChild(label);
        }
        rulerMarks.appendChild(mark);
    }
}
generateRulerMarks();


// --- 5. Przycisk ukrywania edytora (Aktualizacja z Icons8) ---
toggleEditorButton.addEventListener('click', () => {
    const isHidden = editorPanel.classList.toggle('hidden');
    resizer.classList.toggle('hidden');
    previewPanel.classList.toggle('full-width');

    // Pobieramy obrazek wewnątrz przycisku
    const iconImg = toggleEditorButton.querySelector('img');

    if (isHidden) {
        // Obracamy ikonę "w prawo"
        iconImg.style.transform = 'rotate(180deg)';
        toggleEditorButton.title = "Pokaż edytor";
    } else {
        // Obracamy ikonę "w lewo"
        iconImg.style.transform = 'rotate(0deg)';
        toggleEditorButton.title = "Ukryj edytor";
    }

    if (editorInstance) editorInstance.layout();
});

// --- 6. Logika Resizera ---
let isDragging = false;

function findSnapPoint(percent) {
    for (let snapPoint of snapPoints) {
        if (Math.abs(percent - snapPoint) < snapThreshold) {
            return snapPoint;
        }
    }
    return percent;
}

resizer.addEventListener('mousedown', (e) => {
    isDragging = true;
    resizer.classList.add('is-dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    previewFrame.style.pointerEvents = 'none';
    rulerIndicator.classList.add('active');
    bottomRuler.classList.add('active');
    e.preventDefault();
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        resizer.classList.remove('is-dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        previewFrame.style.pointerEvents = 'auto';
        rulerIndicator.classList.remove('active');
        bottomRuler.classList.remove('active');
        if (editorInstance) editorInstance.layout();
        updateStatus('Gotowy');
    }
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const contentRect = content.getBoundingClientRect();
    const newEditorWidth = e.clientX - contentRect.left;
    const containerWidth = contentRect.width;
    let newEditorWidthPercent = (newEditorWidth / containerWidth) * 100;

    const snappedPercent = findSnapPoint(newEditorWidthPercent);
    const isSnapped = snappedPercent !== newEditorWidthPercent;

    if (isSnapped) {
        newEditorWidthPercent = snappedPercent;
    }

    if (newEditorWidthPercent > 15 && newEditorWidthPercent < 85) {
        editorPanel.style.width = `${newEditorWidthPercent}%`;

        const actualWidthPx = (newEditorWidthPercent / 100) * containerWidth;
        rulerIndicator.style.left = `${contentRect.left + actualWidthPx}px`;
        rulerIndicator.setAttribute('data-width',
            `${newEditorWidthPercent.toFixed(1)}% ${isSnapped ? '📍' : ''}`);

        rulerIndicatorBottom.style.left = `${newEditorWidthPercent}%`;
        rulerIndicatorBottom.setAttribute('data-percentage',
            `${newEditorWidthPercent.toFixed(1)}% ${isSnapped ? '📍' : ''}`);

        const snapIndicator = isSnapped ? ' 📍 SNAP' : '';
        updateStatus(`Szerokość: ${newEditorWidthPercent.toFixed(1)}%${snapIndicator}`);
        if (editorInstance) editorInstance.layout();
    }
});

// --- KONFIGURACJA MONACO EDITOR ---
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });

require(["vs/editor/editor.main"], function () {

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        jsx: monaco.languages.typescript.JsxEmit.React,
        allowNonTsExtensions: true,
        target: monaco.languages.typescript.ScriptTarget.ES2015
    });

    const startMonacoTheme = document.documentElement.getAttribute('theme') === 'dark' ? 'vs-dark' : 'vs';

    const monacoSettings = {
        theme: startMonacoTheme,
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Fira Code, Source Code Pro, IBM Plex Mono, Inconsolata, monospace',
        lineHeight: 21,
        minimap: { enabled: true },
        wordWrap: 'on',
        lineNumbers: 'on',
        matchBrackets: 'always',
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        folding: true,
        tabSize: 4,
        automaticLayout: true,
        padding: { top: 16, bottom: 16 },
        roundedSelection: true,
        scrollbar: { useShadows: false, verticalScrollbarSize: 10 }
    };

    // Sprawdź czy jest zapisany kod w localStorage
    const savedCode = localStorage.getItem('editor-content');

    editorInstance = monaco.editor.create(document.getElementById('monacoEditorContainer'), {
        value: savedCode || INITIAL_CODE, // Użyj zapisanego lub domyślnego
        language: 'javascript',
        ...monacoSettings
    });

    const currentTheme = localStorage.getItem('app-theme') || 'dark';
    setTheme(currentTheme);

    window.addEventListener('resize', () => {
        editorInstance.layout();
    });

    editorInstance.onDidChangeModelContent(() => {
        updateStatus('Analiza...');
        statusIndicator.style.color = "var(--highlight-color)";
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleContentChange, 800);
    });

    handleContentChange();
});

// --- OBSŁUGA MOTYWU ---
const themeToggleBtn = document.getElementById('themeToggleBtn');

function setTheme(themeName) {
    document.documentElement.setAttribute('theme', themeName);
    localStorage.setItem('app-theme', themeName);

    const iconName = themeName === 'dark' ? 'sun' : 'moon';
    themeToggleBtn.innerHTML = `<i data-lucide="${iconName}" width="14"></i>`;
    lucide.createIcons();

    if (typeof monaco !== 'undefined' && monaco.editor) {
        const monacoTheme = themeName === 'dark' ? 'vs-dark' : 'vs';
        monaco.editor.setTheme(monacoTheme);
    }
    if (editorInstance) handleContentChange();
}

themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
});

// --- RESET Z WŁASNYM POTWIERDZENIEM ---
const resetBtn = document.getElementById('resetBtn');

resetBtn.addEventListener('click', () => {
    // Zamiast systemowego confirm(), otwieramy nasz modal
    showModal();
});

// Obsługa kliknięcia "Resetuj" w modalu
confirmResetAction.addEventListener('click', () => {
    editorInstance.setValue(INITIAL_CODE);
    closeModal();
});

// --- DETEKCJA I RENDEROWANIE ---
const errorMessage = document.getElementById('errorMessage');
const errorContainer = document.getElementById('errorContainer');
const languageLabel = document.getElementById('languageLabel');
const modeDisplay = document.getElementById('modeDisplay');

function detectLanguage(code) {
    const trimmed = code.trim();
    const hasReactApp = /function\s+App|class\s+App|const\s+App|export\s+default|import\s+React/.test(code);
    const isFullHtml = /^\s*<!DOCTYPE html/i.test(code) || /^\s*<html/i.test(code);
    if (isFullHtml) return { mode: 'html', type: 'full' };
    if (hasReactApp) return { mode: 'javascript', type: 'react' };
    return { mode: 'javascript', type: 'react' };
}

function handleContentChange() {
    if (!editorInstance) return;
    const code = editorInstance.getValue();

    // Zapisz do localStorage przy każdej zmianie
    localStorage.setItem('editor-content', code);

    const detection = detectLanguage(code);

    const model = editorInstance.getModel();
    if (model.getLanguageId() !== detection.mode) {
        monaco.editor.setModelLanguage(model, detection.mode);
    }

    updateStatus('Gotowy');
    statusIndicator.style.color = "var(--text-muted)";

    if (detection.mode === 'javascript') {
        languageLabel.textContent = "JSX / React";
        modeDisplay.innerHTML = '<i data-lucide="layers" width="14"></i><span>React</span>';
    } else {
        languageLabel.textContent = "HTML";
        modeDisplay.innerHTML = '<i data-lucide="file-code" width="14"></i><span>HTML</span>';
    }
    lucide.createIcons();

    updatePreview(code, detection);
}

function createIframeContent(userCode, detection) {
    const currentTheme = document.documentElement.getAttribute('theme') || 'dark';
    const mainStyles = document.getElementById('main-styles') ? document.getElementById('main-styles').innerHTML : '';
    const themeStyles = `
                ${mainStyles}
                body { 
                    font-family: "JetBrains Mono", sans-serif; 
                    background-color: var(--bg); 
                    color: var(--text-color);
                    transition: background-color 0.3s ease, color 0.3s ease;
                    margin: 0; min-height: 100vh;
                }
                #root { min-height: 100vh; display: flex; flex-direction: column; }
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: var(--bg); }
                ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
            `;

    if (detection.type === 'full') return userCode;

    const headContent = `
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.development.min.js"><\/script>
                <script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.development.min.js"><\/script>
                <script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"><\/script>
                <script src="https://cdn.tailwindcss.com"><\/script>
                <style>${themeStyles}</style>
            `;

    const escapedCode = userCode.replace(/<\/script>/g, '<\\/script>');
    return `
            <!DOCTYPE html>
            <html lang="pl" theme="${currentTheme}">
            <head>${headContent}</head>
            <body>
                <div id="root"></div>
                <script type="text/plain" id="user-source">${escapedCode}<\/script>
                <script>
                    window.require = function(m) { if (m === 'react') return window.React; if (m === 'react-dom') return window.ReactDOM; return window[m] || {}; };
                    window.exports = {}; window.module = { exports: window.exports };
                    window.onload = function() {
                        try {
                            const code = Babel.transform(document.getElementById('user-source').textContent, { presets: ['react', 'env'] }).code;
                            (new Function(code))();
                            const root = ReactDOM.createRoot(document.getElementById('root'));
                            const AppToRender = typeof App !== 'undefined' ? App : (window.exports.default || window.module.exports.default);
                            if (AppToRender) {
                                root.render(React.createElement(AppToRender));
                                // Wysyłamy wiadomość o sukcesie
                                window.parent.postMessage({ type: 'SUCCESS' }, '*');
                            } else {
                                root.render(
                                    React.createElement('div', {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            flex: 1,
                                            height: '100%',
                                            color: 'var(--text-muted)',
                                            fontSize: '0.9rem',
                                            flexDirection: 'column',
                                            gap: '10px',
                                            textAlign: 'center'
                                        }
                                    }, 
                                    [
                                        React.createElement('div', {key: 1, style: { fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--text-color)' }}, "Brak komponentu App"),
                                        React.createElement('div', {key: 2}, [
                                            "Zdefiniuj ",
                                            React.createElement('span', {
                                                key: 'highlight', 
                                                style: { 
                                                    backgroundColor: 'var(--card-bg)', 
                                                    color: 'var(--text-color)',
                                                    fontFamily: 'monospace',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    border: '1px solid var(--border-color)',
                                                    fontWeight: 'bold'
                                                }
                                            }, "function App()"),
                                            " aby zobaczyć wynik."
                                        ])
                                    ])
                                );
                            }
                        } catch (err) { window.parent.postMessage({ type: 'ERROR', message: err.toString() }, '*'); }
                    };
                <\/script>
            </body>
            </html>
            `;
}

function updatePreview(code, detection) {
    errorContainer.style.display = 'none';
    previewFrame.srcdoc = createIframeContent(code, detection);
}

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'ERROR') {
        errorMessage.textContent = event.data.message;
        errorContainer.style.display = 'block';
    }
    // Obsługa potwierdzenia wykonania (Toast)
    if (event.data && event.data.type === 'SUCCESS') {
        showToast();
    }
});