// get canvas related references
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var BB = canvas.getBoundingClientRect();
var offsetX = BB.left;
var offsetY = BB.top;
var WIDTH = canvas.width;
var HEIGHT = canvas.height;
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
var rawDataCols = document.getElementById("rawDataColsInput");
var rawDataRows = document.getElementById("rawDataRowsInput");

var timesLabel = document.getElementById("timesLabel");


function initOnLoad() {
    console.log("initOnLoad");  
    
    initDraw();
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
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
}

function drawBorder() {
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
    
    //ctx.fillStyle = BACKGROUND_FILL_STILE;
    //rect(0, 0, WIDTH, HEIGHT);
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
    clear();
    
    const pointSize = poinSizeInput.value;
    var isDiagonalFlip = diagonalFlipInput.checked;    
    var minLevel = blackLevelInput.value;
    var maxLevel = whiteLevelInput.value;
    var rowsNum = 0;
    var colsNum = 0;

    if (isDataFromSocket) {
        rowsNum = rawDataRows.value;
        colsNum = rawDataCols.value;
    } else {
        rowsNum = data.length;
        colsNum = data[0].length;
    }

    for (var ro = 0; ro < rowsNum; ro++) {
        for (var co = 0; co < colsNum; co++) {
            var gr;
            if (isDataFromSocket) {
                var n = ro * colsNum + co;
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
    
    drawBorder();

    //setTimeout(() => {
        isReadyToDraw = true;
    //}, "5");          
}


//------------------------------------

var clientId = "visualizerId";
var userName = "visualizerUser";

var client;

var connectOptions = {
  timeout: 30,
  reconnect: true,
  cleanSession: true,
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
  client.onMessageArrived = function(message) {
    //console.log("onMessageArrived: length = " + message.payloadBytes.length);
    //console.log("onMessageArrived: " + message.payloadBytes);

    timeMeasuring();
    processRawData(message.payloadBytes);
  }
  client.subscribe("sensor/radar/rangedoppler", { qos: 2 });
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


const skipBytes = 34;

function processRawData(d) {
    if (!isReadyToDraw) {
        return;
    }
    isReadyToDraw = false;

    // skip bytes (couple of floats)
    // then couples of bytes convert to uint16
    rawData = [];
    p = skipBytes;
    while (p + 2 < d.length) {
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


function timeMeasuring() {
    timesLabel.innerText = "min 0.0 ms";
}

