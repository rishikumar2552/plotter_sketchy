// Debug...
var debug = true;

// Defaults settings
var file, fgcode, heightMap, rasterToGcode;

var settings = {
    ppi: { x: 254, y: 254 }, // Pixel Per Inch (25.4 ppi == 1 ppm)

    toolDiameter: 0.1,      // Tool diameter in millimeters
    rapidRate   : 1500,     // Rapid rate in mm/min (G0 F value)
    feedRate    : 500,      // Feed rate in mm/min (G1 F value)
    rateUnit    : 'mm/min', // Rapid/Feed rate unit [mm/min, mm/sec]

    beamRange: { min: 0, max: 1 },   // Beam power range (Firmware value)
    beamPower: { min: 0, max: 100 }, // Beam power (S value) as percentage of beamRange

    milling  : false, // EXPERIMENTAL
    zSafe    : 5,     // Safe Z for fast move
    zSurface : 0,     // Usinable surface (white pixels)
    zDepth   : -10,   // Z depth (black pixels)
    passDepth: 1,     // Pass depth in millimeters

    offsets  : { X: 0, Y: 0 }, // Global coordinates offsets
    trimLine : true,           // Trim trailing white pixels
    joinPixel: true,           // Join consecutive pixels with same intensity
    burnWhite: true,           // [true = G1 S0 | false = G0] on inner white pixels
    verboseG : false,          // Output verbose GCode (print each commands)
    diagonal : false,          // Go diagonally (increase the distance between points)
    overscan : 0,              // Add some extra white space (in millimeters) before and after each line

    precision: { X: 2, Y: 2, S: 4 }, // Number of decimals for each commands

    nonBlocking: true, // Use setTimeout to avoid blocking the UI

    filters: {
        smoothing   : 0,      // Smoothing the input image ?
        brightness  : 0,      // Image brightness [-255 to +255]
        contrast    : 0,      // Image contrast [-255 to +255]
        gamma       : 0,      // Image gamma correction [0.01 to 7.99]
        grayscale   : 'none', // Graysale algorithm [average, luma, luma-601, luma-709, luma-240, desaturation, decomposition-[min|max], [red|green|blue]-chanel]
        shadesOfGray: 256,    // Number of shades of gray [2-256]
        invertColor : false   // Invert color...
    },

    onProgress       : null, // On progress callbacks
    onProgressContext: null, // On progress callback context

    onDone       : null, // On done callback
    onDoneContext: null, // On done callback context

    onAbort       : null, // On abort callback
    onAbortContext: null  // On abort callback context
};

var settingsVersion = '0.1.2';
settings.___toggles = {};

function loadSettings() {
    var store = JSON.parse(localStorage.getItem('lw.raster-to-gcode'));

    if (store) {
        if (! store.settingsVersion || store.settingsVersion !== settingsVersion) {
            settings.settingsVersion = settingsVersion;
            saveSettings();
        }
        else {
            settings = store;
        }
    }

    $settings.find('select, input').each(function() {
        var keys    = this.id.split('-');
        var mainKey = keys.shift();
        var subKey  = keys.shift();

        var value = settings[mainKey];

        if (subKey) {
            if (! value) {
                return;
            }
            value = value[subKey];
        }

        if (this.type === 'checkbox') {
            $(this).prop('checked', value);
        }
        else {
            $(this).val(value);
        }
    });

    $filters.find('select, input').each(function() {
        var value = settings.filters[this.id];

        if (this.type === 'checkbox') {
            $(this).prop('checked', value);
        }
        else {
            $(this).val(value);
        }
    });

    for (var section in settings.___toggles) {
        var $section = $(section);
        var $toggle  = $section.find('h3 i.toggle');
        var $items   = $section.children('label, hr');
        var visible  = settings.___toggles[section];

        $toggle.toggleClass('fa-caret-up', visible).toggleClass('fa-caret-down', !visible);
        $items.toggle(visible);
    }
}

function saveSettings() {
    localStorage.setItem('lw.raster-to-gcode', JSON.stringify(settings));
}

// Load file...
function loadFile() {
    // Save settings
    saveSettings();

    console.log('file:', file);
    $downloadGCode.hide();
    $downloadHeightMap.hide();

    // Create RasterToGcode object
    rasterToGcode = new RasterToGcode.RasterToGcode(settings);

    // Register events callbacks
    rasterToGcode.on('progress', function(event) {
        console.log('onProgress:', event.percent);
        $progressBar.css('width', event.percent + '%').html(event.percent + '%');
    })
    .on('done', function(event) {
        $toHeightMap.text('To HeightMap').removeClass('btn-danger');
        $toGCode.text('To G-Code').removeClass('btn-danger');
        $progressBar.css('width', '0%').html('0%');
        $progressBar.parent().hide();

        if (event.heightMap) {
            console.log('onDone: heightMap:', event.heightMap.length);
            heightMap = event.heightMap;
            $downloadHeightMap.show();
            return;
        }

        console.log('onDone: lines:', event.gcode.length);
        gcode = event.gcode.join('\n');
        $downloadGCode.show();
    })
    .on('abort', function(event) {
        console.log('onAbort:', event);
        $toGCode.text('To G-Code').removeClass('btn-danger');
        $toHeightMap.text('To HeightMap').removeClass('btn-danger');
        $progressBar.html('Aborted at ' + $progressBar.html()).addClass('progress-bar-danger');
    });

    // <file> can be Image, File URL object or URL string (http://* or data:image/*)
    rasterToGcode.load(file).then(function(rtg) {
        console.log('rasterToGcode:', rtg);
        $explorer.removeClass('left');
        $explorer.addClass('right');
        drawCanvasGrid(rtg);
    })
    .catch(function(error) {
        console.error('error:', error);
    });
}

// To gcode
function toGCode() {
    if (rasterToGcode.running) {
        return rasterToGcode.abort();
    }

    console.log('toGCode:', file.name);
    $toGCode.text('Abort').addClass('btn-danger');
    $progressBar.removeClass('progress-bar-danger');
    $progressBar.parent().show();
    rasterToGcode.run();
}

// Download gcode
function downloadGCode() {
    console.log('downloadGCode:', file.name);
    var gCodeFile = new Blob([gcode], { type: 'text/plain;charset=utf-8' });
    saveAs(gCodeFile, file.name + '.gcode');
}

// To height-map
function toHeightMap() {
    if (rasterToGcode.running) {
        return rasterToGcode.abort();
    }

    console.log('toHeightMap:', file.name);
    $toHeightMap.text('Abort').addClass('btn-danger');
    $progressBar.removeClass('progress-bar-danger');
    $progressBar.parent().show();
    rasterToGcode.getHeightMap();
}

// Download height-map
function downloadHeightMap() {
    console.log('downloadHeightMap:', file.name);
    var heightMapFile = new Blob([heightMap], { type: 'text/plain;charset=utf-8' });
    saveAs(heightMapFile, file.name + '.height-map.txt');
}

// UI --------------------------------------------------------------------------

// Map all elements id
$('*[id]').each(function() {
    window['$' + this.id] = $(this);
});

var $noFile   = $('.noFile');
var $hasFile  = $('.hasFile');
var $filters  = $('.filters');
var $settings = $('.settings');
var $toggles  = $('h3 i.toggle');

var $pixelRGBA   = $pixel.find('.rgba');
var $pixelColor  = $pixel.find('.color');
var $pixelCoords = $pixel.find('.coords');

$progressBar = $('.progress-bar');

function drawCanvasGrid(cg) {
    //console.info('onCanvas:', canvas);
    $canvasWrapper.empty().width(cg.size.width);
    $fileName.html(cg.file.name);
    $fileSize.html(cg.size.width + ' x ' + cg.size.height);
    $imageSize.html(cg.outputSize.width + ' x ' + cg.outputSize.height);
    $ppm.html(cg.ppm.x + ' - ' + cg.ppm.y);
    $hasFile.show();
    $noFile.hide();

    var x, y, l;

    // For each grid line
    for (y = 0, yl = cg.canvas.length; y < yl; y++) {
        l = cg.canvas[y];

        // For each line cell
        for (x = 0, xl = l.length; x < xl; x++) {
            $canvasWrapper.append(l[x]);
        }
    }
}

$(document).ready(function() {
    // Load stored settings
    loadSettings();

    // On file input change
    $file.on('change', function(event) {
        file = event.target.files[0];

        loadFile(file);
        $(this).val(null);
    });

    // To gcode !
    $toGCode.on('click', toGCode);
    $toHeightMap.on('click', toHeightMap);
    $downloadGCode.on('click', downloadGCode);
    $downloadHeightMap.on('click', downloadHeightMap);

    // On mouse move
    $(document).on('mousemove', function(event) {
        if (! rasterToGcode) {
            return;
        }

        var x    = event.pageX;
        var y    = event.pageY;
        var xMax = rasterToGcode.size.width;
        var yMax = rasterToGcode.size.height;

        if (x >= xMax || y >= yMax) {
            return;
        }

        var pixel  = rasterToGcode.getPixel(x, y);
        var rgba   = 'rgba(' + pixel.color.r + ',' + pixel.color.g + ',' + pixel.color.b + ',' + (pixel.color.a / 255) + ')';
        var coords = 'x = ' + x + ', y = ' + y

        $pixelColor.css('backgroundColor', rgba);
        $pixelCoords.html(coords);
        $pixelRGBA.html(rgba);
        $pixel.show();

        var px    = x;
        var py    = y;
        var pxMax = xMax - $pixel.width() - 20;
        var pyMax = yMax - $pixel.height() - 20;

        if (px >= pxMax) {
            px -= px - pxMax;
        }

        if (py >= pyMax) {
            py -= py - pyMax;
        }

        $pixel.css({ left: px + 10, top: py + 10 });
    });

    $canvasWrapper.on('mouseleave', function(event) {
        $pixel.hide();
    });

    $settings.find('select, input').on('change', function(event) {
        var keys    = this.id.split('-');
        var mainKey = keys.shift();
        var subKey  = keys.shift();
        var value   = this.value;

        if (this.type === 'checkbox') {
            value = this.checked;
        }
        else if (mainKey !== 'rateUnit') {
            value = parseFloat(value);
        }

        if (! settings[mainKey]) {
            settings[mainKey] = {};
        }

        if (subKey) {
            settings[mainKey][subKey] = value;
        }
        else {
            settings[mainKey] = value;
        }

        loadFile();
    });

    $filters.find('select, input').on('change', function(event) {
        var value = this.value;

        if (this.id !== 'grayscale') {
            value = parseFloat(value);
        }

        if (this.type === 'checkbox') {
            value = this.checked;
        }

        settings.filters[this.id] = value;

        loadFile();
    });

    $toggles.on('click', function() {
        var $toggle  = $(this);
        var $section = $toggle.parent().parent();
        var $items   = $section.children('label, hr');

        $toggle.toggleClass('fa-caret-up').toggleClass('fa-caret-down');
        $items.toggle();

        var classNames = $section.attr('class');
        var selector   = $.trim(classNames).replace(/\s+/gi, '.');
        var visible    = $toggle.hasClass('fa-caret-up');

        settings.___toggles['.' + selector] = visible;

        saveSettings();
    })
});
