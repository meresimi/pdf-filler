// Main application logic
document.addEventListener('deviceready', onDeviceReady, false);

let app = {
    pdfHandler: null,
    formEditor: null
};

function onDeviceReady() {
    console.log('Device is ready!');
    
    // Initialize PDF Handler
    app.pdfHandler = new PDFHandler();
    app.formEditor = new FormEditor();
    
    // Setup event listeners
    setupEventListeners();
    
    // Hide loading indicator
    hideLoading();
}

function setupEventListeners() {
    // Open file buttons
    document.getElementById('openFileBtn').addEventListener('click', openFilePicker);
    document.getElementById('welcomeOpenBtn').addEventListener('click', openFilePicker);
    
    // File input change
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    
    // PDF navigation
    document.getElementById('prevPageBtn').addEventListener('click', () => {
        app.pdfHandler.previousPage();
    });
    
    document.getElementById('nextPageBtn').addEventListener('click', () => {
        app.pdfHandler.nextPage();
    });
    
    // Zoom controls
    document.getElementById('zoomInBtn').addEventListener('click', () => {
        app.pdfHandler.zoomIn();
    });
    
    document.getElementById('zoomOutBtn').addEventListener('click', () => {
        app.pdfHandler.zoomOut();
    });
    
    // Editor tools
    document.getElementById('addTextBtn').addEventListener('click', () => {
        app.formEditor.enableTextMode();
    });
    
    document.getElementById('addCheckBtn').addEventListener('click', () => {
        app.formEditor.addCheckbox();
    });
    
    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('Clear all annotations?')) {
            app.formEditor.clearAll();
        }
    });
    
    // Text input controls
    document.getElementById('addTextConfirm').addEventListener('click', () => {
        app.formEditor.confirmText();
    });
    
    document.getElementById('cancelText').addEventListener('click', () => {
        app.formEditor.cancelText();
    });
    
    // Save button
    document.getElementById('saveBtn').addEventListener('click', () => {
        savePDF();
    });
    
    // Canvas click for adding annotations
    document.getElementById('pdfCanvas').addEventListener('click', (e) => {
        if (app.formEditor.isTextMode) {
            const rect = e.target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            app.formEditor.showTextInput(x, y);
        }
    });
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
    document.getElementById('editorPanel').style.display = 'block';
}

function savePDF() {
    showLoading();
    
    app.formEditor.applyAnnotationsToPDF(app.pdfHandler.pdfBytes).then(modifiedPdfBytes => {
        // Save to device storage
        const fileName = 'edited_' + Date.now() + '.pdf';
        
        window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function(dirEntry) {
            dirEntry.getFile(fileName, { create: true, exclusive: false }, function(fileEntry) {
                fileEntry.createWriter(function(fileWriter) {
                    fileWriter.onwriteend = function() {
                        hideLoading();
                        alert('PDF saved successfully!\n' + fileName);
                        
                        // Open the saved PDF
                        cordova.plugins.fileOpener2.open(
                            fileEntry.nativeURL,
                            'application/pdf',
                            {
                                error: function(e) {
                                    console.log('Error opening file: ' + e);
                                },
                                success: function() {
                                    console.log('File opened successfully');
                                }
                            }
                        );
                    };
                    
                    fileWriter.onerror = function(e) {
                        hideLoading();
                        alert('Failed to save PDF: ' + e.toString());
                    };
                    
                    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
                    fileWriter.write(blob);
                }, function(error) {
                    hideLoading();
                    alert('Failed to create file writer: ' + error);
                });
            }, function(error) {
                hideLoading();
                alert('Failed to create file: ' + error);
            });
        }, function(error) {
            hideLoading();
            alert('Failed to access file system: ' + error);
        });
    }).catch(error => {
        hideLoading();
        alert('Error saving PDF: ' + error.message);
    });
}

function showLoading() {
    document.getElementById('loadingIndicator').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingIndicator').style.display = 'none';
}