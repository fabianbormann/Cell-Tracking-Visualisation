function TrackingFilter() {
  var filters = [];
  var self = this;

  this.add = function(settings) {
    filter = {};
    filter.color = "#FF00FF";
    filter.option = settings.option;
    filter.include = settings.include;
    filter.from = settings.from;
    filter.to = settings.to;
    filter.paths = getPathsfromFilter(settings);

    filters.push(filter);
  }

  this.get = function(index) {
    return filters[index];
  }

  this.getCells = function(frameId) {
    var cells = [];
    $.each(filters, function(filters_key, filter) {
      $.each(filter.paths, function(paths_key, path) {
        var cell_id = getCellAtFrame(path, frameId);
        if( cell_id != -1)
          cells.push([cell_id, filter.color]);
      });
    });
    return cells;
  }

  this.getAll = function() {
    return filters;
  }

  this.changeFilterColor = function(color, index) {
    filters[index].color = color;
    self.updateUi();
  } 

  this.remove = function(index) {
    filters.splice(index, 1);
  }

  this.removeAll = function() {
    filters = [];
  }

  this.updateUi = function() {
    if(filters.length > 0) {
      $('#filterArea').show();
      $("#filter").html("");
      $.each(filters, function(key, filter) {
        $('#filter').append("<div class=\"ui divider\"></div><div class=\"ui message\"><i class=\"circle first state icon\"></i><i class=\"remove secound state icon\"></i><input class=\"filterColor\"" +
         "data-index=\""+key+"\" type=\"color\" value=\""+filter.color+"\"><div class=\"filter_info\">"+filter.option+" between "+filter.from+" and "+filter.to+"</div></div>");
      });
      $('#filter').append("<script type=\"text/javascript\">function change(){$(\".filterColor\").change(function() {tracking.filter().changeFilterColor( $( this ).val(), $( this ).data(\"index\") ); tracking.redrawCells();})} change();</script>");
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
        url: '/path/filter/',
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