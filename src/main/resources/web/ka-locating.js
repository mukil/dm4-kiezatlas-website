
var locating = (function() {

    var api = {}

    api.get_browser_location = function(callback, error, options) {
        //
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(callback, error, options);
        } else {
            console.warn("Geolocation is not supported by your browser")
            callback(undefined)
        }
    }

    return api

}())
