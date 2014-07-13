function Tracking (settings) {

	var self = this;

	var path = settings.path;
	var maximalFrames = settings.maximalFrames;
	var imageExtension = "."+settings.imageSuffix;

	var run = false;
	var repeat = false;
	var frameId = "000";
	var speed = 10;
	var relativeSpeed = 10;

	var selectionColor = "00FF00"

	var adjacencyList;
	var cache = [];
	var frameCache = [];

	var experiment = settings.experimentId;
	var contrast = (settings.options.split(","))[0];

	var backgroundCanvas, foregroundCanvas;
	var backgroundContext, foregroundContext;   

	var images = [];
  var trackingFilter;
	var cells;
	var selectedCells = [];
	var selectedCellsColor = [];
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
		preload(); 
		play();
    trackingFilter = new TrackingFilter();
	}

	this.start = function() {
		togglePlayButton();
		run = true;
	}

	this.stop = function(reset) {
		if(reset) {
      $("#playButton").removeClass( "active red" );
      $("#playIcon").removeClass( "hidden" );
      $("#pauseIcon").addClass( "hidden" );
    }
    else {
      togglePlayButton();
    }
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

	this.jumpTo = function(nextFrame) {
		calculateSelectedCells(nextFrame);
		self.setFrameId(nextFrame, true);
		self.redrawCells();
	}

  this.redrawCells = function() {
    usingCurrentFrameData(); 
  }

	this.setSelectionColor = function(color) {
		if(color.substr(0,2) == "0x")
			color = color.substr(2);

		selectionColor = color;
	}

	this.setFrameId = function(newFrameId, noForegroundUpdate) {
		if(isString(newFrameId)) {
			frameId = newFrameId;
		}
		else {
			frameId = fillString(newFrameId.toString(),3);
		}

		var progress = (frameId/maximalFrames)*100;
		$("#progress").width(progress+'%');
		updateBackground();

		if(!noForegroundUpdate)
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

  this.filter = function() {
    return trackingFilter;
  }

	this.unblock = function() {
		if (!self.isRunning() && blocked) {
			self.start();
			blocked = false;
		}
	}

  this.selectPath = function(event) {
    var selection = locateNearestCell(event);
    if(selection > -1) {
      var predecessors = getAllPredecessors(cells[selection][0].path);

      var pathCells = [];
      $.each(predecessors, function(key, predecessor) {
        var completeTree = getFutureCells(getCachedPath(predecessor), self.getFrameId());
        pathCells = pathCells.concat(completeTree);
      });

      $.each(pathCells.unique(), function(key, cell) {
        selectedCells.push(cell);
        selectedCellsColor.push([cell, selectionColor]);
        drawMask(cell);
      })
    }
  }

  function getAllPredecessors(path_id) {
    predecessors = [path_id];
    observed_predecessor = getPredecessors(path_id);
    if(observed_predecessor.length > 0)
      predecessors.push(observed_predecessor[0]);
    
    while(observed_predecessor.length > 0) {
      observed_predecessor = getPredecessors(observed_predecessor[0]);
      if(observed_predecessor.length > 0)
        predecessors.push(observed_predecessor[0]);
    }
    return predecessors;
  }

  function locateNearestCell(event) {
    var posX = parseInt ($("#foregroundCanvas").offset().left);
    var posY = parseInt ($("#foregroundCanvas").offset().top);

    var mouseX = parseInt (event.pageX) - posX;
    var mouseY = parseInt (event.pageY) - posY;

    mouseX = mouseX*(backgroundCanvas.width/$("#backgroundCanvas").width());
    mouseY = mouseY*(backgroundCanvas.height/$("#backgroundCanvas").height());

    var minDistance = [null];

    // select the nearest cell 
    for (var i = 1; i <= boundingboxes.length-1; i++) {
      var distance =  Math.sqrt(Math.pow(boundingboxes[i].x - mouseX,2) + Math.pow(boundingboxes[i].y - mouseY,2));
      if (distance < minDistance[0] || minDistance[0]==null)
        minDistance = [distance,boundingboxes[i].id];
    }

    // threshold for distance 
    if (minDistance[0]<100)
      return minDistance[1];
    else
      return -1;
  }

	this.selectCell = function(event) {
		var selection = locateNearestCell(event);
    if(selection != -1) {
    	self.block();
    	toggleCellSelection(selection);
    	self.lockCanvas();
    	bufferPaths(cells[selection][0].path[0], function() {
    		self.unlockCanvas();
    		self.unblock();
    	});
    }
  }

  	function calculateSelectedCells(nextFrame) {
	  	if(nextFrame < self.getFrameId()) {
	  		var pastCells = [];
	  		var pastCellColors = [];
	  		$.each(selectedCells, function(key, cell) {
	  			var pastTree = getPastCells(getCachedPath(cells[cell][0].path[0]), nextFrame);
	  			pastCells = pastCells.concat(pastTree);

	  			$.each(pastTree.unique(), function(pastKey, pastCell) {
	  				var color_index = pastCellColors.containsKey(pastCell);
	  				if (color_index == -1)
	  					pastCellColors.push([pastCell, getSelectedCellColor(cell)]);
	  			});
	  		});
	  		selectedCells = pastCells.unique(); 
	  		selectedCellsColor = pastCellColors;        
	  	}
	  	else {
	  		var futureCells = [];
	  		var futureCellColors = [];
	  		$.each(selectedCells, function(key, cell) {
	  			var futureTree = getFutureCells(getCachedPath(cells[cell][0].path[0]), nextFrame);
	  			futureCells = futureCells.concat(futureTree);

	  			$.each(futureTree.unique(), function(futureKey, futureCell) {
	  				var color_index = futureCellColors.containsKey(futureCell);
	  				if (color_index == -1)
	  					futureCellColors.push([futureCell, getSelectedCellColor(cell)]);
	  			});
	  		});
	  		selectedCells = futureCells.unique();
	  		selectedCellsColor = futureCellColors;
	  	}									
  	}

	function getFutureCells(path, requestedFrameId) {
	  	var lastFrameInPath = path.cells[path.cells.length-1].frameid;
	  	var nextSelectedcCells = [];
	  	if(requestedFrameId <= lastFrameInPath) {
	  		if(path.cells[ requestedFrameId-path.cells[0].frameid ])
	  			nextSelectedcCells.push(path.cells[ requestedFrameId-path.cells[0].frameid ].cellid);
	  	}
	  	else {
	  		$.each(getSuccessors(path.id), function(index, successor) {
	  			nextSelectedcCells = nextSelectedcCells.concat(getFutureCells(getCachedPath(successor), requestedFrameId));
	  		});
	  	}
	  	return nextSelectedcCells;
	}

  	function getPastCells(path, requestedFrameId) {
	  	var firstFrameInPath = path.cells[0].frameid;
	  	var nextSelectedcCells = [];
	  	if(firstFrameInPath <= requestedFrameId) {
	  		if(path.cells[ requestedFrameId-path.cells[0].frameid ])
	  			nextSelectedcCells.push(path.cells[ requestedFrameId-path.cells[0].frameid ].cellid);
	  	}
	  	else {
	  		$.each(getPredecessors(path.id), function(index, predecessor) {
	  			nextSelectedcCells = nextSelectedcCells.concat(getPastCells(getCachedPath(predecessor), requestedFrameId));
	  		});
	  	}
	  	return nextSelectedcCells;
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
  		if(successors.length > 0) {
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
  		self.jumpTo(0);
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
  	var nextFrameSelectedCellColors = [];
  	$.each(selectedCells, function(index, value) {
  		var cellPath = getCachedPath(cells[value][0].path[0]);
  		var cellIndex = cellPath.cells.containsObject(value, self.getFrameId()-1);
  		if(cellIndex > -1 && cellPath.cells[cellIndex+1]) {
  			nextFrameSelectedCellIds.push(cellPath.cells[cellIndex+1].cellid);
  			nextFrameSelectedCellColors.push([cellPath.cells[cellIndex+1].cellid, getSelectedCellColor(value)]);
  		}
  		else {
  			$.each(adjacencylist[cellPath.id].suc, function(index, successor) {
  				var successorPath = getCachedPath(successor);
  				nextFrameSelectedCellIds.push(successorPath.cells[0].cellid);
  				nextFrameSelectedCellColors.push([successorPath.cells[0].cellid, getSelectedCellColor(value)]);              
  			});
  		}
  	});
  	selectedCells = nextFrameSelectedCellIds;
  	selectedCellsColor = nextFrameSelectedCellColors;
  	usingCurrentFrameData(); 
  }

  function getSuccessors(path_id) {
  	if (adjacencylist[path_id].suc.length > 0)
  		return adjacencylist[path_id].suc;
  	else
  		return [];
  }

  function getPredecessors(path_id) {
  	if (adjacencylist[path_id].pre.length > 0)
  		return adjacencylist[path_id].pre;
  	else
  		return [];
  }

  function getSelectedCellColor(cell_id) {
  	var color_index = selectedCellsColor.containsKey(cell_id);
  	if (color_index != -1)
  		return selectedCellsColor[color_index][1];
  	else {
  		return "00FF00";
  	}
  }

  function getCachedPath(id) {
  	var index = cache.containsKey(id);
  	if(index != -1) {
  		return JSON.parse(cache[index][1]);     
  	}
  	else {
  		var result = null;
  		jQuery.ajax({
  			url: "/path/"+id+"/"+experiment,
  			success: function(data) {
  				result = data;
  				cache.push([id, JSON.stringify(data)])
  			},
  			async: false
  		}); 
  		return result;
  	}
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
  	for(var i = 0; i < selectedCells.length; i++) {
  		drawMask(selectedCells[i]);
  	}

    var filteredCells = trackingFilter.getCells(self.getFrameId());
    console.log(filteredCells);
    if(filteredCells.length > 0) {
      for(var j = 0; j < filteredCells.length; j++) {
        drawMask(filteredCells[j][0], filteredCells[j][1]);
      }
    }
  }

  function toggleCellSelection(cell_id) {
  	if(cellIsSelected(cell_id)) {
  		clearMask(cell_id);
  		maskIndex = $.inArray(cell_id, selectedCells);
  		selectedCells.splice(maskIndex, 1);
  		var color_index = selectedCellsColor.containsKey(cell_id);
  		if (color_index != -1)
  			selectedCellsColor.splice(color_index, 1);
  	}
  	else {
  		selectedCells.push(cell_id);
  		selectedCellsColor.push([cell_id, selectionColor]);
  		drawMask(cell_id);
  	}
  }

  function cellIsSelected(cell_id) {
  	if($.inArray(cell_id, selectedCells) != -1)
  		return true;
  	else
  		return false;
  }

  function clearMask(cell_id) {
  	foregroundContext.clearRect(boundingboxes[cell_id].x-(boundingboxes[cell_id].width/2)-1,boundingboxes[cell_id].y-(boundingboxes[cell_id].height/2)-1,boundingboxes[cell_id].width+1, boundingboxes[cell_id].height+1);
  }

  function drawMask(cell_id, opt_color) {
  	var cellmask = base64toBinary(cells[cell_id][0].mask, 'binary');
  	var boxPosX = boundingboxes[cell_id].x-(boundingboxes[cell_id].width/2);
  	var boxPosY = boundingboxes[cell_id].y-(boundingboxes[cell_id].height/2);

  	var pixelPosX = 0; 
  	var pixelPosY = 0;
    var mask_color;
    
    if(opt_color)
      mask_color = opt_color;
    else
      mask_color = getSelectedCellColor(cell_id);

  	for (var i = 0; i < cellmask.length; i++) {
  		if(pixelPosX >= boundingboxes[cell_id].width){
  			pixelPosX = 0;
  			pixelPosY++;
  		}
  		else {
  			pixelPosX++;
  		}

  		if(cellmask[i] === "1"){
  			foregroundContext.fillStyle = mask_color;
  			foregroundContext.fillRect(pixelPosX+boxPosX-1, pixelPosY+boxPosY-1,1,1);
  		} 
  	}
  }

  function togglePlayButton() {
  	$("#playButton").toggleClass( "active red" );
  	$("#playIcon").toggleClass( "hidden" );
  	$("#pauseIcon").toggleClass( "hidden" );
  }

  init();
}