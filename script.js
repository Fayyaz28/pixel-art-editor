class PixelArtEditor {
    constructor() {
        this.canvas = document.getElementById('pixel-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridOverlay = document.getElementById('grid-overlay');
        this.currentTool = 'pencil';
        this.currentColor = '#ff0000';
        this.gridSize = 16;
        this.pixelSize = 32; // 512 / 16
        this.isDrawing = false;
        this.savedArtworks = JSON.parse(localStorage.getItem('pixelArtworks')) || {};
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.createColorPalette();
        this.renderSavedArtworks();
        this.createGrid();
    }

    setupCanvas() {
        this.canvas.width = 512;
        this.canvas.height = 512;
        // Fill with white background
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setupEventListeners() {
        // Mouse events for drawing
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDrawing = true;
            this.handleDraw(e);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDrawing) {
                this.handleDraw(e);
            }
        });

        document.addEventListener('mouseup', () => {
            this.isDrawing = false;
        });

        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentTool = e.target.dataset.tool;
            });
        });

        // Color picker
        document.getElementById('custom-color').addEventListener('change', (e) => {
            this.currentColor = e.target.value;
        });

        document.getElementById('add-color').addEventListener('click', () => {
            this.addColorToPalette(this.currentColor);
        });

        // Grid controls
        document.getElementById('grid-size').addEventListener('change', (e) => {
            this.gridSize = parseInt(e.target.value);
            this.pixelSize = 512 / this.gridSize;
            this.createGrid();
        });

        document.getElementById('new-grid').addEventListener('click', () => {
            if (confirm('Start new artwork? Current work will be lost.')) {
                this.setupCanvas();
                this.createGrid();
            }
        });

        document.getElementById('clear-btn').addEventListener('click', () => {
            if (confirm('Clear the entire canvas?')) {
                this.setupCanvas();
                this.createGrid();
            }
        });

        // Save/Load
        document.getElementById('save-btn').addEventListener('click', () => this.saveArtwork());
        document.getElementById('export-btn').addEventListener('click', () => this.exportPNG());
    }

    createColorPalette() {
        const palette = document.getElementById('color-palette');
        const defaultColors = [
            '#ff0000', '#00ff00', '#0000ff', '#ffff00',
            '#ff00ff', '#00ffff', '#000000', '#ffffff',
            '#ff9500', '#4cd964', '#5ac8fa', '#007aff',
            '#5856d6', '#ff2d55', '#8e8e93', '#d1d1d6'
        ];

        defaultColors.forEach(color => {
            this.addColorToPalette(color);
        });

        // Set first color as active
        document.querySelector('.color-swatch').classList.add('active');
    }

    addColorToPalette(color) {
        const palette = document.getElementById('color-palette');
        
        // Check if color already exists
        const existingColors = Array.from(palette.children).map(swatch => 
            swatch.style.backgroundColor.toLowerCase()
        );
        
        if (!existingColors.includes(color.toLowerCase())) {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.title = color;
            
            swatch.addEventListener('click', () => {
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                this.currentColor = color;
                document.getElementById('custom-color').value = color;
            });

            palette.appendChild(swatch);
        }
    }

    createGrid() {
        // Clear overlay
        this.gridOverlay.innerHTML = '';
        this.gridOverlay.style.width = '512px';
        this.gridOverlay.style.height = '512px';
        
        // Create grid lines
        for (let i = 0; i <= this.gridSize; i++) {
            const lineX = document.createElement('div');
            lineX.style.position = 'absolute';
            lineX.style.left = (i * this.pixelSize) + 'px';
            lineX.style.top = '0';
            lineX.style.width = '1px';
            lineX.style.height = '100%';
            lineX.style.backgroundColor = 'rgba(233, 69, 96, 0.3)';
            this.gridOverlay.appendChild(lineX);

            const lineY = document.createElement('div');
            lineY.style.position = 'absolute';
            lineY.style.top = (i * this.pixelSize) + 'px';
            lineY.style.left = '0';
            lineY.style.height = '1px';
            lineY.style.width = '100%';
            lineY.style.backgroundColor = 'rgba(233, 69, 96, 0.3)';
            this.gridOverlay.appendChild(lineY);
        }
    }

    handleDraw(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const pixelX = Math.floor(x / this.pixelSize);
        const pixelY = Math.floor(y / this.pixelSize);

        if (pixelX >= 0 && pixelX < this.gridSize && pixelY >= 0 && pixelY < this.gridSize) {
            switch (this.currentTool) {
                case 'pencil':
                    this.drawPixel(pixelX, pixelY, this.currentColor);
                    break;
                case 'eraser':
                    this.drawPixel(pixelX, pixelY, '#ffffff');
                    break;
                case 'fill':
                    if (!this.hasFilled) {
                        this.floodFill(pixelX, pixelY, this.currentColor);
                        this.hasFilled = true;
                    }
                    break;
            }
        }
    }

    drawPixel(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            x * this.pixelSize,
            y * this.pixelSize,
            this.pixelSize,
            this.pixelSize
        );
    }

    floodFill(startX, startY, newColor) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const targetColor = this.getPixelColor(startX, startY);
        
        if (targetColor === newColor) return;

        const stack = [[startX, startY]];
        const visited = new Set();
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const key = `${x},${y}`;
            
            if (visited.has(key)) continue;
            if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) continue;
            if (this.getPixelColor(x, y) !== targetColor) continue;
            
            this.drawPixel(x, y, newColor);
            visited.add(key);
            
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
        
        this.hasFilled = false;
    }

    getPixelColor(x, y) {
        const pixelData = this.ctx.getImageData(
            x * this.pixelSize + this.pixelSize/2,
            y * this.pixelSize + this.pixelSize/2,
            1, 1
        ).data;
        
        return `rgb(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`;
    }

    saveArtwork() {
        const nameInput = document.getElementById('art-name');
        const name = nameInput.value.trim() || `Artwork_${new Date().getTime()}`;
        
        if (this.savedArtworks[name]) {
            if (!confirm(`"${name}" already exists. Overwrite?`)) {
                return;
            }
        }
        
        const imageData = this.canvas.toDataURL('image/png');
        
        this.savedArtworks[name] = {
            imageData: imageData,
            gridSize: this.gridSize,
            savedAt: new Date().toLocaleString()
        };
        
        localStorage.setItem('pixelArtworks', JSON.stringify(this.savedArtworks));
        this.renderSavedArtworks();
        
        // Show success feedback
        const originalText = nameInput.placeholder;
        nameInput.placeholder = 'Saved!';
        setTimeout(() => {
            nameInput.placeholder = originalText;
            nameInput.value = '';
        }, 2000);
    }

    exportPNG() {
        const link = document.createElement('a');
        const name = document.getElementById('art-name').value.trim() || `pixel-art-${Date.now()}`;
        link.download = `${name}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }

    renderSavedArtworks() {
        const container = document.getElementById('artworks-list');
        const artworks = Object.entries(this.savedArtworks);
        
        if (artworks.length === 0) {
            container.innerHTML = '<div class="empty-gallery">No artworks saved yet. Create something amazing!</div>';
            return;
        }

        container.innerHTML = artworks.map(([name, artwork]) => {
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, 100, 100);
            };
            img.src = artwork.imageData;
            
            return `
                <div class="artwork-thumb" onclick="pixelEditor.loadArtwork('${name}')">
                    <canvas></canvas>
                    <div class="artwork-name">${name}</div>
                    <div class="artwork-date">${artwork.savedAt}</div>
                </div>
            `;
        }).join('');

        // Update canvas elements after they're in DOM
        setTimeout(() => {
            artworks.forEach(([name, artwork], index) => {
                const thumbCanvas = container.children[index].querySelector('canvas');
                const ctx = thumbCanvas.getContext('2d');
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, 100, 100);
                };
                img.src = artwork.imageData;
            });
        }, 100);
    }

    loadArtwork(name) {
        if (this.savedArtworks[name]) {
            if (confirm(`Load "${name}"? Current work will be lost.`)) {
                const artwork = this.savedArtworks[name];
                const img = new Image();
                
                img.onload = () => {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.ctx.drawImage(img, 0, 0);
                    this.gridSize = artwork.gridSize;
                    this.pixelSize = 512 / this.gridSize;
                    document.getElementById('grid-size').value = this.gridSize;
                    this.createGrid();
                    document.getElementById('art-name').value = name;
                };
                
                img.src = artwork.imageData;
            }
        }
    }
}

const pixelEditor = new PixelArtEditor();