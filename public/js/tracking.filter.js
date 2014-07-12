function getPathsfromFilter(filterSettings) {
  	var result = [];
  	jQuery.ajax({
     	type: 'POST',
     	url: '/path/filter/',
     	data: {settings : filterSettings},
     	success: function(data) {
        	result = data;
     	},
     	async: false
  	}); 
  	return result;
}