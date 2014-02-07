function Tracking (project) {
   
   var path = project.path;
   var maximalFrames = project.maximalFrames;

   var run = false;
   var repeat = false;
   var frameId = "000";
   var speed = 25;

   var background;
   var backgroundContext;
   var contrast;
   var foreground;
   var foregroundContext;
   var progessbar;

   var cells;

   this.start = function() {
      run = true;
      play();
   }

   this.stop = function() {
      run = false;
   }

   this.setForegorund = function(foregroundCanvas) {
      foreground = foregroundCanvas;
      foregroundContext = foreground.getContext('2d');
   }

   this.setBackgorund = function(backgroundCanvas) {
      background = backgroundCanvas;
      backgroundContext = background.getContext('2d');
   }

   this.setContrast = function(backgroundContrast) {
      contrast = backgroundContrast;
   }

   this.setProgessbar = function(progessElement) {
      progessbar = progessElement;
   }


   this.setSpeed = function(animationSpeed) {
      speed = animationSpeed;
   }

   function play() {
      if(run && isNotComplete()) {
         increaseFrameId();
         increaseProgress();
         updateBackground();
         usingCurrentFrameData();
      }
      window.setTimeout(play, (1/speed)*1000); 
   }

   function updateBackground() {
      var image = new Image();
      image.src = path+"images/"+contrast+"/"+"frame"+frameId+".png";
      image.onload = function() {
         backgorund.width  = image.width;
         backgorund.height = image.height;
         backgorund.style.width  = '75%';
         backgroundContext.drawImage(image, 0, 0);
      }
   }

   function increaseFrameId() {
      frameId = parseInt(frameId)++;
      frameId = fillString(frameId.toString(),3);
   }

   function setFrameId(newFrameId) {
      frameId = newFrameId;
      frameId = fillString(frameId.toString(),3);
   }

   function increaseProgress() {
      progress = (newframeId/maximalFrames)*100;
      progessbar.width(progress+"%");
   }

   function usingCurrentFrameData() {
      $.get(path+"frames/"+"frame"+frameId+".json", "cells")
         .done(function(data) {
            cells = data;
         })
   }

   function isNotComplete() {
      if(frameId >= maximalFrames) {
         setFrameId(0);
         if(repeat) 
            return true;
         else
            return false;
      }
      else
         return true;
   }

   function readMask() {
      $.get(cellmasks+"frame"+frameId+".json", function(data) {
      
         cells = data.cells;
         refreshBoundingBoxes(cells);
         currentFrameMasks = [];
         cellsizes = [];

         for(var i=0; i <= cells.length-1; i++){
            refreshMask(cells[i]);
            getCellSize(cells[i]);
         }
      
         updateCellmasks();
      });
   } 


}

