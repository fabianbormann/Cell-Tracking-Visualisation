exports.render = function(req, res){
	console.log(req.body.code);
	res.send("ok");
};