function require(script) {
    $.ajax({
        url: script,
        dataType: "script",
        async: false,
        error: function () {
            throw new Error("Could not load " + script);
        }
    });
}

require("../js/tracking.utils.js");
require("../js/tracking.filter.js");
require("../js/tracking.js");