window.addEventListener('DOMContentLoaded', (event) => {
  $("#start")[0].onclick = () => {
    console.log('clicked');
    stopped = ! stopped;
    $("#start")[0].innerHTML = stopped ? 'start' : 'stop';
  }
  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  .then(handleSuccess);

});


let stopped = true

const handleSuccess = function(stream) {
  const audioCtx = new AudioContext();
  let fftSize = 32768;
  let frameCount = 16384;
  let numBuffers = fftSize / frameCount;
  const source = audioCtx.createMediaStreamSource(stream);

  var scriptNode = audioCtx.createScriptProcessor(frameCount, 1, 1);
  source.connect(scriptNode);
  scriptNode.connect(audioCtx.destination);

  let fft = new miniFFT(fftSize);

  let input = [];
  let bufferCount = 0;

  scriptNode.onaudioprocess = function(audioProcessingEvent) {
    if (stopped) return;

    let inputBuffer = audioProcessingEvent.inputBuffer;
    let channelData = inputBuffer.getChannelData(0);
    console.log('inputBuffer.getChannelData(0).length=' + channelData.length)
    input = input.concat(...channelData);
    bufferCount++;
    console.log("input.length=" +input.length)
    if (bufferCount < numBuffers) {
      return ;
    }

    // test frequency measurement correctness
    
    // let dt = 1./44100;
    // let freq = 10000.;
    // for (var j = 0; j < input.length; j++) {
    //   let t = j*dt;
    //   input[j] = Math.sin(2*Math.PI*freq*t);
    // }

    //

    let res = fft.analyze(input);
    res = fft.toMagnitude(res).slice(0, res.length/2);
    let freqLow = 20;
    let freqHigh = 8000;
    let factor = 44100./(fftSize);
    let low = freqLow/factor;
    let high = freqHigh/factor;
    let pitch = fft.getArgmax(res)*factor;
    res  = res.slice(low, high)

    let measureFreqText = document.querySelector('#measured_freq');
    measureFreqText.innerHTML = (Math.round(pitch*100)/100.).toString();

    let peakVal = fft.getMax(res);
    console.log('pitch=' + pitch)
    console.log('peakVal=' + peakVal)
    let canvasTime = document.querySelector('.visualizer_time');
    let canvasFreq = document.querySelector('.visualizer_freq');

    let inputVisualize = input.map(
      x => x*1. *25
    )

    let resVisualize = res.map(
      x => x*1. / peakVal*100
    )

    visualize(canvasTime, inputVisualize, 1000, 100, 50);
    visualize(canvasFreq, resVisualize, 1000, 100, 0);
    input = [];
    bufferCount = 0;

  }

}


// draw an oscilloscope of the current audio source
function visualize(canvas, dataArray, width, height, offset) {

  let draw = () => {
    let canvasCtx = canvas.getContext("2d");
    drawVisual = requestAnimationFrame(draw);
  
  
    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    canvasCtx.fillRect(0, 0, width, height);
  
    canvasCtx.lineWidth = 1;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
  
    canvasCtx.beginPath();
    let dataLength = dataArray.length;
    var sliceWidth = width * 1.0 / dataLength;
    var x = 0;
  
    for(var i = 0; i < dataLength; i++) {
  
      var v = offset + dataArray[i];
      var y = height - v;
  
      if(i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }
  
    canvasCtx.stroke();
  };

  draw();
}
