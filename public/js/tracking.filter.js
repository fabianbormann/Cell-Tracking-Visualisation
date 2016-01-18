function TrackingFilter() {
  var filters = [];
  var self = this;

  this.add = function(settings) {
    filter = {};
    filter.color = "#FF00FF";
    filter.active = true;
    filter.option = settings.option;
    filter.include = settings.include;
    filter.from = settings.from;
    filter.to = settings.to;
    filter.paths = getPathsfromFilter(settings);

    filters.push(filter);
  }

  this.getCells = function(frameId) {
    var cells = [];
    $.each(filters, function(filters_key, filter) {
    	if(filter.active) {
	    	$.each(filter.paths, function(paths_key, path) {
	        	var cell_id = getCellAtFrame(path, frameId);
	        	if( cell_id != -1)
	          		cells.push([cell_id, filter.color]);
	      	});
	    }
    });
    return cells;
  }

  this.deactivate = function(filter_index) {
  	filters[filter_index].active = false;
  	self.updateUi();
  }

  this.moveUp = function(filter_index) {
  	if (filter_index > 0) {
  		var tmp = filters[filter_index-1];
  		filters[filter_index-1] = filters[filter_index];
  		filters[filter_index] = tmp;
  	}
  	self.updateUi();
  }

  this.moveDown = function(filter_index) {
  	if (filter_index < filters.length-1) {
  		var tmp = filters[filter_index+1];
  		filters[filter_index+1] = filters[filter_index];
  		filters[filter_index] = tmp;
  	}
  	self.updateUi();
  }

  this.activate = function(filter_index) {
  	filters[filter_index].active = true;
  	self.updateUi();
  }

  this.changeFilterColor = function(color, index) {
    filters[index].color = color;
  } 

  this.remove = function(index) {
    filters.splice(index, 1);
    self.updateUi();
  }

  this.updateUi = function() {
    if(filters.length > 0) {
      $('#filterArea').show();
      $("#filter").html("");
      $.each(filters, function(key, filter) {
      	var boxColor = filter.active ? "blue" : "red";
      	var circle = filter.active ? "circle blank" : "remove circle";
      	var moveIcons = "";
      	if((key == 0) && (key == filters.length-1)) {
      		moveIcons = "";
      	}
      	else if(key == 0) {
      		moveIcons = "<i data-index=\""+key+"\" class=\"down secound icon\"></i>";
      	}
      	else if(key == filters.length-1) {
      		moveIcons = "<i data-index=\""+key+"\" class=\"up first icon\"></i>";
      	}
      	else {
      		moveIcons = "<i data-index=\""+key+"\" class=\"up first icon\"></i><i data-index=\""+key+"\" class=\"down secound icon\"></i>";
      	}
        $('#filter').append("<div class=\"ui "+boxColor+" message\">"+moveIcons+"<i data-index=\""+key+"\" class=\""+circle+" third icon\"></i><i data-index=\""+key+"\" class=\"remove fourth icon\"></i><input class=\"filterColor\"" +
         "data-index=\""+key+"\" type=\"color\" value=\""+filter.color+"\"><div class=\"filter_info\">"+filter.option+" between "+filter.from+" and "+filter.to+"</div></div>");
      });
    }
    else {
      $('#filterArea').hide();
    }
  }

  function getCellAtFrame(path, frameId) {
    var result = -1;
    if(path.cells[0].frameId > frameId)
      return result;
    else if(path.cells[path.cells.length-1] < frameId)
      return result;
    else {
      for (var i = 0; i < path.cells.length; i++) {
        if(path.cells[i].frameid == frameId) {
          result = path.cells[i].cellid;
          break;
        }
      }
      return result;
    }
  }

  function getPathsfromFilter(settings) {
      var result = [];
      jQuery.ajax({
        type: 'POST',
        url: '/experiments/path/filter/',
        data: {
          filter : settings
        },
        success: function(data) {
            result = data;
        },
        async: false
      }); 
      return result;
  }
}