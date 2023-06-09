// get canvas related referencescanvas
var canvasRange = document.getElementById("canvasRange");
var ctxRange = canvasRange.getContext("2d");
var canvasHeat = document.getElementById("canvasHeat");
var ctxHeat = canvasHeat.getContext("2d");
//var BB = canvasRange.getBoundingClientRect();
//var offsetX = BB.left;
//var offsetY = BB.top;
const BACKGROUND_FILL_STILE = "#FAF7F8";
var textArea = document.getElementById("textArea");
var data;
var rowsLabel = document.getElementById("rowsLabel");
var colsLabel = document.getElementById("colsLabel");

var blackLevelRangeInput = document.getElementById("blackLevelRangeInput");
var blackLevelRangeOutput = document.getElementById("blackLevelRangeOutput");
var whiteLevelRangeInput = document.getElementById("whiteLevelRangeInput");
var whiteLevelRangeOutput = document.getElementById("whiteLevelRangeOutput");

var blackLevelHeatInput = document.getElementById("blackLevelHeatInput");
var blackLevelHeatOutput = document.getElementById("blackLevelHeatOutput");
var whiteLevelHeatInput = document.getElementById("whiteLevelHeatInput");
var whiteLevelHeatOutput = document.getElementById("whiteLevelHeatOutput");

var diagonalFlipInput = document.getElementById("diagonalFlipInput");
var poinSizeInput = document.getElementById("poinSizeInput");

var rawDataRange = [];
var rawDataHeat = [];
var isReadyToDraw = true;
var isDataFromSocket = false;

var rawDataRangeColsInput = document.getElementById("rawDataRangeColsInput");
var rawDataRangeRowsInput = document.getElementById("rawDataRangeRowsInput");

var rawDataHeatColsInput = document.getElementById("rawDataHeatColsInput");
var rawDataHeatRowsInput = document.getElementById("rawDataHeatRowsInput");

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
//var autoZoomHeightInput = document.getElementById("autoZoomHeightInput");
var canvasRangeDiv = document.getElementById("canvasRangeDiv");
var canvasHeatDiv = document.getElementById("canvasHeatDiv");

const OPENING_ANGLE_DEGREES = 140;
const OPENING_ANGLE_RADS = OPENING_ANGLE_DEGREES / 180 * Math.PI;
const START_ANGLE_RADS = -Math.PI / 2 - 0.5 * OPENING_ANGLE_RADS;
const STOP_ANGLE_RADS = -Math.PI / 2 + 0.5 * OPENING_ANGLE_RADS;

const TOPIC_RANGE = "sensor/radar/rangedoppler";
const TOPIC_HEAT = "sensor/radar/heatmap";

const HEAT_SCIP_ROWS_BEGIN = 10;
const HEAT_SCIP_ROWS_END = 20;


function initOnLoad() {
    console.log("initOnLoad");  

    canvasResize();
    initDraw();
    initTimes();

    window.addEventListener("resize", canvasScaleAdjust);

    connect();
}


function initOnDeviceready() {
    console.log("initOnDeviceready");
}


// draw a single rect
function rect(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.closePath();
    ctx.fill();
}


// clear the canvas
function clearRange() {
    ctxRange.clearRect(0, 0, canvasRange.width, canvasRange.height);
}


function clearHeat() {
    ctxHeat.clearRect(0, 0, canvasHeat.width, canvasHeat.height);
}


function drawBorderRange() {
    ctxRange.beginPath();
    ctxRange.moveTo(0, 0); 
    ctxRange.lineTo(canvasRange.width, 0);
    ctxRange.lineTo(canvasRange.width, canvasRange.height);
    ctxRange.lineTo(0, canvasRange.height);
    ctxRange.lineTo(0, 0); 
    ctxRange.lineWidth = 1;
    ctxRange.strokeStyle = "blue";
    ctxRange.stroke(); 
}


function drawBorderHeat() {
    ctxHeat.beginPath();
    ctxHeat.moveTo(0, 0); 
    ctxHeat.lineTo(canvasHeat.width, 0);
    ctxHeat.lineTo(canvasHeat.width, canvasHeat.height);
    ctxHeat.lineTo(0, canvasHeat.height);
    ctxHeat.lineTo(0, 0); 
    ctxHeat.lineWidth = 1;
    ctxHeat.strokeStyle = "blue";
    ctxHeat.stroke(); 
}


function initDraw() {
    clearRange();
    drawBorderRange();

    clearHeat();
    drawBorderHeat();
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


function autoDetectLevelsRange() {
    if (!isDataFromSocket) {
        autoDetectLevelsForDump();
    } else {
        autoDetectLevelsForRawRange();
    }
}


function autoDetectLevelsForRawRange() {
    var minVal = rawDataRange[0];
    var maxVal = rawDataRange[0];
    for (var n = 0; n < rawDataRange.length; n++) {
        var d = rawDataRange[n];
        if (d > maxVal) {
            maxVal = d;
        }
        if (d < minVal) {
            minVal = d;
        }        
    }
    
    blackLevelRangeInput.value = minVal;  
    blackLevelRangeOutput.value = minVal;
    
    whiteLevelRangeInput.value = maxVal;
    whiteLevelRangeOutput.value = maxVal;  
}


function autoDetectLevelsForRawHeat() {
    var colsNum = rawDataHeatColsInput.value;
    var minVal = rawDataHeat[0 + HEAT_SCIP_ROWS_BEGIN * colsNum];
    var maxVal = rawDataHeat[0 + HEAT_SCIP_ROWS_BEGIN * colsNum];
    for (var n = HEAT_SCIP_ROWS_BEGIN; n < rawDataHeat.length - HEAT_SCIP_ROWS_END * colsNum; n++) {
        var d = rawDataHeat[n];
        if (d > maxVal) {
            maxVal = d;
        }
        if (d < minVal) {
            minVal = d;
        }        
    }
    
    blackLevelHeatInput.value = minVal;  
    blackLevelHeatOutput.value = minVal;
    
    whiteLevelHeatInput.value = maxVal;
    whiteLevelHeatOutput.value = maxVal;  
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
    
    blackLevelRangeInput.value = minVal;  
    blackLevelRangeOutput.value = minVal;
    
    whiteLevelRangeInput.value = maxVal;
    whiteLevelRangeOutput.value = maxVal;  
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


function drawDataRange() {
    frateStartTime = Date.now();

    clearRange();

    skippedFrames = skippedCounter;
    skippedCounter = 0;
    
    const pointSize = poinSizeInput.value;
    var isDiagonalFlip = diagonalFlipInput.checked;    
    var isCenterShift = centerShiftInput.checked;
    var minLevel = blackLevelRangeInput.value;
    var maxLevel = whiteLevelRangeInput.value;
    var rowsNum = 0;
    var colsNum = 0;

    if (isDataFromSocket) {
        rowsNum = rawDataRangeRowsInput.value;
        colsNum = rawDataRangeColsInput.value;
    } else {
        rowsNum = data.length;
        colsNum = data[0].length;
    }
    
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
                if (n < rawDataRange.length) {
                    gr = mapAndStrip(rawDataRange[n], minLevel, maxLevel, 0, 255);
                } else {
                    gr = 0;
                    //break
                    ro = rowsNum;
                    co = colsNum;
                }
            } else {
                gr = mapAndStrip(data[ro][co], minLevel, maxLevel, 0, 255);
            }
            
            ctxRange.fillStyle = "rgba(" + gr + "," + gr + "," + gr + ")";
            if (!isDiagonalFlip) {
                rect(ctxRange, co * pointSize, ro * pointSize, pointSize, pointSize);
            } else {
                rect(ctxRange, ro * pointSize, co * pointSize, pointSize, pointSize);
            }      
        }
    }

    drawBorderRange();

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


function drawDataHeat() {
    frateStartTime = Date.now();

    clearHeat();

    skippedFrames = skippedCounter;
    skippedCounter = 0;
    
    const pointSize = poinSizeInput.value;
    var isDiagonalFlip = diagonalFlipInput.checked;    
    var isCenterShift = centerShiftInput.checked;
    var minLevel = blackLevelHeatInput.value;
    var maxLevel = whiteLevelHeatInput.value;
    var rowsNum = 0;
    var colsNum = 0;

    if (isDataFromSocket) {
        rowsNum = rawDataHeatRowsInput.value;
        colsNum = rawDataHeatColsInput.value;
    } else {
        rowsNum = data.length;
        colsNum = data[0].length;
    }

    var centerX = canvasHeat.width / 2;    
    var centerY = canvasHeat.height * 1.0;        
    var beltWidth = poinSizeInput.value;

    const STEP_ANGLE_RADS = OPENING_ANGLE_RADS / colsNum;
    const OVERLAP_ANGLE_RADS = 0.2 * STEP_ANGLE_RADS;

    ctxHeat.lineWidth = beltWidth * 1.6;
    
    for (var ro = 0; ro < rowsNum; ro++) {
        var anRads = START_ANGLE_RADS;
        for (var co = 0; co < colsNum; co++) {
        //for (var anRads = startAngleRads; anRads < stopAngleRads; anRads += stepAngleRads) {
            //console.log("anRads = " + anRads);
            var r = (ro + 1) * beltWidth;
            ctxHeat.beginPath();

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
                if (n < rawDataHeat.length) {
                    if (ro < HEAT_SCIP_ROWS_BEGIN || ro > rowsNum - HEAT_SCIP_ROWS_END) {
                        gr = 255;                        
                    } else {
                        gr = mapAndStrip(rawDataHeat[n], minLevel, maxLevel, 0, 255);
                    }                    
                } else {
                    gr = 0;
                    //break
                    ro = rowsNum;
                    co = colsNum;
                }
            } else {
                gr = mapAndStrip(data[ro][co], minLevel, maxLevel, 0, 255);
            }
            
            ctxHeat.strokeStyle = "rgba(" + gr + "," + gr + "," + gr + "," + 1.0 + ")";
            ctxHeat.ellipse(centerX, centerY, r, r, 0, anRads - OVERLAP_ANGLE_RADS, anRads + STEP_ANGLE_RADS + OVERLAP_ANGLE_RADS);
            ctxHeat.stroke();
            
            anRads += STEP_ANGLE_RADS;
        }
    }

    drawBorderHeat();

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
    var clientIdUnic = clientId + "_" + (Date.now() % 10000);
    console.log("Connect as " + clientIdUnic);
    client = new Paho.Client('192.168.0.18', 5883, '', clientIdUnic);
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
    setTimeout(() => {processRawData(message.topic, message.payloadBytes);}, 1);    
  }
  // QOS 0 –  Send Once, not acknowledged
}


function subscribeRange() {
    client.subscribe(TOPIC_RANGE, { qos: 0 });
}


function subscribeHeat() {
  client.subscribe(TOPIC_HEAT, { qos: 0 });
}


function unsubscribeRange() {
    client.unsubscribe(TOPIC_RANGE);
}


function unsubscribeHeat() {
  client.unsubscribe(TOPIC_HEAT);
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


function processRawData(topic, d) {
    if (!isReadyToDraw) {
        skippedCounter++;
        return;
    }
    isReadyToDraw = false;

    if (topic == TOPIC_RANGE) {
        processDataRange(d);
    }
    if (topic == TOPIC_HEAT) {
        processDataHeat(d);
    }
}


var skipBytesForRange = 36;

function processDataRange(d)
{
    // skip bytes (couple of floats)
    // then couples of bytes convert to uint16
    rawDataRange = [];
    p = skipBytesForRange;
    while (p + 2 <= d.length) {
        rawDataRange.push(d[p + 1] * 256 + d[p]);
        p = p + 2;
    }
    
    drawDataRange();
}


var skipBytesForHeat = 28;

function processDataHeat(d)
{
    // skip bytes (couple of floats)
    // then couples of bytes convert to uint16
    rawDataHeat = [];
    p = skipBytesForHeat;
    while (p + 4 <= d.length) {
        rawDataHeat.push(d[p + 3] * 256 * 256 * 256 + d[p + 2] * 256 * 256 + d[p + 1] * 256 + d[p]);
        p = p + 4;
    }
    
    drawDataHeat();
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
    var wr = rawDataRangeColsInput.value;
    var hr = rawDataRangeRowsInput.value;
    var ps = poinSizeInput.value;
    var isDiagonalFlip = diagonalFlipInput.checked;
        
    if (!isDiagonalFlip) {
        canvasRange.width = wr * ps;
        canvasRange.height = hr * ps;
    } else {
        canvasRange.width = hr * ps;
        canvasRange.height = wr * ps;
    }

    var hh = rawDataHeatRowsInput.value;
    var ta = Math.sin(OPENING_ANGLE_RADS / 2);
    canvasHeat.width = 2 * (hh * ps) * ta + 2 * ps;
    canvasHeat.height = hh * ps + 2 * ps;


    canvasScaleAdjust();
    
    initDraw();
}


function canvasScaleAdjust() {
    var isAutoZoomWidthInput = autoZoomWidthInput.checked;
    //var isautoZoomHeightInput = autoZoomHeightInput.checked;
    if (isAutoZoomWidthInput) {
        var ww = document.body.clientWidth;
        var wh = document.body.clientHeight;

        var crw = canvasRange.width;
        var crh = canvasRange.height;
        var canvasRangeRect = canvasRange.getBoundingClientRect();

        var horOffset = canvasRangeRect.left;
        var verOffset = horOffset;

        var scrHor = 1;
        if (isAutoZoomWidthInput) {
            scrHor = (ww - 2 * horOffset) / crw;
        }           

        var chw = canvasHeat.width;
        var chh = canvasHeat.height;
        
        var schHor = 1;
        if (isAutoZoomWidthInput) {
            schHor = (ww - 2 * horOffset) / chw;
        }

        /*
        var scrVer = 1;
        if (isautoZoomHeightInput) {
            scrVer = (wh - 2 * verOffset) / crh;
        }     
        var schVer = 1;
        if (isautoZoomHeightInput) {
            schVer = (wh - 2 * verOffset) / chh;
        }
        */

        var scVer = 1;
        /*
        if (isautoZoomHeightInput) {
            scVer = (wh - 2 * verOffset) / (crh + chh);
        }
        */

        canvasRangeDiv.style.width = "" + ww + "px";
        canvasRangeDiv.style.height = "" + crh + "px";
        canvasRange.style.transform = "scale(" + scrHor + "," + scVer + ")";
        
        canvasHeatDiv.style.width = "" + ww + "px";
        canvasHeatDiv.style.height = "" + chh + "px";
        canvasHeat.style.transform = "scale(" + schHor + "," + scVer + ")";        
    } else {
        canvasRange.style.transform = "scale(1,1)";
        canvasHeat.style.transform = "scale(1,1)";
    } 
}
