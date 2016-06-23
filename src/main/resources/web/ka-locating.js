
var locating = (function() {

    var api = {}

    api.get_browser_location = function(callback, error, options) {
        //
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(callback, error, options);
        } else {
            callback(undefined)
        }
    }

    return api

}())
