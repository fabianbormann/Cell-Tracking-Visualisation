function Tracking (settings) {

   Array.prototype.containsObject = function(cellId, frameId) {
      var found = -1;
      for(var i = 0; i < this.length; i++) {
          if (this[i].cellid == cellId && this[i].frameid == frameId) {
              found = i;
              break;
          }
      }
      return found
   }

   Array.prototype.containsKey = function(key) {
      var result = -1;
      for(var index = 0; index < this.length; index++) {
         if(this[index][0] == key) {
            result = index;
            break;
         }
      }
      return result;
   }

   var self = this;

   var path = settings.path;
   var maximalFrames = settings.maximalFrames;
   var imageExtension = "."+settings.imageSuffix;

   var run = false;
   var repeat = false;
   var frameId = "000";
   var speed = 10;
   var relativeSpeed = 10;

   var adjacencyList;
   var cache = [];
   var frameCache = [];
   var filters = [];

   var experiment = settings.experimentId;
   var contrast = (settings.options.split(","))[0];

   var backgroundCanvas, foregroundCanvas;
   var backgroundContext, foregroundContext;   

   var images = [];

   var cells;
   var selectedCells = [];
   var boundingboxes = [];

   function init() {
      backgroundCanvas = $("#backgroundCanvas")[0];
      foregroundCanvas = $("#foregroundCanvas")[0];

      backgroundContext = backgroundCanvas.getContext('2d');
      foregroundContext = foregroundCanvas.getContext('2d');

      var image = new Image();
      image.src = path+"images/"+self.getContrast()+"/"+"frame000"+imageExtension;
      image.onload = function() {
         backgroundCanvas.width  = image.width;
         backgroundCanvas.height = image.height;
         backgroundCanvas.style.width  = '75%';
         backgroundContext.drawImage(image, 0, 0);

         foregroundCanvas.width  = image.width;
         foregroundCanvas.height = image.height;
         foregroundCanvas.style.width  = '75%';

         $("#canvasContainer").height( $("#backgroundCanvas").height() );
      }

      $.get(path+"adjacencylist.json", function(data) {
         adjacencylist = data;
      });
      
      self.lockCanvas();
      bufferFrameData(0, maximalFrames-1, function() {
         self.unlockCanvas();
         usingCurrentFrameData();
      });
      preload() 
      play();
   }

   this.start = function() {
      togglePlayButton();
      run = true;
   }

   this.stop = function() {
      togglePlayButton();
      resetFPS = true;
      run = false;
   }

   this.isRunning = function () {
      return run;
   }

   this.inRepeatMode = function () {
      return repeat;
   }

   this.activateRepeat = function () {
      repeat = true;
   }

   this.deactivateRepeat = function () {
      repeat = false;
   }

   this.setContrast = function(backgroundContrast) {
      contrast = backgroundContrast;
      preload();
   }

   this.getContrast = function() {
      return contrast;
   }

   this.setSpeed = function(animationSpeed) {
      speed = animationSpeed;
      relativeSpeed = animationSpeed;
   }

   this.setFrameId = function(newFrameId) {
      if(isString(newFrameId)) {
         frameId = newFrameId;
      }
      else {
         frameId = fillString(newFrameId.toString(),3);
      }

      var progress = (frameId/maximalFrames)*100;
      $("#progress").width(progress+'%');
      updateBackground();
      updateForeground();
   }

   this.getFrameId = function() {
      return parseInt(frameId);
   }

   this.lockCanvas = function() {
      $('#celltrack_state').show();
   }

   this.unlockCanvas = function() {
      $('#celltrack_state').hide();
   }

   var blocked = false;
   this.isBlocked = function() {
      return blocked;
   }

   this.block = function() {
      if (self.isRunning()) {
         self.stop();
         blocked = true;
      }
   }

   this.unblock = function() {
      if (!self.isRunning() && blocked) {
         self.start();
         blocked = false;
      }
   }

   this.selectCell = function(event) {
      var posX = parseInt ($("#foregroundCanvas").offset().left);
      var posY = parseInt ($("#foregroundCanvas").offset().top);

      var mouseX = parseInt (event.pageX) - posX;
      var mouseY = parseInt (event.pageY) - posY;

      mouseX = mouseX*(backgroundCanvas.width/$("#backgroundCanvas").width());
      mouseY = mouseY*(backgroundCanvas.height/$("#backgroundCanvas").height());
      for (var i = 0; i <= boundingboxes.length-1; i++) {
         var boxWidth = boundingboxes[i].width;
         var boxHeight = boundingboxes[i].height;
         var boxPositionX = boundingboxes[i].x-(boundingboxes[i].width/2);
         var boxPositionY = boundingboxes[i].y-(boundingboxes[i].height/2);

         if(mouseX >= boxPositionX && mouseX <= boxPositionX+boxWidth) {
            if(mouseY >= boxPositionY && mouseY <= boxPositionY+boxHeight) {
               self.block();
               toggleCellSelection(boundingboxes[i].id);
               self.lockCanvas();
               bufferPaths(cells[boundingboxes[i].id][0].path[0], function() {
                  self.unlockCanvas();
                  self.unblock();
               });
            }
         }
      }
   }

   this.addFilter = function(filterSettings) {
      filters.push({
         option : filterSettings.option,
         from : filterSettings.from,
         to : filterSettings.to,
         inculde : filterSettings.include
      });
      getCellsfromFilters();
      updateFilterArea();
   }

   function getCellsfromFilters() {
      $.post("/path/filter/", {filters : filters, experiment : experiment}, function(filteredCells) {
         console.log(filteredCells)
         checkFilter(filteredCells);
      });
   }

   function checkFilter(filteredCells) {
      $.each(filteredCells, function( key, cells) {
         if(cells[0][0] <= self.getFrameId()) {
            for(var i = 0; i < cells.length; i++) {
               if(cells[i][0] == self.getFrameId()) {
                  console.log(cells[i][1])
                  selectedCells.push(cells[i][1]);
                  break;
               }
            }
         }
      });
      updateCellmasks();
   }

   var resetFPS = true;
   function play() {
      if(run && isNotComplete()) {
         increaseFrameId();
         speedKeeper(getFPS());
         resetFPS = false;
      }
      window.setTimeout(play, (1/relativeSpeed)*1000); 
   }

   function speedKeeper(fps) {
      console.log("FPS: "+fps+" Speed: "+speed+" corrected Speed: "+relativeSpeed);
      if(speed < fps)
         relativeSpeed -= (fps-speed)/2;
      else  if(speed > fps)
         relativeSpeed += (speed-fps)/2;
   }

   function preload() {
      for(var i = self.getFrameId(); i < maximalFrames; i++) {
         var image = new Image();
         images.push(image);
         images[i].src = path+"images/"+self.getContrast()+"/"+"frame"+fillString(i.toString(),3)+imageExtension;

         if(i == self.getFrameId()) {
            images[i].onload = function() {
               updateBackground();
            }
         }
      }
      for(var i = 0; i < self.getFrameId(); i++) {
         var image = new Image();
         images.push(image);
         images[i].src = path+"images/"+self.getContrast()+"/"+"frame"+fillString(i.toString(),3)+imageExtension; 
      }
   }

   function bufferFrameData(startFrame, endFrame, bufferCallback) {
      if(startFrame <= endFrame) {
         getFrameData(startFrame, function() {
            bufferFrameData(startFrame+1, endFrame, bufferCallback);
         });
      }
      else
         executeCallback(bufferCallback);
   }

   function bufferPaths(path_id, bufferCallback) {
      cachePath(path_id, function(path) {
         removeEdge();
         successors = getSuccessors(path.id);
         if(successors) {
            $.each(successors, function(key, successor) {
               addEdge();
               bufferPaths(successor, bufferCallback)
            });
         }
         else
            executeConditionalCallback((edges == 0), bufferCallback);
      });
   }

   var edges = 0;
   function addEdge(value) {
      edges++;
   }

   function removeEdge() {
      if(edges > 0)
         edges--;
   }

   function executeConditionalCallback(condition, callback) {
      if(condition) {
         callback();
      }
   }

   function executeCallback(callbackFunction, params) {
      if(typeof(callbackFunction) == 'function') {
         callbackFunction(params);
      }      
   }

   var lastFrame = new Date();
   function getFPS() {
      if(resetFPS) {
         lastFrame = new Date();
         return speed;
      }
      else {
         var now = new Date();
         var delta = now-lastFrame;
         lastFrame = now;
         return 1000/delta;
      }
   }

   function bufferingNecessary() {
      var necessary = false;
      for(var i = self.getFrameId(); i < self.getFrameId()+40; i++) {
         if(i < maximalFrames) {
            if(frameCache[i] == 'undefined') {
               necessary = true;
               break;
            }
         }
         else {
            break;
         }
      }
      return necessary;
   }

   function updateBackground() {
      backgroundContext.drawImage(images[parseInt(frameId)], 0, 0);
   }

   function increaseFrameId() {
      var increasedFrameId = self.getFrameId();
      increasedFrameId++;
      self.setFrameId( increasedFrameId );
   }

   function isNotComplete() {
      if(frameId >= maximalFrames-1) {
         self.setFrameId(0);
         if(repeat) {
            return true;
         }
         else {
            relativeSpeed = speed;
            self.stop();
            return false;
         }
      }
      else
         return true;
   }

   function usingCurrentFrameData() {
      cells = getFrameData(frameId).cells;

      refreshBoundingBoxes(cells);
      updateCellmasks();
   } 

   function getFrameData(id, callback) {
      var index = frameCache.containsKey(id);
      if(index > -1) {
         return JSON.parse(frameCache[index][1]);
      }
      else {
         $.when($.get(path+"frames/"+"frame"+fillString(id.toString(),3)+".json"))
         .done(function( data ) {
            frameCache.push([id, JSON.stringify(data)]);
            executeCallback(callback, data);
         })
         .fail(function() {
            console.error( 'frame data request failed.' );
            executeCallback(callback, null);
         });
      }  
   }

   function refreshBoundingBoxes(nextCells) {
      boundingboxes = [];
      for (var i = 0; i < nextCells.length; i++) {
         var box;
         if(nextCells[i][0] == null) {
            box = {}
         }
         else {    
            box = {};
            box.id = nextCells[i][0].id;
            box.x = nextCells[i][0].centroid.x;
            box.y = nextCells[i][0].centroid.y;
            box.height =  nextCells[i][0].boundingbox.yr - nextCells[i][0].boundingbox.yl;
            box.width =  nextCells[i][0].boundingbox.xr - nextCells[i][0].boundingbox.xl;
         }
         boundingboxes.push(box);
      }
   }

   function updateForeground() {
      var nextFrameSelectedCellIds = [];
      $.each(selectedCells, function(index, value) {
         var cellPath = getCachedPath(cells[value][0].path[0]);
         var cellIndex = cellPath.cells.containsObject(value, self.getFrameId()-1);
         if(cellIndex > -1 && cellPath.cells[cellIndex+1]) {
            nextFrameSelectedCellIds.push(cellPath.cells[cellIndex+1].cellid);
         }
         else {
            $.each(adjacencylist[cellPath.id].suc, function(index, successor) {
               var successorPath = getCachedPath(successor);
               nextFrameSelectedCellIds.push(successorPath.cells[0].cellid);               
            });
         }
      });
      selectedCells = nextFrameSelectedCellIds;
      usingCurrentFrameData(); 
   }

   function getSuccessors(path_id) {
      if (adjacencylist[path_id].suc.length > 0)
         return adjacencylist[path_id].suc;
      else
         return null;
   }

   function getCachedPath(id) {
      var index = cache.containsKey(id);
      return JSON.parse(cache[index][1]);     
   }

   function cachePath(id, callback) {
      var index = cache.containsKey(id);
      if(index > -1) {
         executeCallback(callback, JSON.parse(cache[index][1]));
      }
      else {
         $.when($.get("/path/"+id+"/"+experiment))
         .done(function( data ) {
            cache.push([id, JSON.stringify(data)])
            executeCallback(callback, data);
         })
         .fail(function() {
            console.error( 'Path request failed.' );
            executeCallback(callback, null);
         });
      }  
   }

   function updateCellmasks() {
      foregroundContext.clearRect(0,0,foregroundCanvas.width,foregroundCanvas.height);
      for(var i = 0; i <= selectedCells.length-1; i++) {
         drawMask(selectedCells[i]);
      }
   }


  function toggleCellSelection(cell_id) {
      if(cellIsSelected(cell_id)) {
         clearMask(cell_id);
         maskIndex = $.inArray(cell_id, selectedCells);
         selectedCells.splice(maskIndex, 1);
      }
      else {
         drawMask(cell_id);
         selectedCells.push(cell_id);
      }
   }

   function cellIsSelected(cell_id) {
      if($.inArray(cell_id, selectedCells) != -1)
         return true;
      else
         return false;
   }

   function clearMask(cell_id) {
      foregroundContext.clearRect(boundingboxes[cell_id].x-(boundingboxes[cell_id].width/2),boundingboxes[cell_id].y-(boundingboxes[cell_id].height/2),boundingboxes[cell_id].width, boundingboxes[cell_id].height);
   }

   function drawMask(cell_id) {
      var cellmask = base64toBinary(cells[cell_id][0].mask, 'binary');
      var boxPosX = boundingboxes[cell_id].x-(boundingboxes[cell_id].width/2);
      var boxPosY = boundingboxes[cell_id].y-(boundingboxes[cell_id].height/2);
    
      var pixelPosX = 0; 
      var pixelPosY = 0;
      for (var i = 0; i < cellmask.length; i++) {
         if(pixelPosX >= boundingboxes[cell_id].width){
            pixelPosX = 0;
            pixelPosY++;
         }
         else {
            pixelPosX++;
         }

         if(cellmask[i] === "1"){
            foregroundContext.fillStyle = 'rgba(0,225,0,1)';
            foregroundContext.fillRect(pixelPosX+boxPosX-1, pixelPosY+boxPosY-1,1,1);
         } 
      }
   }

   function togglePlayButton() {
      $("#playButton").toggleClass( "active red" );
      $("#playIcon").toggleClass( "hidden" );
      $("#pauseIcon").toggleClass( "hidden" );
   }

   function fillString(value, maximum) {
      while (value.length < maximum) value = '0' + value;
      return value;
   }

   function base64toBinary(base64Data) {
      var byteCharacters = atob(base64Data);
      var bytesLength = byteCharacters.length;

      var byteArray = [];

      for (var currentChar = 0; currentChar < bytesLength; ++currentChar) {
         var decodedChar = byteCharacters.charCodeAt(currentChar);
            for(var i = 0; i < 8; i++) {
               byteArray.push(fillString(decodedChar.toString(2),8).charAt(i));
            }
      }
      return byteArray;
   }

   function isString(o) {
      return typeof o == "string" || (typeof o == "object" && o.constructor === String);
   }

   init();
}

