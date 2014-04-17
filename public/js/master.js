function Tracking (settings) {

   var self = this;

   var path = settings.path;
   var maximalFrames = settings.maximalFrames;

   var run = false;
   var repeat = false;
   var frameId = "000";
   var speed = 5;

   var contrast = (settings.options.split(","))[0];

   var backgroundCanvas, foregroundCanvas;
   var backgroundContext, foregroundContext;   

   var cells;
   var selectedCells = [];
   var boundingboxes = [];

   function init() {
      backgroundCanvas = $("#backgroundCanvas")[0];
      foregroundCanvas = $("#foregroundCanvas")[0];

      backgroundContext = backgroundCanvas.getContext('2d');
      foregroundContext = foregroundCanvas.getContext('2d');

      var image = new Image();
      image.src = path+"images/"+self.getContrast()+"/"+"frame000.png";
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
      updateBackground();
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

   function updateBackground() {
      var image = new Image();
      image.src = path+"images/"+contrast+"/"+"frame"+frameId+".png";
      image.onload = function() {
         backgroundContext.drawImage(image, 0, 0);
      }
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
      //$.get(path+"paths.json", function(path) {
         var nextFrameSelectedCellIds = [];
         /*$.each(selectedCells, function(index, value) {
            var id = cells[value].path;
            var frame = frameId;

            var hash = {};
            var pathIndex;
            for(var i = 0 ; i < path.paths[id].cells.length; i += 1) {
               hash[path.paths[id].cells[i]] = i;
            }

            var val = [parseInt(cells[value].id), frame-1];

            if(hash.hasOwnProperty(val)) {
               pathIndex = hash[val]+1
            }
            else {
               pathIndex = -1;
            }

            if(path.paths[id].cells[pathIndex]) {
               nextFrameSelectedCellIds.push(path.paths[id].cells[pathIndex][0]);
            }
            else if(path.paths[id].successors.length > 0){
               for(var i = 0; i <= path.paths[id].successors.length-1; i++) {
                  var successor = path.paths[id].successors[i];
                  nextFrameSelectedCellIds.push(path.paths[successor].cells[0][0].toString());
               }
            }
         });*/
         
         $.get("/path/"+settings.experimentId, function(path) {
            console.log(path);
         });

         //selectedCells = nextFrameSelectedCellIds;
         usingCurrentFrameData();   
      //});
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

   function getIndexInPath(path, cell_id) {
      var subPath = [];
      $.each(path, function(index, value) {
         subPath.push = [value[0], value[1]];
      });
      return $.inArray(subPath, [frameId, cell_id]);
   } 

   init();
}

