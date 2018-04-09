var gcode=null;
var url =null;
var downFile="plotter";
let settings = {
    ppi: { x: 700, y: 700 }, // Pixel Per Inch (25.4 ppi == 1 ppm)

    toolDiameter: 0.1,      // Tool diameter in millimeters
    rapidRate   : 1500,     // Rapid rate in mm/min (G0 F value) nullish value to disable
    feedRate    : 500,      // Feed rate in mm/min (G1 F value)
    rateUnit    : 'mm/min', // Rapid/Feed rate unit [mm/min, mm/sec]

    beamRange: { min: 0, max: 255 },   // Beam power range (Firmware value)
    beamPower: { min: 0, max: 100 }, // Beam power (S value) as percentage of beamRange

    milling  : false, // EXPERIMENTAL
    zSafe    : 5,     // Safe Z for fast move
    zSurface : 0,     // Usinable surface (white pixels)
    zDepth   : -10,   // Z depth (black pixels)
    passDepth: 1,     // Pass depth in millimeters

    offsets  : { X: 0, Y: 0 }, // Global coordinates offsets
    trimLine : false,           // Trim trailing white pixels
    joinPixel: true,           // Join consecutive pixels with same intensity
    burnWhite: true,           // [true = G1 S0 | false = G0] on inner white pixels
    verboseG : false,          // Output verbose GCode (print each commands)
    diagonal : true,          // Go diagonally (increase the distance between points)

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
}
function getGcode(){
// Create RasterToGcode object
let rasterToGcode = new RasterToGcode.RasterToGcode(settings)


// Register events callbacks
rasterToGcode.on('progress', function(event) {
     // event = { gcode, percent }
})
.on('done', function(event) {
    console.log('onDone:', event); 
    gcode = event.gcode.join('\n');// event = { gcode }
    downloadGCode()
});

// <file> can be Image, File URL object or URL string (http://* or data:image/*)
rasterToGcode.load(document.getElementById('pic').src).then(function(rtg) {
    console.log('rasterToGcode:', rtg); // rtg === rasterToGcode
    rasterToGcode.run(); // Return gcode array if nonBlocking = false
})
.catch(function(error) {
    console.error('error:', error);


});

document.getElementById('gcodeButton').disabled = true;
}




function downloadGCode() {
    console.log('downloadGCode:', 'rishi');    
    var gCodeFile = new Blob([gcode], { type: 'text/plain;charset=utf-8' });
    url=URL.createObjectURL(gCodeFile);
    downlink.href=url;
    var name=downFile+Math.floor((Math.random()*1000)+1) +  '.gcode'
    downlink.innerHTML= name;
    downlink.download= name;
    downlink.style.visibility="visible";
}