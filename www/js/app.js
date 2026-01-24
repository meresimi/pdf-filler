let deviceReadyFired = false;

document.addEventListener('deviceready', function() {
    deviceReadyFired = true;
    onDeviceReady();
}, false);

setTimeout(function() {
    if (!deviceReadyFired) {
        console.log('deviceready timeout - initializing anyway');
        onDeviceReady();
    }
}, 3000);

let app = {
    pdfHandler: null,
    formEditor: null
};

function onDeviceReady() {
    console.log('Device ready - initializing app');

    try {
        app.pdfHandler = new PDFHandler();
        app.formEditor = new FormEditor();
        app.pdfHandler.setFormEditor(app.formEditor);

        setupEventListeners();
        hideLoading();
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Initialization error: ' + error.message);
    }
}

function setupEventListeners() {
    document.getElementById('openFileBtn').addEventListener('click', openFilePicker);
    document.getElementById('welcomeOpenBtn').addEventListener('click', openFilePicker);
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);

    document.getElementById('prevPageBtn').addEventListener('click', () => {
        app.pdfHandler.previousPage();
    });

    document.getElementById('nextPageBtn').addEventListener('click', () => {
        app.pdfHandler.nextPage();
    });

    document.getElementById('zoomInBtn').addEventListener('click', () => {
        app.pdfHandler.zoomIn();
    });

    document.getElementById('zoomOutBtn').addEventListener('click', () => {
        app.pdfHandler.zoomOut();
    });

    document.getElementById('addTextBtn').addEventListener('click', () => {
        app.formEditor.enableTextMode();
    });

    document.getElementById('addCheckBtn').addEventListener('click', () => {
        app.formEditor.addCheckbox();
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        app.formEditor.clearAll();
    });

    document.getElementById('addTextConfirm').addEventListener('click', () => {
        app.formEditor.confirmText();
    });

    document.getElementById('cancelText').addEventListener('click', () => {
        app.formEditor.cancelText();
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
        savePDF();
    });

    document.getElementById('pdfCanvas').addEventListener('click', (e) => {
        if (app.formEditor.isTextMode) {
            const rect = e.target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            app.formEditor.showTextInput(x, y);
        }
    });
    
    console.log('Event listeners setup complete');
}

function openFilePicker() {
    document.getElementById('fileInput').click();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        showLoading();
        app.pdfHandler.loadPDF(file).then(() => {
            hideLoading();
            showPDFViewer();
            showEditorPanel();
        }).catch(error => {
            hideLoading();
            alert('Error loading PDF: ' + error.message);
        });
    } else {
        alert('Please select a valid PDF file');
    }
}

function showPDFViewer() {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('pdfViewer').style.display = 'flex';
}

function showEditorPanel() {
    document.getElementById('editorPanel').style.display = 'flex';
}

async function savePDF() {
    showLoading();

    try {
        // Check if there are any annotations to apply
        const hasAnnotations = Object.keys(app.formEditor.annotationsByPage).length > 0;
        
        if (!hasAnnotations) {
            // No annotations, just save original PDF
            const blob = new Blob([app.pdfHandler.pdfBytes], { type: 'application/pdf' });
            downloadBlob(blob, 'original_' + Date.now() + '.pdf');
            hideLoading();
            alert('PDF saved (no edits made)');
            return;
        }

        // Apply annotations
        const modifiedPdfBytes = await app.formEditor.applyAnnotationsToPDF(app.pdfHandler.pdfBytes);
        const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
        downloadBlob(blob, 'edited_' + Date.now() + '.pdf');
        
        hideLoading();
        alert('PDF saved successfully!');
    } catch (error) {
        hideLoading();
        console.error('Save error:', error);
        alert('Error saving PDF: ' + error.message);
    }
}

function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showLoading() {
    const loader = document.getElementById('loadingIndicator');
    if (loader) loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('loadingIndicator');
    if (loader) loader.style.display = 'none';
}

console.log('app.js loaded');
