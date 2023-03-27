// get canvas related references
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var BB = canvas.getBoundingClientRect();
var offsetX = BB.left;
var offsetY = BB.top;
const BACKGROUND_FILL_STILE = "#FAF7F8";
var textArea = document.getElementById("textArea");
var data;
var rowsLabel = document.getElementById("rowsLabel");
var colsLabel = document.getElementById("colsLabel");
var blackLevelInput = document.getElementById("blackLevelInput");
var blackLevelOutput = document.getElementById("blackLevelOutput");
var whiteLevelInput = document.getElementById("whiteLevelInput");
var whiteLevelOutput = document.getElementById("whiteLevelOutput");
var diagonalFlipInput = document.getElementById("diagonalFlipInput");
var poinSizeInput = document.getElementById("poinSizeInput");

var rawData = [];
var isReadyToDraw = true;
var isDataFromSocket = false;
var rawDataColsInput = document.getElementById("rawDataColsInput");
var rawDataRowsInput = document.getElementById("rawDataRowsInput");

var timesLabel = document.getElementById("timesLabel");
var times = [];
var timesPointer = 0;
const TIMES_MAX = 16;

var skippedFrames = 0;
var skippedCounter = 0;
const FPS = 25;
var frateStartTime = 0;
var frameDelay = 1000 / FPS;

var dumpDiv = document.getElementById("dumpDiv");
var fpsInput = document.getElementById("fpsInput");
var centerShiftInput = document.getElementById("centerShiftInput");
var autoZoomWidthInput = document.getElementById("autoZoomWidthInput");
var autoZoomHeightInput = document.getElementById("autoZoomHeightInput");
var canvasDiv = document.getElementById("canvasDiv");

var sectorInput = document.getElementById("sectorInput");

const OPENING_ANGLE_DEGREES = 140;
const OPENING_ANGLE_RADS = OPENING_ANGLE_DEGREES / 180 * Math.PI;
const START_ANGLE_RADS = -Math.PI / 2 - 0.5 * OPENING_ANGLE_RADS;
const STOP_ANGLE_RADS = -Math.PI / 2 + 0.5 * OPENING_ANGLE_RADS;
const OVERLAP_ANGLE_RADS = 0.2 * STEP_ANGLE_RADS;


function initOnLoad() {
    console.log("initOnLoad");  

    canvasResize();
    initDraw();
    initTimes();

    window.addEventListener("resize", canvasScaleAdjust);
}


function initOnDeviceready() {
    console.log("initOnDeviceready");
}


// draw a single rect
function rect(x, y, w, h) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.closePath();
    ctx.fill();
}


// clear the canvas
function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawBorder() {
    ctx.beginPath();
    ctx.moveTo(0, 0); 
    ctx.lineTo(canvas.width, 0);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.lineTo(0, 0); 
    ctx.lineWidth = 1;
    ctx.strokeStyle = "blue";
    ctx.stroke(); 
}


function initDraw() {
    clear();
    drawBorder();
}


function textAreaChange() {
    //alert(textArea.value);
}


function analizeData() {
    var lines = textArea.value.split('\n');
    //alert(lines.length);
    data = [];
    for (var l_n = 0; l_n < lines.length; l_n++) {
        var line = lines[l_n];    
        numbers = line.split('\t');
        const n = numbers.map(st => parseInt(st.trim()));
        data[data.length] = n;
    }
    //alert(data);
    
    var rowsNum = data.length;
    var colsNum = data[0].length;
    
    rowsLabel.innerText = "" + rowsNum;
    colsLabel.innerText = "" + colsNum;
}


function autoDetectLevels() {
    if (!isDataFromSocket) {
        autoDetectLevelsForDump();
    } else {
        autoDetectLevelsForRaw();
    }
}


function autoDetectLevelsForRaw() {
    var minVal = rawData[0];
    var maxVal = rawData[0];
    for (var n = 0; n < rawData.length; n++) {
        var d = rawData[n];
        if (d > maxVal) {
            maxVal = d;
        }
        if (d < minVal) {
            minVal = d;
        }        
    }
    
    blackLevelInput.value = minVal;  
    blackLevelOutput.value = minVal;
    
    whiteLevelInput.value = maxVal;
    whiteLevelOutput.value = maxVal;  
}


function autoDetectLevelsForDump() {
    var minVal = data[0][0];
    var maxVal = data[0][0];
    var rowsNum = data.length;
    var colsNum = data[0].length;
    for (var ro = 0; ro < rowsNum; ro++) {
        for (var co = 0; co < colsNum; co++) {
        var d = data[ro][co];
        if (d > maxVal) {
            maxVal = d;
        }
        if (d < minVal) {
            minVal = d;
        }
        }
    }
    
    blackLevelInput.value = minVal;  
    blackLevelOutput.value = minVal;
    
    whiteLevelInput.value = maxVal;
    whiteLevelOutput.value = maxVal;  
}


function mapAndStrip(val, fromMin, fromMax, toMin, toMax) {
    var newVal = (val - fromMin) / (fromMax - fromMin) * (toMax - toMin);
    if (newVal < toMin) {
        newVal = toMin;
    }
    if (newVal > toMax) {
        newVal = toMax;
    }
    return newVal;
}


function drawData() {
    frateStartTime = Date.now();

    clear();

    skippedFrames = skippedCounter;
    skippedCounter = 0;
    
    const pointSize = poinSizeInput.value;
    var isDiagonalFlip = diagonalFlipInput.checked;    
    var isCenterShift = centerShiftInput.checked;
    var minLevel = blackLevelInput.value;
    var maxLevel = whiteLevelInput.value;
    var rowsNum = 0;
    var colsNum = 0;

    if (isDataFromSocket) {
        rowsNum = rawDataRowsInput.value;
        colsNum = rawDataColsInput.value;
    } else {
        rowsNum = data.length;
        colsNum = data[0].length;
    }

    var isSector = sectorInput.checked;
  
    if (!isSector) {
    
        for (var ro = 0; ro < rowsNum; ro++) {
            for (var co = 0; co < colsNum; co++) {
                var gr;
                if (isDataFromSocket) {
                    var n = ro * colsNum + co;
                    if (isCenterShift) {
                        var shiftedCo = co;
                        if (co >= colsNum / 2) {
                            shiftedCo -= colsNum / 2;
                        } else {
                            shiftedCo += colsNum / 2;
                        }
                        n = ro * colsNum + shiftedCo;
                    }
                    if (n < rawData.length) {
                        gr = mapAndStrip(rawData[n], minLevel, maxLevel, 0, 255);
                    } else {
                        gr = 0;
                        //break
                        ro = rowsNum;
                        co = colsNum;
                    }
                } else {
                    gr = mapAndStrip(data[ro][co], minLevel, maxLevel, 0, 255);
                }
                
                ctx.fillStyle = "rgba(" + gr + "," + gr + "," + gr + ")";
                if (!isDiagonalFlip) {
                    rect(co * pointSize, ro * pointSize, pointSize, pointSize);
                } else {
                    rect(ro * pointSize, co * pointSize, pointSize, pointSize);
                }      
            }
        }

    } else { // if (!isSector)
    
        var centerX = canvas.width / 2;    
        var centerY = canvas.height * 1.0;        
        var beltWidth = poinSizeInput.value;

        const STEP_ANGLE_RADS = OPENING_ANGLE_RADS / colsNum;

        ctx.lineWidth = beltWidth * 1.6;
        
        for (var ro = 0; ro < rowsNum; ro++) {
            var anRads = START_ANGLE_RADS;
            for (var co = 0; co < colsNum; co++) {
            //for (var anRads = startAngleRads; anRads < stopAngleRads; anRads += stepAngleRads) {
                //console.log("anRads = " + anRads);
                var r = (ro + 1) * beltWidth;
                ctx.beginPath();

                var gr;
                if (isDataFromSocket) {
                    var n = ro * colsNum + co;
                    /* if (isCenterShift) {
                        var shiftedCo = co;
                        if (co >= colsNum / 2) {
                            shiftedCo -= colsNum / 2;
                        } else {
                            shiftedCo += colsNum / 2;
                        }
                        n = ro * colsNum + shiftedCo;
                    } */
                    if (n < rawData.length) {
                        gr = mapAndStrip(rawData[n], minLevel, maxLevel, 0, 255);
                    } else {
                        gr = 0;
                        //break
                        ro = rowsNum;
                        co = colsNum;
                    }
                } else {
                    gr = mapAndStrip(data[ro][co], minLevel, maxLevel, 0, 255);
                }
                
                ctx.strokeStyle = "rgba(" + gr + "," + gr + "," + gr + "," + 1.0 + ")";
                ctx.ellipse(centerX, centerY, r, r, 0, anRads - OVERLAP_ANGLE_RADS, anRads + STEP_ANGLE_RADS + OVERLAP_ANGLE_RADS);
                ctx.stroke();
                
                anRads += STEP_ANGLE_RADS;
            }
        }
    }

    drawBorder();

    var nextTime = frateStartTime + frameDelay;
    var nowTime = Date.now();
    if (nowTime >= nextTime) {
        isReadyToDraw = true;
    } else {
        var restTime = nextTime - nowTime;
        setTimeout(() => {
            isReadyToDraw = true;
        }, restTime);  
    }
}


//------------------------------------

var clientId = "visualizerId";
var userName = "visualizerUser";

var client;


// Valid properties are: 
// timeout 
// userName 
// password 
// willMessage
// keepAliveInterval 
// cleanSession
// useSSL
// invocationContext
// onSuccess
// onFailure
// hosts
// ports
// reconnect
// mqttVersion
// mqttVersionExplicit
// uris

var connectOptions = {
  timeout: 30,
  reconnect: true,
  cleanSession: true,
  //retained: false,
  mqttVersion: 3,
  keepAliveInterval: 10,
  onSuccess: onConnect,
  onFailure: onFailure
}


//connect();

function connect() {
  try {
    client = new Paho.Client('192.168.0.18', 5883, '', clientId);
    connectOptions.userName = userName;
    client.connect(connectOptions);
    isDataFromSocket = true;
  } catch (ex) {
    console.log(ex);
  }
}

function onConnect() {
  console.log('on connect');
  initTimes();
  client.onMessageArrived = function(message) {
    //console.log("onMessageArrived: length = " + message.payloadBytes.length);
    //console.log("onMessageArrived: " + message.payloadBytes);
    timeMeasuring();
    //processRawData(message.payloadBytes);
    setTimeout(() => {processRawData(message.payloadBytes);}, 1);    
  }
  // QOS 0 –  Send Once, not acknowledged
  client.subscribe("sensor/radar/rangedoppler", { qos: 0 });
}

function onFailure(err) {
  console.log('on failure', JSON.stringify(err));
}


function send() {
   var message = new Paho.Message(document.forms.sender.message.value);
   message.destinationName = "test";
   message.qos = 2;
   client.send(message);
}


var skipBytes = 36;

function processRawData(d) {
    if (!isReadyToDraw) {
        skippedCounter++;
        return;
    }
    isReadyToDraw = false;

    // skip bytes (couple of floats)
    // then couples of bytes convert to uint16
    rawData = [];
    p = skipBytes;
    while (p + 2 <= d.length) {
        rawData.push(d[p + 1] * 256 + d[p]);
        p = p + 2;
    }
    //console.log("rawData: length = " + rawData.length);
    //console.log("rawData: " + rawData);
    drawData();
}


function disconnect() {
    client.disconnect();
    isDataFromSocket = false;    
}


//------------------------------------


function initTimes() {
    times = [];
    for (var i = 0; i < TIMES_MAX; i++) {
        times.push(Date.now());
        timesPointer = i;
    }
}


function timeMeasuring() {
    timesPointer++;
    if (timesPointer >= TIMES_MAX) {
        timesPointer = 0;
    }

    times[timesPointer] = Date.now();

    var deltaMin = -1;
    var deltaMax = -1;
    var deltaAve = -1;
    var tp = timesPointer + 1;
    if (tp >= TIMES_MAX) {
        tp = 0;
    }
    var np = tp + 1;
    if (np >= TIMES_MAX) {
        np = 0;
    }
    var deltaSum = 0;

    while (tp != timesPointer) {
        var delta = times[np] - times[tp];
        if (deltaMin < 0) {
            deltaMin = delta;
        }
        if (deltaMax < 0) {
            deltaMax = delta;
        }
        if (delta > deltaMax) {
            deltaMax = delta;
        }
        if (delta < deltaMin) {
            deltaMin = delta;
        }
        deltaSum += delta;

        tp = np;
        np++;
        if (np >= TIMES_MAX) {
            np = 0;
        }
    }

    var deltaAve = deltaSum / (TIMES_MAX - 1);
    deltaAve = Math.floor(deltaAve * 100) / 100;
    var deltaAveStr = "" + deltaAve;
    if (deltaAveStr.indexOf('.') == -1) {
        deltaAveStr += ".00";
    }
    if (deltaAveStr.indexOf('.') == deltaAveStr.length - 2) {
        deltaAveStr += "0";
    }
    if (deltaAveStr.length == 5) {
        deltaAveStr = "_" + deltaAveStr;
    }
    if (deltaAveStr.length == 4) {
        deltaAveStr = "__" + deltaAveStr;
    }

    timesLabel.innerText = "min: " + deltaMin + " ms / max: " + deltaMax + " ms / ave: " + deltaAveStr + " ms \n skipped: " + skippedFrames;
}


function flipAccordion() {    
    if (dumpDiv.style.display === "block") {
        dumpDiv.style.display = "none";
    } else {
        dumpDiv.style.display = "block";
    }
}


function applayFps() {
    frameDelay = 1000 / fpsInput.value;
}


function canvasResize() {
    var w = rawDataColsInput.value;
    var h = rawDataRowsInput.value;
    var ps = poinSizeInput.value;
    var isDiagonalFlip = diagonalFlipInput.checked;
    var isSector = sectorInput.checked;

    if (!isSector) {
        if (!isDiagonalFlip) {
            canvas.width = w * ps;
            canvas.height = h * ps;
        } else {
            canvas.width = h * ps;
            canvas.height = w * ps;
        }
    } else {

    }

    canvasScaleAdjust();
    
    initDraw();
}


function canvasScaleAdjust() {
    var isAutoZoomWidthInput = autoZoomWidthInput.checked;
    var isautoZoomHeightInput = autoZoomHeightInput.checked;
    if (isAutoZoomWidthInput || isautoZoomHeightInput) {
        var ww = document.body.clientWidth;
        var wh = document.body.clientHeight;
        var cw = canvas.width;
        var ch = canvas.height;
        var canvasRect = canvas.getBoundingClientRect();
        var horOffset = canvasRect.left;
        var verOffset = horOffset;
        var scHor = 1;
        if (isAutoZoomWidthInput) {
            scHor = (ww - 2 * horOffset) / cw;
        }
        var scVer = 1;
        if (isautoZoomHeightInput) {
            scVer = (wh - 2 * verOffset) / ch;
        }
        canvasDiv.style.width = "" + ww + "px";
        canvasDiv.style.height = "" + wh + "px";
        canvas.style.transform = "scale(" + scHor + "," + scVer + ")"; 
    } else {
        canvas.style.transform = "scale(1,1)";
    } 
}
