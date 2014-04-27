function Tracking (settings) {

   Array.prototype.containsArray = function(input) {
      var result = -1;
      for(var index = 0; index < this.length; index++) {
         if(this[index][0] == input[0] && this[index][1] == input[1]) {
            result = index;
            break;
         }
      }
      return result;
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

   var cache = [];

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

      preload();
      usingCurrentFrameData();
      play();
   }

   this.start = function() {
      togglePlayButton();
      run = true;
   }

   this.stop = function() {
      togglePlayButton();
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
               toggleCellSelection(boundingboxes[i].id);
            }
         }
      }
   }

   function play() {
      if(run && isNotComplete()) {
         increaseFrameId();
      }
      window.setTimeout(play, (1/speed)*1000); 
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
            self.stop();
            return false;
         }
      }
      else
         return true;
   }

   function usingCurrentFrameData() {
      $.get(path+"frames/"+"frame"+frameId+".json", function(data) {
         cells = data.cells;
         refreshBoundingBoxes(cells);
         updateCellmasks();
      });
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
            box.x = nextCells[i][0].centroid.y;
            box.y = nextCells[i][0].centroid.x;
            box.height =  nextCells[i][0].boundingbox.xr - nextCells[i][0].boundingbox.xl;
            box.width =  nextCells[i][0].boundingbox.yr - nextCells[i][0].boundingbox.yl;
         }
         boundingboxes.push(box);
      }
   }

   function updateForeground() {
      var nextFrameSelectedCellIds = [];
      $.each(selectedCells, function(index, value) {
         var cellPath = getCachedPath(cells[value][0].path[0]);
         cellPath.cells = JSON.parse(cellPath.cells);
         cellIndex = cellPath.cells.containsArray([self.getFrameId()-1,value]);
         
         if(cellIndex > -1 && cellPath.cells[cellIndex+1]) {
            nextFrameSelectedCellIds.push(cellPath.cells[cellIndex+1][1]);
         }
         else {
            $.each(cellPath.successors, function(index, successor) {
               successorPath = getCachedPath(successor);
               nextFrameSelectedCellIds.push(JSON.parse(successorPath.cells)[0][1]);
            });
         }
      });
      selectedCells = nextFrameSelectedCellIds;
      usingCurrentFrameData(); 
   }

   function getCachedPath(id) {
      var index = cache.containsKey(id);
      if(index > -1) {
         return JSON.parse(cache[index][1]);
      }
      else {
         var missedPath;
         $.ajax({
            type: "GET",
            url: "/path/"+id+"/"+experiment,
            success: function(cellPath) {
               missedPath = cellPath;
            },
            async:false
         });
         cache.push([id, JSON.stringify(missedPath)]);
         return missedPath;
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
    
      var pixelPosX = 0, 
         pixelPosY = 0;
      for (var i = 0; i <= cellmask.length-1; i++) {
         if(pixelPosY >= boundingboxes[cell_id].height){
            pixelPosY = 0;
            pixelPosX++;
         }
         else {
            pixelPosY++;
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

